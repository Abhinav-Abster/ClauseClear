import { NextRequest, NextResponse } from "next/server";
import { SimplifyInputSchema, SimplifyResponseSchema } from "@/lib/validation";
import { buildSimplifyPrompt } from "@/lib/prompts";
import { generateStructuredContent, DEFAULT_MODEL } from "@/lib/gemini";
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
      route: "/api/simplify",
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

  const parseResult = SimplifyInputSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    return NextResponse.json({ error: errorMsg, details: parseResult.error.issues }, { status: 400 });
  }

  const { document, language } = parseResult.data;
  const docHash = hashContent(document);
  const cacheKey = buildCacheKey("simplify", docHash, language);

  // 3. Cache Lookup
  const cachedResponse = getFromCache<unknown>(cacheKey);
  if (cachedResponse) {
    logSafeRequest({
      requestId,
      route: "/api/simplify",
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
    const { systemInstruction, userContent } = buildSimplifyPrompt(document, language);

    const result = await generateStructuredContent({
      systemInstruction,
      userContent,
      schema: SimplifyResponseSchema,
      model: DEFAULT_MODEL, // gemini-2.5-flash for speed and cost efficiency
    });

    // 5. Cache Result (15-min TTL)
    setInCache(cacheKey, result);

    logSafeRequest({
      requestId,
      route: "/api/simplify",
      docHash,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: false,
    });

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to simplify document";
    logSafeRequest({
      requestId,
      route: "/api/simplify",
      docHash,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage,
    });
    return NextResponse.json(
      { error: "An error occurred while simplifying the document. Please verify your document text and try again." },
      { status: 500 },
    );
  }
}
