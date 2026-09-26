/**
 * @jest-environment node
 */
import {
  ensureDocumentEmbedded,
  retrieveRelevantChunks,
  clearEmbeddedDocStore,
  cosineSimilarity,
} from "@/lib/embeddings";
import { PROCESSING_VERSION } from "@/lib/document-processor";

// Mock the Gemini client to avoid real API calls
const mockEmbedContent = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  getGeminiClient: () => ({
    models: {
      embedContent: mockEmbedContent,
      generateContent: mockGenerateContent,
    },
  }),
}));

/**
 * Helper to create a mock embedding response.
 * Returns a deterministic pseudo-embedding based on the text hash for reproducibility.
 */
function mockEmbeddingResponse(dimension = 768): { embeddings: [{ values: number[] }] } {
  const values = Array.from({ length: dimension }, (_, i) => Math.sin(i * 0.1));
  return { embeddings: [{ values }] };
}

/**
 * Creates a mock embedding that is "similar" to a target by shifting its values slightly.
 */
function createSimilarEmbedding(
  base: number[],
  similarity: number,
): { embeddings: [{ values: number[] }] } {
  const noise = 1 - similarity;
  const values = base.map((v, i) => v + noise * Math.cos(i * 0.3));
  return { embeddings: [{ values }] };
}

describe("Embeddings Module", () => {
  beforeEach(() => {
    clearEmbeddedDocStore();
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  const sampleDocument = `1. PARTIES AND PREMISES
This Agreement is entered into between Oakridge Properties LLC and Jane Doe for the property at 742 Evergreen Terrace.

2. RENT AND PAYMENT
Tenant agrees to pay rent of $2,200.00 per month, due on the first day of each calendar month.

3. SECURITY DEPOSIT
Tenant shall deposit $2,200.00 as a Security Deposit held in an interest-bearing escrow account.

4. MAINTENANCE AND REPAIRS
Tenant shall keep the premises clean and notify landlord of defects within a reasonable time.

5. TERMINATION
Either party may terminate with sixty days written notice. Early termination requires payment of one month rent.

6. GOVERNING LAW
This Lease shall be governed by the laws of the State of Illinois.`;

  describe("ensureDocumentEmbedded", () => {
    it("chunks the document and generates embeddings", async () => {
      mockEmbedContent.mockResolvedValue(mockEmbeddingResponse());

      const result = await ensureDocumentEmbedded(sampleDocument, "doc-hash-1");

      expect(result.processedDoc.documentId).toBe("doc-hash-1");
      expect(result.processedDoc.processingVersion).toBe(PROCESSING_VERSION);
      expect(result.processedDoc.chunks.length).toBeGreaterThan(1);
      expect(result.chunkEmbeddings.length).toBe(result.processedDoc.chunks.length);

      // Each chunk should have been embedded
      expect(mockEmbedContent).toHaveBeenCalledTimes(result.processedDoc.chunks.length);
    });

    it("caches results — second call does not re-embed", async () => {
      mockEmbedContent.mockResolvedValue(mockEmbeddingResponse());

      const result1 = await ensureDocumentEmbedded(sampleDocument, "doc-hash-2");
      const callCount = mockEmbedContent.mock.calls.length;

      const result2 = await ensureDocumentEmbedded(sampleDocument, "doc-hash-2");

      // Should be exact same reference (cached)
      expect(result2).toBe(result1);
      // No additional embedding calls
      expect(mockEmbedContent).toHaveBeenCalledTimes(callCount);
    });

    it("different document hashes are stored independently", async () => {
      mockEmbedContent.mockResolvedValue(mockEmbeddingResponse());

      const result1 = await ensureDocumentEmbedded(sampleDocument, "hash-A");
      const result2 = await ensureDocumentEmbedded(sampleDocument, "hash-B");

      expect(result1).not.toBe(result2);
      expect(result1.processedDoc.documentId).toBe("hash-A");
      expect(result2.processedDoc.documentId).toBe("hash-B");
    });
  });

  describe("retrieveRelevantChunks", () => {
    it("returns all chunks when document has fewer chunks than topK", async () => {
      // Short doc with only 2-3 sections
      const shortDoc = `1. PARTIES
Agreement between A and B regarding property.

2. RENT
Monthly rent is $1,000 due on the first of each month.`;

      mockEmbedContent.mockResolvedValue(mockEmbeddingResponse());

      await ensureDocumentEmbedded(shortDoc, "short-hash");
      const chunks = await retrieveRelevantChunks("What is the rent?", "short-hash", 10);

      // Should return all chunks since topK > chunk count
      const embedded = await ensureDocumentEmbedded(shortDoc, "short-hash");
      expect(chunks.length).toBe(embedded.processedDoc.chunks.length);
    });

    it("throws if document was not previously embedded", async () => {
      await expect(
        retrieveRelevantChunks("question", "nonexistent-hash"),
      ).rejects.toThrow("not found in embedding store");
    });

    it("returns topK chunks when document has more chunks", async () => {
      // Set up embeddings: make the "rent" chunk most similar to the query
      const baseEmbedding = Array.from({ length: 768 }, (_, i) => Math.sin(i * 0.1));
      let callIndex = 0;

      mockEmbedContent.mockImplementation(() => {
        callIndex++;
        // Make varied embeddings for different chunks
        const shifted = baseEmbedding.map((v, i) => v + callIndex * 0.1 * Math.cos(i));
        return Promise.resolve({ embeddings: [{ values: shifted }] });
      });

      await ensureDocumentEmbedded(sampleDocument, "topk-hash");

      const topK = 3;
      const chunks = await retrieveRelevantChunks("What is the rent amount?", "topk-hash", topK);

      expect(chunks.length).toBe(topK);

      // Each returned chunk should be a valid DocumentChunk
      for (const chunk of chunks) {
        expect(chunk).toHaveProperty("chunkId");
        expect(chunk).toHaveProperty("section");
        expect(chunk).toHaveProperty("text");
        expect(chunk).toHaveProperty("startOffset");
        expect(chunk).toHaveProperty("endOffset");
      }
    });
  });

  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      const v = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it("returns 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it("returns -1 for opposite vectors", () => {
      const a = [1, 2, 3];
      const b = [-1, -2, -3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it("handles zero vectors gracefully", () => {
      const zero = [0, 0, 0];
      const v = [1, 2, 3];
      expect(cosineSimilarity(zero, v)).toBe(0);
    });
  });

  describe("clearEmbeddedDocStore", () => {
    it("removes all cached embedded documents", async () => {
      mockEmbedContent.mockResolvedValue(mockEmbeddingResponse());

      await ensureDocumentEmbedded("1. Test\nContent here is sufficient.", "clear-test");
      clearEmbeddedDocStore();

      await expect(
        retrieveRelevantChunks("test", "clear-test"),
      ).rejects.toThrow("not found");
    });
  });
});
