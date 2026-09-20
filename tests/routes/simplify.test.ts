/**
 * @jest-environment node
 */
import { POST } from "@/app/api/simplify/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

describe("POST /api/simplify", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

  const validDoc = `
RESIDENTIAL LEASE AGREEMENT
1. PARTIES: Landlord Oakridge LLC and Tenant Jane Doe.
2. RENT: $2,200 due on 1st of each month with 5 day grace period.
3. SECURITY DEPOSIT: $2,200 held in escrow account.
`;

  it("successfully simplifies document into sections and glossary", async () => {
    const mockOutput = {
      summary: "A residential lease between Oakridge LLC and Jane Doe for $2,200/month.",
      documentType: "Residential Lease Agreement",
      sections: [
        {
          heading: "1. Parties",
          originalSnippet: "Landlord Oakridge LLC and Tenant Jane Doe",
          plainLanguageSummary: "Specifies who owns the property and who is renting it.",
          keyTakeaway: "Jane Doe is the sole legal tenant.",
        },
        {
          heading: "2. Rent",
          originalSnippet: "RENT: $2,200 due on 1st of each month",
          plainLanguageSummary: "Monthly rent is $2,200 due on the first, with a grace period until the 5th.",
          keyTakeaway: "Pay by the 5th to avoid late fees.",
        },
      ],
      glossary: [
        {
          term: "Escrow",
          definition: "A separate bank account where money is protected until conditions are met.",
          contextInDoc: "Used for holding the tenant's security deposit.",
        },
      ],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const req = new NextRequest("http://localhost:3000/api/simplify", {
      method: "POST",
      body: JSON.stringify({ document: validDoc, language: "en" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.documentType).toBe("Residential Lease Agreement");
    expect(data.sections).toHaveLength(2);
    expect(data.glossary).toHaveLength(1);
    expect(res.headers.get("X-Cache")).toBe("MISS");
  });

  it("serves repeated requests from in-memory cache without calling Gemini again", async () => {
    const mockOutput = {
      summary: "A residential lease.",
      documentType: "Residential Lease",
      sections: [],
      glossary: [],
    };

    (gemini.generateStructuredContent as jest.Mock).mockResolvedValueOnce(mockOutput);

    const makeReq = () =>
      new NextRequest("http://localhost:3000/api/simplify", {
        method: "POST",
        body: JSON.stringify({ document: validDoc, language: "en" }),
      });

    const res1 = await POST(makeReq());
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-Cache")).toBe("MISS");
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(1);

    // Second request with same document text
    const res2 = await POST(makeReq());
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-Cache")).toBe("HIT");
    // Model should NOT be invoked a second time
    expect(gemini.generateStructuredContent).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when document text is too short or missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/simplify", {
      method: "POST",
      body: JSON.stringify({ document: "Short text" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Document is too short");
  });
});
