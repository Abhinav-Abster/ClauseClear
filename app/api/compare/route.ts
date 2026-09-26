import { NextRequest, NextResponse } from "next/server";
import { CompareInputSchema, CompareResponseSchema } from "@/lib/validation";
import { COMPARE_RESPONSE_SCHEMA } from "@/lib/gemini-schemas";
import { buildComparePrompt, buildStructuralComparePrompt } from "@/lib/prompts";
import { generateStructuredContent, DEFAULT_MODEL } from "@/lib/gemini";
import { computeStructuralDiff, StructuralDiffResult } from "@/lib/document-processor";
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

const COMPARE_THRESHOLD_CHARS = 6000;

function formatStructuralDiffForPrompt(
  diff: StructuralDiffResult,
  labelA: string,
  labelB: string,
): string {
  const parts: string[] = [];

  if (diff.identicalSections.length > 0) {
    parts.push(
      `### IDENTICAL PROVISIONS (Confirmed verbatim matches — no substantive difference):\n` +
        diff.identicalSections.map((s) => `- ${s.heading}`).join("\n"),
    );
  }

  if (diff.modifiedSections.length > 0) {
    parts.push(`### MODIFIED PROVISIONS (Present in both, but terms differ):`);
    for (const mod of diff.modifiedSections) {
      let modText = `#### Topic / Section: ${mod.heading}\n`;
      if (mod.detectedDiffs.length > 0) {
        modText += `Detected Key Differences: ${mod.detectedDiffs.join("; ")}\n`;
      }
      modText += `[${labelA} Text]:\n${mod.textA}\n\n[${labelB} Text]:\n${mod.textB}\n`;
      parts.push(modText);
    }
  }

  if (diff.uniqueToA.length > 0) {
    parts.push(`### CLAUSES UNIQUE TO ${labelA.toUpperCase()} (Not present in ${labelB}):`);
    for (const u of diff.uniqueToA) {
      parts.push(`- Section: ${u.heading}\nText: ${u.text}\n`);
    }
  }

  if (diff.uniqueToB.length > 0) {
    parts.push(`### CLAUSES UNIQUE TO ${labelB.toUpperCase()} (Not present in ${labelA}):`);
    for (const u of diff.uniqueToB) {
      parts.push(`- Section: ${u.heading}\nText: ${u.text}\n`);
    }
  }

  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const clientId = getClientIdentifier(req);

  // 1. Rate Limit Enforcement
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    logSafeRequest({
      requestId,
      route: "/api/compare",
      statusCode: 429,
      durationMs: Date.now() - startTime,
      errorMessage: "Rate limit exceeded",
    });
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before comparing documents again." },
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

  const parseResult = CompareInputSchema.safeParse(body);
  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || "Validation failed";
    return NextResponse.json({ error: errorMsg, details: parseResult.error.issues }, { status: 400 });
  }

  const { documentA, documentB, labelA, labelB, language } = parseResult.data;
  const hashA = hashContent(documentA);
  const hashB = hashContent(documentB);
  const cacheKey = buildCacheKey("compare", hashA, hashB, language);

  // 3. Cache Lookup
  const cachedResponse = getFromCache<unknown>(cacheKey);
  if (cachedResponse) {
    logSafeRequest({
      requestId,
      route: "/api/compare",
      docHash: `${hashA.substring(0, 8)}_${hashB.substring(0, 8)}`,
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

    if (documentA.length + documentB.length < COMPARE_THRESHOLD_CHARS) {
      // Small document comparison: standard direct prompt
      const { systemInstruction, userContent } = buildComparePrompt(
        documentA,
        documentB,
        labelA,
        labelB,
        language,
      );

      result = await generateStructuredContent({
        systemInstruction,
        userContent,
        schema: CompareResponseSchema,
        responseSchema: COMPARE_RESPONSE_SCHEMA,
        model: DEFAULT_MODEL,
      });
    } else {
      // Large document comparison (Phase 6):
      // Step 1: Deterministic structural diff
      const structuralDiff = computeStructuralDiff(documentA, documentB);
      const diffSummaryText = formatStructuralDiffForPrompt(structuralDiff, labelA, labelB);

      // Step 2: Semantic interpretation on only the differing / unique clauses
      const { systemInstruction, userContent } = buildStructuralComparePrompt(
        labelA,
        labelB,
        diffSummaryText,
        language,
      );

      result = await generateStructuredContent({
        systemInstruction,
        userContent,
        schema: CompareResponseSchema,
        responseSchema: COMPARE_RESPONSE_SCHEMA,
        model: DEFAULT_MODEL,
      });
    }

    // 5. Cache Result
    setInCache(cacheKey, result);

    logSafeRequest({
      requestId,
      route: "/api/compare",
      docHash: `${hashA.substring(0, 8)}_${hashB.substring(0, 8)}`,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      cached: false,
    });

    return NextResponse.json(result, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to compare documents";
    logSafeRequest({
      requestId,
      route: "/api/compare",
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage,
    });
    return NextResponse.json(
      { error: "An error occurred while comparing the documents. Please verify both texts and try again." },
      { status: 500 },
    );
  }
}
