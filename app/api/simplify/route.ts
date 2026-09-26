import { NextRequest, NextResponse } from "next/server";
import {
  SimplifyInputSchema,
  SimplifyResponseSchema,
  SectionSimplifyResponseSchema,
  SynthesisSimplifyResponseSchema,
} from "@/lib/validation";
import {
  SIMPLIFY_RESPONSE_SCHEMA,
  SECTION_SIMPLIFY_SCHEMA,
  SYNTHESIS_SIMPLIFY_SCHEMA,
} from "@/lib/gemini-schemas";
import {
  buildSimplifyPrompt,
  buildSectionSimplifyPrompt,
  buildSynthesizeSimplifyPrompt,
} from "@/lib/prompts";
import { generateStructuredContent, DEFAULT_MODEL } from "@/lib/gemini";
import { splitIntoSections, mapConcurrent, RawSection } from "@/lib/document-processor";
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

const SIMPLIFY_THRESHOLD_CHARS = 4000;
const CONCURRENCY_LIMIT = 3;

function groupSectionsForProcessing(
  sections: RawSection[],
): Array<{ heading: string; text: string; originalSnippet: string }> {
  const groups: Array<{ heading: string; text: string; originalSnippet: string }> = [];
  let currentHeading = "";
  let currentTexts: string[] = [];
  let currentLen = 0;

  for (const sec of sections) {
    if (currentTexts.length === 0) {
      currentHeading = sec.heading;
      currentTexts.push(sec.text);
      currentLen = sec.text.length;
    } else if (currentLen + sec.text.length < 2500) {
      currentTexts.push(`\n\n=== ${sec.heading} ===\n${sec.text}`);
      currentLen += sec.text.length;
    } else {
      const fullText = currentTexts.join("\n\n");
      groups.push({
        heading: currentHeading,
        text: fullText,
        originalSnippet: fullText.slice(0, 150) + (fullText.length > 150 ? "..." : ""),
      });
      currentHeading = sec.heading;
      currentTexts = [sec.text];
      currentLen = sec.text.length;
    }
  }

  if (currentTexts.length > 0) {
    const fullText = currentTexts.join("\n\n");
    groups.push({
      heading: currentHeading,
      text: fullText,
      originalSnippet: fullText.slice(0, 150) + (fullText.length > 150 ? "..." : ""),
    });
  }

  return groups;
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
    let result;

    if (document.length < SIMPLIFY_THRESHOLD_CHARS) {
      // Small document path: single direct call
      const { systemInstruction, userContent } = buildSimplifyPrompt(document, language);
      result = await generateStructuredContent({
        systemInstruction,
        userContent,
        schema: SimplifyResponseSchema,
        responseSchema: SIMPLIFY_RESPONSE_SCHEMA,
        model: DEFAULT_MODEL,
      });
    } else {
      // Large document path (Phase 5 Map/Reduce):
      // Step 1: Split into sections and group into balanced chunks
      const sections = splitIntoSections(document);
      const sectionGroups = groupSectionsForProcessing(sections);

      // Step 2: Map over sections with bounded concurrency
      const sectionResults = await mapConcurrent(
        sectionGroups,
        CONCURRENCY_LIMIT,
        async (group) => {
          const { systemInstruction, userContent } = buildSectionSimplifyPrompt(
            group.heading,
            group.text,
            language,
          );
          const secRes = await generateStructuredContent({
            systemInstruction,
            userContent,
            schema: SectionSimplifyResponseSchema,
            responseSchema: SECTION_SIMPLIFY_SCHEMA,
            model: DEFAULT_MODEL,
          });
          return {
            heading: secRes.heading || group.heading,
            originalSnippet: group.originalSnippet,
            plainLanguageSummary: secRes.plainLanguageSummary,
            keyTakeaway: secRes.keyTakeaway,
            glossary: secRes.glossary || [],
          };
        },
      );

      // Step 3: Synthesis of full document summary and type
      const accumulatedGlossary = sectionResults.flatMap((s) => s.glossary);
      const sectionSummariesForSynthesis = sectionResults.map((s) => ({
        heading: s.heading,
        plainLanguageSummary: s.plainLanguageSummary,
        keyTakeaway: s.keyTakeaway,
      }));

      const { systemInstruction: synthSystem, userContent: synthUser } =
        buildSynthesizeSimplifyPrompt(
          JSON.stringify(sectionSummariesForSynthesis, null, 2),
          JSON.stringify(accumulatedGlossary.slice(0, 30), null, 2),
          language,
        );

      const synthesis = await generateStructuredContent({
        systemInstruction: synthSystem,
        userContent: synthUser,
        schema: SynthesisSimplifyResponseSchema,
        responseSchema: SYNTHESIS_SIMPLIFY_SCHEMA,
        model: DEFAULT_MODEL,
      });

      // Deduplicate glossary entries
      const termMap = new Map<string, { term: string; definition: string; contextInDoc: string }>();
      for (const item of [...synthesis.glossary, ...accumulatedGlossary]) {
        const normTerm = item.term.toLowerCase().trim();
        if (!termMap.has(normTerm)) {
          termMap.set(normTerm, item);
        }
      }

      result = {
        summary: synthesis.summary,
        documentType: synthesis.documentType,
        sections: sectionResults.map((s) => ({
          heading: s.heading,
          originalSnippet: s.originalSnippet,
          plainLanguageSummary: s.plainLanguageSummary,
          keyTakeaway: s.keyTakeaway,
        })),
        glossary: Array.from(termMap.values()),
      };
    }

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
