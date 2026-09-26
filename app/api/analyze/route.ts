import { NextRequest, NextResponse } from "next/server";
import { AnalyzeInputSchema, AnalyzeResponseSchema, RefineRiskResponseSchema } from "@/lib/validation";
import { ANALYZE_RESPONSE_SCHEMA, REFINE_RISK_SCHEMA } from "@/lib/gemini-schemas";
import { buildAnalyzePrompt, buildRefineRiskPrompt } from "@/lib/prompts";
import { generateStructuredContent, DEFAULT_MODEL, REASONING_MODEL } from "@/lib/gemini";
import { extractCandidateClauses } from "@/lib/document-processor";
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

/** Threshold (characters) above which candidate clause extraction + multi-stage pipeline is used */
const ANALYZE_THRESHOLD_CHARS = 4000;

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
    let result;

    if (document.length < ANALYZE_THRESHOLD_CHARS) {
      // Small document path: direct reasoning model invocation
      const { systemInstruction, userContent } = buildAnalyzePrompt(document, language);
      result = await generateStructuredContent({
        systemInstruction,
        userContent,
        schema: AnalyzeResponseSchema,
        responseSchema: ANALYZE_RESPONSE_SCHEMA,
        model: REASONING_MODEL,
      });
    } else {
      // Large document path (Phase 4):
      // Stage 1: Candidate clause extraction via local preprocessing
      const { candidateText } = extractCandidateClauses(document);

      // Stage 2: Fast model for initial structured extraction
      const { systemInstruction: fastSystem, userContent: fastUser } = buildAnalyzePrompt(
        candidateText,
        language,
      );

      result = await generateStructuredContent({
        systemInstruction: fastSystem,
        userContent: fastUser,
        schema: AnalyzeResponseSchema,
        responseSchema: ANALYZE_RESPONSE_SCHEMA,
        model: DEFAULT_MODEL,
      });

      // Stage 3: Selective reasoning model for high-severity or unusual risks
      const highRiskClauses = result.clauses.filter(
        (c) => c.severity === "high" || c.type === "unusual_term",
      );

      if (highRiskClauses.length > 0 || result.overallRiskLevel === "high") {
        try {
          const { systemInstruction: refineSystem, userContent: refineUser } = buildRefineRiskPrompt(
            JSON.stringify(highRiskClauses, null, 2),
            candidateText.slice(0, 8000),
            language,
          );

          const refined = await generateStructuredContent({
            systemInstruction: refineSystem,
            userContent: refineUser,
            schema: RefineRiskResponseSchema,
            responseSchema: REFINE_RISK_SCHEMA,
            model: REASONING_MODEL,
          });

          if (refined.refinedClauses && refined.refinedClauses.length > 0) {
            const refinedMap = new Map(
              refined.refinedClauses.map((rc) => [rc.title.toLowerCase(), rc]),
            );
            result = {
              ...result,
              executiveSummary: refined.refinedExecutiveSummary || result.executiveSummary,
              clauses: result.clauses.map((c) => refinedMap.get(c.title.toLowerCase()) || c),
            };
          }
        } catch {
          // Gracefully retain Stage 2 result if selective refinement encounters errors
        }
      }
    }

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
