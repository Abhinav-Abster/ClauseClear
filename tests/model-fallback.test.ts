/**
 * @jest-environment node
 */
import {
  generateStructuredContent,
  getFallbackChain,
  getGeminiClient,
  resetGeminiClient,
  DEFAULT_MODEL,
  REASONING_MODEL,
} from "@/lib/gemini";
import { z } from "zod";

// We need to mock the GoogleGenAI constructor and its models methods
const mockGenerateContent = jest.fn();
const mockModelsGet = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
      get: mockModelsGet,
    },
  })),
}));

const testSchema = z.object({
  result: z.string(),
});

describe("Model Fallback System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGeminiClient();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe("getFallbackChain", () => {
    it("returns DEFAULT_FALLBACK_CHAIN when given DEFAULT_MODEL", () => {
      const chain = getFallbackChain(DEFAULT_MODEL);
      expect(chain[0]).toBe(DEFAULT_MODEL);
      expect(chain.length).toBeGreaterThanOrEqual(2);
    });

    it("returns REASONING_FALLBACK_CHAIN when given REASONING_MODEL", () => {
      const chain = getFallbackChain(REASONING_MODEL);
      expect(chain[0]).toBe(REASONING_MODEL);
      expect(chain.length).toBeGreaterThanOrEqual(2);
    });

    it("builds custom chain for unknown model, prepending it to defaults", () => {
      const chain = getFallbackChain("gemini-custom-model");
      expect(chain[0]).toBe("gemini-custom-model");
      expect(chain.length).toBeGreaterThanOrEqual(2);
      // Should still contain default fallbacks after the custom one
      expect(chain.slice(1)).toContain("gemini-2.0-flash");
    });

    it("deduplicates when custom model matches a default chain entry", () => {
      const chain = getFallbackChain("gemini-2.0-flash");
      const occurrences = chain.filter((m) => m === "gemini-2.0-flash").length;
      expect(occurrences).toBe(1);
    });
  });

  describe("generateStructuredContent fallback behavior", () => {
    it("succeeds on primary model without checking fallback availability", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ result: "success" }),
      });

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "success" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      // models.get should NOT be called for the primary model (no latency overhead)
      expect(mockModelsGet).not.toHaveBeenCalled();
    });

    it("falls back to next model on 429 rate limit error", async () => {
      // Primary model fails with 429
      mockGenerateContent
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValueOnce({
          text: JSON.stringify({ result: "fallback success" }),
        });

      // Fallback model availability check passes
      mockModelsGet.mockResolvedValueOnce({});

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "fallback success" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(mockModelsGet).toHaveBeenCalledTimes(1);
    });

    it("falls back to next model on 503 service unavailable error", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("503 Service Unavailable"))
        .mockResolvedValueOnce({
          text: JSON.stringify({ result: "recovered" }),
        });

      mockModelsGet.mockResolvedValueOnce({});

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "recovered" });
    });

    it("falls back on RESOURCE_EXHAUSTED gRPC error", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("RESOURCE_EXHAUSTED: quota exceeded"))
        .mockResolvedValueOnce({
          text: JSON.stringify({ result: "recovered" }),
        });

      mockModelsGet.mockResolvedValueOnce({});

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "recovered" });
    });

    it("falls back on 'overloaded' error message", async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Model is currently overloaded"))
        .mockResolvedValueOnce({
          text: JSON.stringify({ result: "recovered" }),
        });

      mockModelsGet.mockResolvedValueOnce({});

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "recovered" });
    });

    it("skips fallback models that fail availability check", async () => {
      const chain = getFallbackChain(DEFAULT_MODEL);

      // Primary: overloaded
      mockGenerateContent
        .mockRejectedValueOnce(new Error("429 rate limit"))
        // Second fallback (first one skipped due to availability check)
        .mockResolvedValueOnce({
          text: JSON.stringify({ result: "third model" }),
        });

      // First fallback: availability check fails
      mockModelsGet
        .mockRejectedValueOnce(new Error("404"))
        // Second fallback: availability check passes
        .mockResolvedValueOnce({});

      const result = await generateStructuredContent({
        systemInstruction: "test",
        userContent: "test",
        schema: testSchema,
      });

      expect(result).toEqual({ result: "third model" });
      // models.get called for both fallback candidates
      expect(mockModelsGet).toHaveBeenCalledTimes(2);
      // generateContent: primary (failed) + last fallback (succeeded)
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("throws immediately on non-retriable errors (e.g. Zod validation failure)", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ wrongField: "bad data" }),
      });

      await expect(
        generateStructuredContent({
          systemInstruction: "test",
          userContent: "test",
          schema: testSchema,
        }),
      ).rejects.toThrow(); // Zod parse error — should NOT retry
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws immediately on non-retriable API errors (e.g. 400 Bad Request)", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("400 Bad Request: invalid content"));

      await expect(
        generateStructuredContent({
          systemInstruction: "test",
          userContent: "test",
          schema: testSchema,
        }),
      ).rejects.toThrow("400 Bad Request");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("throws chain-exhausted error when all models fail with retriable errors", async () => {
      const chain = getFallbackChain(DEFAULT_MODEL);

      // All models return 429
      for (let i = 0; i < chain.length; i++) {
        mockGenerateContent.mockRejectedValueOnce(new Error("429 Too Many Requests"));
      }
      // All fallback availability checks pass
      for (let i = 1; i < chain.length; i++) {
        mockModelsGet.mockResolvedValueOnce({});
      }

      await expect(
        generateStructuredContent({
          systemInstruction: "test",
          userContent: "test",
          schema: testSchema,
        }),
      ).rejects.toThrow("All models in the fallback chain exhausted");
    });

    it("does not retry on empty response text (non-retriable)", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "" });

      await expect(
        generateStructuredContent({
          systemInstruction: "test",
          userContent: "test",
          schema: testSchema,
        }),
      ).rejects.toThrow("Gemini returned an empty response text");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
