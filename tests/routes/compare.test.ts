/**
 * @jest-environment node
 */
import { POST } from "@/app/api/compare/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

describe("POST /api/compare", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  const docA = `Standard Lease: Rent is $2,200/mo. Deposit is $2,200. Grace period 5 days. Landlord gives 24h notice.`;
  const docB = `Strict Lease: Rent is $2,450/mo. Deposit is $4,900. No grace period. Landlord may enter anytime.`;

  it("compares two documents and returns differences, favorability, and unique provisions", async () => {
    const mockOutput = {
      summary: "Document A (Standard Lease) is notably more tenant-friendly across rent, deposit, and privacy.",
      comparisonPoints: [
        {
          topic: "Landlord Access Notice",
          documentAProvision: "At least 24 hours advance written notice required.",
          documentBProvision: "May enter at any time without notice.",
          moreFavorableToUser: "documentA",
          favourabilityReasoning: "Document A preserves privacy and aligns with standard statutory tenant rights.",
        },
      ],
      uniqueToDocumentA: [],
      uniqueToDocumentB: [
        {
          clause: "Notice Waiver",
          summary: "Tenant waives right to 24 hour notice.",
          significance: "High invasion of tenant privacy.",
        },
      ],
      keyRecommendationsForReview: [
        "Document A is substantially more protective of tenant rights.",
      ],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/compare", {
      method: "POST",
      body: JSON.stringify({
        documentA: docA,
        documentB: docB,
        labelA: "Standard Lease",
        labelB: "Strict Lease",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.comparisonPoints).toHaveLength(1);
    expect(data.comparisonPoints[0].moreFavorableToUser).toBe("documentA");
    expect(data.uniqueToDocumentB).toHaveLength(1);
  });

  it("compares large documents using deterministic structural diff pipeline", async () => {
    // Large documents exceeding 6000 chars combined threshold
    const largeDocA = Array.from({ length: 6 }, (_, i) =>
      `SECTION ${i + 1}. CLAUSE ${i + 1}\n` +
      `This is standard text for section ${i + 1} with rent of $2,000 per month and 5 days grace period. `.repeat(7),
    ).join("\n\n");

    const largeDocB = Array.from({ length: 6 }, (_, i) =>
      `SECTION ${i + 1}. CLAUSE ${i + 1}\n` +
      `This is strict text for section ${i + 1} with rent of $2,800 per month and 1 days grace period. `.repeat(7),
    ).join("\n\n");

    expect(largeDocA.length + largeDocB.length).toBeGreaterThan(6000);

    const mockOutput = {
      summary: "Document A offers significantly more favorable financial and notice terms.",
      comparisonPoints: [
        {
          topic: "Rent and Grace Period",
          documentAProvision: "Rent of $2,000 with 5 days grace period.",
          documentBProvision: "Rent of $2,800 with 1 day grace period.",
          moreFavorableToUser: "documentA",
          favourabilityReasoning: "Document A saves $800/mo and provides 4 additional days before penalties.",
        },
      ],
      uniqueToDocumentA: [],
      uniqueToDocumentB: [],
      keyRecommendationsForReview: ["Negotiate Document B rent down to Document A baseline."],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/compare", {
      method: "POST",
      body: JSON.stringify({
        documentA: largeDocA,
        documentB: largeDocB,
        labelA: "Doc A",
        labelB: "Doc B",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary).toContain("Document A offers significantly more favorable");
    expect(data.comparisonPoints).toHaveLength(1);
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(1);

    // Verify the prompt contained the structural diff analysis
    const callArgs = (gemini.generateStructuredContent as jest.Mock).mock.calls[0][0];
    expect(callArgs.systemInstruction).toContain("TASK: Compare the two legal documents based on the provided structural diff");
  });
});

