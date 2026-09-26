/**
 * @jest-environment node
 */
import { POST } from "@/app/api/analyze/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

describe("POST /api/analyze", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  const validDoc = `
RESIDENTIAL LEASE AGREEMENT
1. RENT: $2,450/month. Due on 1st. Late penalty of $150 + $15/day after 5 PM.
2. ACCELERATION: On default, entire remaining rent for full year becomes immediately payable.
3. JURY WAIVER: Tenant waives trial by jury and agrees to binding arbitration.
`;

  it("extracts obligations, deadlines, and severity-tagged clauses with exact quotes", async () => {
    const mockOutput = {
      overallRiskLevel: "high",
      executiveSummary: "High-risk agreement featuring severe acceleration clauses and daily late fees.",
      clauses: [
        {
          title: "Rent Acceleration on Default",
          type: "risk",
          severity: "high",
          exactQuote: "entire remaining rent for full year becomes immediately payable.",
          explanation: "Tenant can be forced to pay all future months of rent if they default.",
          recommendation: "Negotiate removal of rent acceleration prior to signing.",
        },
        {
          title: "Jury Trial Waiver",
          type: "risk",
          severity: "high",
          exactQuote: "Tenant waives trial by jury and agrees to binding arbitration.",
          explanation: "Eliminates access to court resolution.",
          recommendation: "Have an attorney review arbitration venue and costs.",
        },
      ],
      deadlines: [
        {
          title: "Monthly Rent Cutoff",
          timeframe: "1st day of month by 5:00 PM",
          triggerEvent: "Beginning of calendar month",
          consequenceOfMissing: "Immediate $150 charge plus $15/day",
          exactQuote: "Due on 1st. Late penalty of $150 + $15/day after 5 PM.",
        },
      ],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ document: validDoc, language: "en" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.overallRiskLevel).toBe("high");
    expect(data.clauses).toHaveLength(2);
    expect(data.deadlines).toHaveLength(1);
    expect(data.clauses[0].exactQuote).toContain("entire remaining rent");
  });

  it("rejects request if document exceeds character threshold", async () => {
    const hugeDoc = "Z".repeat(50001);
    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ document: hugeDoc }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("exceeds maximum length");
  });

  it("processes large document using multi-stage candidate extraction and selective reasoning", async () => {
    // Large document exceeding 4000 chars threshold
    const largeDoc = Array.from({ length: 15 }, (_, i) =>
      `SECTION ${i + 1}. PROVISION ${i + 1}\n` +
      `This section sets forth obligations regarding indemnity, breach, default, and monetary damages of $50,000 within 30 days. ` +
      `Tenant shall indemnify Landlord against all claims and damages. Additional terms and operating rules apply here. `.repeat(3),
    ).join("\n\n");

    expect(largeDoc.length).toBeGreaterThan(4000);

    const fastModelOutput = {
      overallRiskLevel: "high",
      executiveSummary: "Initial fast extraction summary.",
      clauses: [
        {
          title: "Indemnity Clause",
          type: "risk",
          severity: "high",
          exactQuote: "Tenant shall indemnify Landlord against all claims and damages.",
          explanation: "Initial explanation of indemnity obligation.",
          recommendation: "Review liability limits.",
        },
      ],
      deadlines: [
        {
          title: "30-day notice",
          timeframe: "30 days",
          triggerEvent: "Notice of breach",
          consequenceOfMissing: "Default",
          exactQuote: "monetary damages of $50,000 within 30 days.",
        },
      ],
    };

    const refinedModelOutput = {
      refinedClauses: [
        {
          title: "Indemnity Clause",
          type: "risk",
          severity: "high",
          exactQuote: "Tenant shall indemnify Landlord against all claims and damages.",
          explanation: "Deep reasoning: Broad unreciprocal indemnity creates uncapped enterprise risk.",
          recommendation: "Cap indemnification to insurance proceeds and mutualize obligations.",
        },
      ],
      refinedExecutiveSummary: "High-risk agreement with severe unilateral indemnification exposure.",
    };

    // First call: fast model on candidate clauses
    // Second call: selective reasoning model on high-risk clauses
    (gemini.generateStructuredContent as jest.Mock)
      .mockResolvedValueOnce(fastModelOutput)
      .mockResolvedValueOnce(refinedModelOutput);

    const req = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: JSON.stringify({ document: largeDoc, language: "en" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.overallRiskLevel).toBe("high");
    expect(data.executiveSummary).toContain("severe unilateral indemnification");
    expect(data.clauses[0].explanation).toContain("Deep reasoning");
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(2);
  });
});

