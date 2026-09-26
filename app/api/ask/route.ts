import { NextRequest, NextResponse } from "next/server";
import { AskInputSchema, AskResponseSchema } from "@/lib/validation";
import { ASK_RESPONSE_SCHEMA } from "@/lib/gemini-schemas";
import { buildAskPrompt, buildRagAskPrompt } from "@/lib/prompts";
import { generateStructuredContent, DEFAULT_MODEL } from "@/lib/gemini";
import { ensureDocumentEmbedded, retrieveRelevantChunks } from "@/lib/embeddings";
import {
  checkRateLimit,
  getClientIdentifier,
  hashContent,
  buildCacheKey,
  getFromCache,
  setInCache,
  logSafeRequest,
} from "@/lib/api-guard";
import crypto from "crypto";

/**
 * Documents below this character threshold use the original full-document
 * approach. RAG overhead (chunking + embedding + retrieval) isn't worthwhile
 * for documents that already fit comfortably in the context window.
 */
const RAG_THRESHOLD_CHARS = 4000;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const clientId = getClientIdentifier(req);

  // 1. Rate Limit Enforcement
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    logSafeRequest({
      requestId,
      route: "/api/ask",
      statusCode: 429,
      durationMs: Date.now() - startTime,
      errorMessage: "Rate limit exceeded",
    });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before asking another question." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rateLimit.resetInMs / 1000).toString() },
      },
    );
  }

  // 2. Body & Size Validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parseResult = AskInputSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    return NextResponse.json({ error: errorMsg, details: parseResult.error.issues }, { status: 400 });
  }

  const { document, question, history, language } = parseResult.data;
  const docHash = hashContent(document);
  const qHash = hashContent(question);
  const historyHash = hashContent(JSON.stringify(history));
  const cacheKey = buildCacheKey("ask", docHash, qHash, historyHash, language);

  // 3. Cache Lookup
  const cachedResponse = getFromCache<unknown>(cacheKey);
  if (cachedResponse) {
    logSafeRequest({
      requestId,
      route: "/api/ask",
      docHash,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: true,
    });
    return NextResponse.json(cachedResponse, {
      headers: { "X-Cache": "HIT" },
    });
  }

  // 4. Model Invocation — RAG for large documents, full-doc for small ones
  try {
    let systemInstruction: string;
    let userContent: string;

    if (document.length >= RAG_THRESHOLD_CHARS) {
      // RAG path: chunk → embed → retrieve relevant chunks → Gemini
      await ensureDocumentEmbedded(document, docHash);
      const relevantChunks = await retrieveRelevantChunks(question, docHash);
      const prompt = buildRagAskPrompt(relevantChunks, question, history, language);
      systemInstruction = prompt.systemInstruction;
      userContent = prompt.userContent;
    } else {
      // Small document: full-document approach (original behavior)
      const prompt = buildAskPrompt(document, question, history, language);
      systemInstruction = prompt.systemInstruction;
      userContent = prompt.userContent;
    }

    const result = await generateStructuredContent({
      systemInstruction,
      userContent,
      schema: AskResponseSchema,
      responseSchema: ASK_RESPONSE_SCHEMA,
      model: DEFAULT_MODEL,
    });

    // 5. Cache Result
    setInCache(cacheKey, result);

    logSafeRequest({
      requestId,
      route: "/api/ask",
      docHash,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: false,
    });

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to answer question";
    logSafeRequest({
      requestId,
      route: "/api/ask",
      docHash,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage,
    });
    return NextResponse.json(
      { error: "An error occurred while answering your question. Please try rephrasing." },
      { status: 500 },
    );
  }
}
