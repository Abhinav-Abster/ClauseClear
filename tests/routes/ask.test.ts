/**
 * @jest-environment node
 */
import { POST } from "@/app/api/ask/route";
import { NextRequest } from "next/server";
import * as gemini from "@/lib/gemini";
import { clearCache, clearRateLimits } from "@/lib/api-guard";

jest.mock("@/lib/gemini", () => ({
  ...jest.requireActual("@/lib/gemini"),
  generateStructuredContent: jest.fn(),
}));

describe("POST /api/ask", () => {
  beforeEach(() => {
    clearCache();
    clearRateLimits();
    jest.clearAllMocks();
  });

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
});
