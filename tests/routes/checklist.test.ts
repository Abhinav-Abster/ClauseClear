/**
 * @jest-environment node
 */
import { POST } from "@/app/api/checklist/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

describe("POST /api/checklist", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  const validDoc = `
RESIDENTIAL LEASE AGREEMENT
Move-out inspection required within 48 hours of departure.
Tenant must provide written renewal notice 60 days before termination date.
Tenant responsible for plumbing repairs under $500.
`;

  it("generates action items, deadlines, and questions for a lawyer", async () => {
    const mockOutput = {
      immediateActions: [
        {
          task: "Document apartment condition with timestamped video at move-in",
          priority: "urgent",
          rationale: "Establishes baseline condition to prevent unfair repair deductions.",
          relevantQuote: "Tenant responsible for plumbing repairs under $500.",
        },
      ],
      importantDeadlines: [
        {
          dateOrWindow: "60 days prior to lease end",
          description: "Renewal or non-renewal notice to landlord",
          penaltyOrRisk: "Forfeiture of tenancy or automatic renewal",
        },
      ],
      lawyerQuestions: [
        {
          category: "Implied Warranty of Habitability",
          question:
            "Is a clause forcing the tenant to pay the first $500 of plumbing repairs enforceable under local housing codes?",
          reasonToAsk: "Landlords usually hold non-waivable duties for plumbing infrastructure.",
          potentialRedFlag: "Landlord attempting to evade statutory habitability duties.",
        },
      ],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/checklist", {
      method: "POST",
      body: JSON.stringify({ document: validDoc, language: "en" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.immediateActions).toHaveLength(1);
    expect(data.importantDeadlines).toHaveLength(1);
    expect(data.lawyerQuestions).toHaveLength(1);
    expect(data.lawyerQuestions[0].category).toBe("Implied Warranty of Habitability");
  });
});
