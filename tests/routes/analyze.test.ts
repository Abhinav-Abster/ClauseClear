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
});
