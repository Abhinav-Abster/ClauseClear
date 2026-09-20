import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Model choices per specification:
// gemini-2.5-flash is default for speed, high throughput, and cost-efficiency.
export const DEFAULT_MODEL = process.env.GEMINI_MODEL_DEFAULT || "gemini-2.5-flash";

// gemini-2.5-pro is reserved for Clause & Risk Analyzer where deep reasoning,
// nuanced edge-case detection, and contract liability analysis outweigh latency considerations.
export const REASONING_MODEL = process.env.GEMINI_MODEL_REASONING || "gemini-2.5-pro";

// Singleton Client Instance
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

export interface StructuredGenerationParams<T> {
  systemInstruction: string;
  userContent: string;
  schema: z.ZodSchema<T>;
  model?: string;
  temperature?: number;
}

/**
 * Invokes Gemini with strict system instructions, receives structured JSON,
 * and validates the response against the provided Zod schema using schema.parse().
 *
 * System instructions and user content are passed in separated fields (never concatenated),
 * fulfilling the prompt-injection defense requirements.
 */
export async function generateStructuredContent<T>({
  systemInstruction,
  userContent,
  schema,
  model = DEFAULT_MODEL,
  temperature = 0.2, // Low temperature for high precision and groundedness
}: StructuredGenerationParams<T>): Promise<T> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model,
    contents: userContent,
    config: {
      systemInstruction,
      temperature,
      responseMimeType: "application/json",
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
    throw new Error(`Failed to parse Gemini output as JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Strictly parse and validate via Zod
  const validated = schema.parse(jsonParsed);
  return validated;
}

/**
 * Resets the client instance (useful for testing and mocking)
 */
export function resetGeminiClient(): void {
  aiClientInstance = null;
}
