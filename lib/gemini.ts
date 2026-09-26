import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const DEFAULT_MODEL = process.env.GEMINI_MODEL_DEFAULT || "gemini-2.5-flash";
export const REASONING_MODEL = process.env.GEMINI_MODEL_REASONING || "gemini-3.1-pro-preview";

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
  responseSchema?: object; // Gemini-native schema for config.responseSchema
  model?: string;
  temperature?: number;
}

/**
 * Invokes Gemini with strict system instructions, receives structured JSON,
 * and validates the response against the provided Zod schema using schema.parse().
 *
 * System instructions and user content are passed in separated fields (never concatenated),
 * fulfilling prompt-injection defense requirements.
 */
export async function generateStructuredContent<T>({
  systemInstruction,
  userContent,
  schema,
  responseSchema,
  model = DEFAULT_MODEL,
  temperature = 0.2,
}: StructuredGenerationParams<T>): Promise<T> {
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model,
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

  return schema.parse(jsonParsed);
}

/**
 * Resets the client instance (useful for testing and mocking)
 */
export function resetGeminiClient(): void {
  aiClientInstance = null;
}

