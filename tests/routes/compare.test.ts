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
});
