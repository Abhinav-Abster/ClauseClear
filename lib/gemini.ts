import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// ==========================================
// Model Fallback Configuration
// ==========================================

/**
 * Ordered fallback chains — first model is preferred, subsequent ones are
 * tried when the preceding model fails due to overload / rate-limit / unavailability.
 *
 * DEFAULT_FALLBACK_CHAIN: fast-tier models for most endpoints.
 * REASONING_FALLBACK_CHAIN: higher-capability models for deep analysis (Clause & Risk).
 *
 * Override the primary model via env vars; the chain always appends lower tiers.
 */
const DEFAULT_FALLBACK_CHAIN: readonly string[] = [
  process.env.GEMINI_MODEL_DEFAULT || "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

const REASONING_FALLBACK_CHAIN: readonly string[] = [
  process.env.GEMINI_MODEL_REASONING || "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/** Convenience exports so route files can still reference a "primary" model name. */
export const DEFAULT_MODEL = DEFAULT_FALLBACK_CHAIN[0];
export const REASONING_MODEL = REASONING_FALLBACK_CHAIN[0];

/**
 * Returns the fallback chain for the given primary model.
 * If the model matches the head of REASONING_FALLBACK_CHAIN, use that chain;
 * otherwise return DEFAULT_FALLBACK_CHAIN.
 * Any explicit model that isn't the head of either chain gets its own
 * mini-chain: [explicit, ...DEFAULT_FALLBACK_CHAIN].
 */
export function getFallbackChain(model: string): readonly string[] {
  if (model === REASONING_FALLBACK_CHAIN[0]) return REASONING_FALLBACK_CHAIN;
  if (model === DEFAULT_FALLBACK_CHAIN[0]) return DEFAULT_FALLBACK_CHAIN;
  // Deduplicate: if the caller passed a custom model, prepend it
  return [model, ...DEFAULT_FALLBACK_CHAIN.filter((m) => m !== model)];
}

// ==========================================
// Singleton Client Instance
// ==========================================
let aiClientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (aiClientInstance) {
    return aiClientInstance;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is missing. Please configure it in your environment or .env.local file.",
    );
  }

  aiClientInstance = new GoogleGenAI({ apiKey });
  return aiClientInstance;
}

// ==========================================
// Proactive Model Availability Check
// ==========================================

/**
 * Lightweight probe: calls `models.get()` to verify a model exists and is
 * reachable before sending a full generation request. Returns `true` if the
 * model responds, `false` on any error (404, 503, network, etc.).
 */
async function isModelAvailable(client: GoogleGenAI, model: string): Promise<boolean> {
  try {
    await client.models.get({ model });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// Error Classification
// ==========================================

/** HTTP / SDK error codes that indicate the model is overloaded or unavailable. */
const RETRIABLE_ERROR_PATTERNS = [
  "429",           // Rate limited / quota exceeded
  "503",           // Service unavailable
  "overloaded",    // Model overloaded message
  "resource_exhausted", // gRPC status
  "unavailable",   // gRPC / HTTP unavailable
  "capacity",      // Capacity-related rejections
  "RESOURCE_EXHAUSTED",
  "too many requests",
] as const;

/**
 * Returns true if the error indicates the model is temporarily overloaded
 * and we should try the next model in the fallback chain.
 */
function isRetriableModelError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return RETRIABLE_ERROR_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()));
}

// ==========================================
// Structured Generation with Fallback
// ==========================================

export interface StructuredGenerationParams<T> {
  systemInstruction: string;
  userContent: string;
  schema: z.ZodSchema<T>;
  responseSchema?: object; // Gemini-native schema for config.responseSchema
  model?: string;
  temperature?: number;
}

/**
 * Invokes Gemini with strict system instructions, receives structured JSON,
 * and validates the response against the provided Zod schema using schema.parse().
 *
 * **Automatic fallback**: if the primary model returns a retriable error
 * (429 / 503 / overloaded), the function walks the fallback chain and
 * proactively checks each candidate with `models.get()` before attempting
 * generation, skipping models that are unreachable.
 *
 * System instructions and user content are passed in separated fields (never concatenated),
 * fulfilling the prompt-injection defense requirements.
 */
export async function generateStructuredContent<T>({
  systemInstruction,
  userContent,
  schema,
  responseSchema,
  model = DEFAULT_MODEL,
  temperature = 0.2, // Low temperature for high precision and groundedness
}: StructuredGenerationParams<T>): Promise<T> {
  const client = getGeminiClient();
  const chain = getFallbackChain(model);

  let lastError: unknown;

  for (const candidateModel of chain) {
    try {
      // Proactive availability check (skip models that are down)
      // Only check non-primary models to avoid adding latency to the happy path
      if (candidateModel !== chain[0]) {
        const available = await isModelAvailable(client, candidateModel);
        if (!available) {
          // eslint-disable-next-line no-console
          console.warn(`[MODEL_FALLBACK] Skipping ${candidateModel} — failed availability check`);
          continue;
        }
      }

      const response = await client.models.generateContent({
        model: candidateModel,
        contents: userContent,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {}),
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error("Gemini returned an empty response text.");
      }

      let jsonParsed: unknown;
      try {
        jsonParsed = JSON.parse(rawText);
      } catch (err) {
        throw new Error(
          `Failed to parse Gemini output as JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Strictly parse and validate via Zod
      const validated = schema.parse(jsonParsed);

      // Log which model was ultimately used (only if we fell back)
      if (candidateModel !== chain[0]) {
        // eslint-disable-next-line no-console
        console.info(
          `[MODEL_FALLBACK] Successfully used fallback model ${candidateModel} (primary: ${chain[0]})`,
        );
      }

      return validated;
    } catch (err) {
      lastError = err;

      if (isRetriableModelError(err)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[MODEL_FALLBACK] ${candidateModel} is overloaded/unavailable: ${err instanceof Error ? err.message : String(err)}. Trying next model...`,
        );
        continue; // Try the next model in the chain
      }

      // Non-retriable error (bad input, schema validation, etc.) — throw immediately
      throw err;
    }
  }

  // All models in the chain failed with retriable errors
  throw new Error(
    `All models in the fallback chain exhausted [${chain.join(" → ")}]. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

/**
 * Resets the client instance (useful for testing and mocking)
 */
export function resetGeminiClient(): void {
  aiClientInstance = null;
}

