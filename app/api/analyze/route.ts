import { NextRequest, NextResponse } from "next/server";
import { AnalyzeInputSchema, AnalyzeResponseSchema } from "@/lib/validation";
import { buildAnalyzePrompt } from "@/lib/prompts";
import { generateStructuredContent, REASONING_MODEL } from "@/lib/gemini";
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

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const clientId = getClientIdentifier(req);

  // 1. Rate Limit Enforcement
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    logSafeRequest({
      requestId,
      route: "/api/analyze",
      statusCode: 429,
      durationMs: Date.now() - startTime,
      errorMessage: "Rate limit exceeded",
    });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before analyzing again." },
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

  const parseResult = AnalyzeInputSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    return NextResponse.json({ error: errorMsg, details: parseResult.error.issues }, { status: 400 });
  }

  const { document, language } = parseResult.data;
  const docHash = hashContent(document);
  const cacheKey = buildCacheKey("analyze", docHash, language);

  // 3. Cache Lookup
  const cachedResponse = getFromCache<unknown>(cacheKey);
  if (cachedResponse) {
    logSafeRequest({
      requestId,
      route: "/api/analyze",
      docHash,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: true,
    });
    return NextResponse.json(cachedResponse, {
      headers: { "X-Cache": "HIT" },
    });
  }

  // 4. Model Invocation
  try {
    const { systemInstruction, userContent } = buildAnalyzePrompt(document, language);

    // Architectural Justification:
    // We utilize REASONING_MODEL ('gemini-2.5-pro') specifically for Clause & Risk Analyzer
    // because complex legal contracts contain subtle traps (e.g. cross-indemnification,
    // buried liquidated damages, statutory waiver traps) where semantic accuracy and rigorous
    // risk detection far outweigh raw millisecond latency.
    const result = await generateStructuredContent({
      systemInstruction,
      userContent,
      schema: AnalyzeResponseSchema,
      model: REASONING_MODEL,
    });

    // 5. Cache Result
    setInCache(cacheKey, result);

    logSafeRequest({
      requestId,
      route: "/api/analyze",
      docHash,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: false,
    });

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to analyze document";
    logSafeRequest({
      requestId,
      route: "/api/analyze",
      docHash,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage,
    });
    return NextResponse.json(
      { error: "An error occurred while analyzing clauses and risks. Please try again." },
      { status: 500 },
    );
  }
}
