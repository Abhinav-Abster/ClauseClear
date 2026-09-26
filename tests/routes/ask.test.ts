/**
 * @jest-environment node
 */
import { POST } from "@/app/api/ask/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import * as embeddings from "@/lib/embeddings";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

jest.mock("@/lib/embeddings", () => ({
  ensureDocumentEmbedded: jest.fn(),
  retrieveRelevantChunks: jest.fn(),
  clearEmbeddedDocStore: jest.fn(),
  getProcessedDocument: jest.fn(),
}));

describe("POST /api/ask", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  // Small doc (below RAG_THRESHOLD_CHARS=4000) → uses original full-document path
  const validDoc = `
RESIDENTIAL LEASE AGREEMENT
Oakridge Properties LLC leases to Jane Doe.
Rent is $2,200/month with a $2,200 security deposit held in an interest-bearing escrow account.
Pets: One domestic dog under 35 lbs permitted with a $300 refundable deposit.
`;

  it("answers strictly from document content with relevant quotes", async () => {
    const mockOutput = {
      isCoveredInDocument: true,
      answer: "The security deposit is $2,200.00 and must be held in an interest-bearing escrow account.",
      relevantQuotes: ["with a $2,200 security deposit held in an interest-bearing escrow account."],
      suggestedFollowUps: ["When must the landlord return the deposit?"],
      informationalDisclaimer: "This response provides factual information and does not constitute legal advice.",
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "How much is the security deposit?",
        history: [{ role: "user", content: "Can you help me understand this lease?" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.isCoveredInDocument).toBe(true);
    expect(data.answer).toContain("$2,200");
    expect(data.relevantQuotes).toHaveLength(1);
  });

  it("explicitly refuses to answer when information is not covered in the document", async () => {
    const mockUngrounded = {
      isCoveredInDocument: false,
      answer:
        "This document does not contain information regarding assigned parking spaces or visitor parking rules. I can only answer questions about the specific text provided in this agreement.",
      relevantQuotes: [],
      suggestedFollowUps: ["Does the agreement mention access or premises boundaries?"],
      informationalDisclaimer: "This response provides factual information and does not constitute legal advice.",
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockUngrounded);

    const req = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "Is there a designated garage parking spot included?",
        history: [],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.isCoveredInDocument).toBe(false);
    expect(data.answer).toContain("does not contain information regarding");
    expect(data.relevantQuotes).toEqual([]);
  });

  it("rejects invalid input questions", async () => {
    const req = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "Hi", // too short (min 3 chars)
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("at least 3 characters");
  });

  it("includes conversation history in cache key calculation to prevent serving mismatched context", async () => {
    const mockOutput1 = {
      isCoveredInDocument: true,
      answer: "Response for context 1",
      relevantQuotes: ["with a $2,200 security deposit held in an interest-bearing escrow account."],
      suggestedFollowUps: [],
      informationalDisclaimer: "Disclaimer",
    };
    const mockOutput2 = {
      isCoveredInDocument: true,
      answer: "Response for context 2",
      relevantQuotes: ["with a $2,200 security deposit held in an interest-bearing escrow account."],
      suggestedFollowUps: [],
      informationalDisclaimer: "Disclaimer",
    };

    (gemini.generateStructuredContent as jest.Mock)
      .mockResolvedValueOnce(mockOutput1)
      .mockResolvedValueOnce(mockOutput2);

    const req1 = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "What about the deposit?",
        history: [{ role: "user", content: "Context A" }],
      }),
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.answer).toBe("Response for context 1");
    expect(res1.headers.get("X-Cache")).toBe("MISS");

    // Second request with SAME question and document, but DIFFERENT history
    const req2 = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "What about the deposit?",
        history: [{ role: "user", content: "Context B" }],
      }),
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.answer).toBe("Response for context 2");
    expect(res2.headers.get("X-Cache")).toBe("MISS");
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(2);

    // Third request with IDENTICAL question, document, and history as req1 should hit cache
    const req3 = new NextRequest("http://localhost:3000/api/ask", {
      method: "POST",
      body: JSON.stringify({
        document: validDoc,
        question: "What about the deposit?",
        history: [{ role: "user", content: "Context A" }],
      }),
    });

    const res3 = await POST(req3);
    expect(res3.status).toBe(200);
    const data3 = await res3.json();
    expect(data3.answer).toBe("Response for context 1");
    expect(res3.headers.get("X-Cache")).toBe("HIT");
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(2);
  });

  describe("RAG path for large documents", () => {
    // Large doc (above RAG_THRESHOLD_CHARS=4000) → triggers RAG pipeline
    const largeSections = Array.from({ length: 12 }, (_, i) =>
      `${i + 1}. SECTION ${i + 1}\n` +
      `This is the content of section ${i + 1}. It contains important legal provisions ` +
      `that are relevant to the agreement between the parties. The terms specified herein ` +
      `shall be binding upon execution. Additional clauses specify obligations, penalties, ` +
      `and deadlines that must be adhered to by all parties involved in this agreement. ` +
      `Furthermore, all provisions shall survive the termination of this agreement to the ` +
      `extent necessary to give effect to the intent of the parties. The obligations set ` +
      `forth in this section shall be interpreted in accordance with applicable law.`,
    );
    const largeDoc = largeSections.join("\n\n");

    it("uses RAG retrieval for documents above the threshold", async () => {
      const mockChunks = [
        {
          chunkId: "hash:chunk-0",
          documentId: "hash",
          section: "3. RENT",
          subsection: "",
          text: "Rent is $2,200.00 per month.",
          startOffset: 500,
          endOffset: 527,
        },
      ];

      (embeddings.ensureDocumentEmbedded as jest.Mock).mockResolvedValueOnce({
        processedDoc: { chunks: mockChunks },
        chunkEmbeddings: [[1, 0, 0]],
      });
      (embeddings.retrieveRelevantChunks as jest.Mock).mockResolvedValueOnce(mockChunks);

      const mockOutput = {
        isCoveredInDocument: true,
        answer: "The rent is $2,200.00 per month.",
        relevantQuotes: ["Rent is $2,200.00 per month."],
        suggestedFollowUps: [],
        informationalDisclaimer: "Not legal advice.",
      };
      (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

      const req = new NextRequest("http://localhost:3000/api/ask", {
        method: "POST",
        body: JSON.stringify({
          document: largeDoc,
          question: "What is the monthly rent?",
          history: [],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verify RAG pipeline was invoked
      expect(embeddings.ensureDocumentEmbedded).toHaveBeenCalledTimes(1);
      expect(embeddings.retrieveRelevantChunks).toHaveBeenCalledTimes(1);

      const data = await res.json();
      expect(data.answer).toContain("$2,200");
    });

    it("does NOT invoke RAG for small documents", async () => {
      const mockOutput = {
        isCoveredInDocument: true,
        answer: "Small doc answer.",
        relevantQuotes: [],
        suggestedFollowUps: [],
        informationalDisclaimer: "Disclaimer.",
      };
      (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

      const req = new NextRequest("http://localhost:3000/api/ask", {
        method: "POST",
        body: JSON.stringify({
          document: validDoc, // small doc
          question: "What about the rent?",
          history: [],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      // RAG functions should NOT be called for small documents
      expect(embeddings.ensureDocumentEmbedded).not.toHaveBeenCalled();
      expect(embeddings.retrieveRelevantChunks).not.toHaveBeenCalled();
    });
  });
});
