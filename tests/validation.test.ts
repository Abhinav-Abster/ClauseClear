import {
  SimplifyInputSchema,
  AnalyzeInputSchema,
  AskInputSchema,
  CompareInputSchema,
  DocumentTextSchema,
  SimplifyResponseSchema,
  AnalyzeResponseSchema,
  AskResponseSchema,
  ChecklistResponseSchema,
  CompareResponseSchema,
  MAX_DOCUMENT_LENGTH,
  MIN_DOCUMENT_LENGTH,
} from "@/lib/validation";

describe("Document Text Validation", () => {
  it("rejects empty or whitespace-only documents", () => {
    const result = DocumentTextSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Document is too short");
    }
  });

  it("rejects documents shorter than the minimum character length", () => {
    const shortText = "Too short";
    expect(shortText.length).toBeLessThan(MIN_DOCUMENT_LENGTH);
    const result = DocumentTextSchema.safeParse(shortText);
    expect(result.success).toBe(false);
  });

  it("accepts valid documents within character limits", () => {
    const validText = "This is a legally binding contract between Tenant and Landlord for the lease of property.";
    const result = DocumentTextSchema.safeParse(validText);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(validText);
    }
  });

  it("rejects oversized documents exceeding 50,000 characters with user-facing message", () => {
    const oversizedText = "A".repeat(MAX_DOCUMENT_LENGTH + 50);
    const result = DocumentTextSchema.safeParse(oversizedText);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("exceeds maximum length");
    }
  });
});

describe("Route Input Schemas", () => {
  const sampleDoc = "Oakridge Properties LLC hereby agrees to lease premises to Jane Doe for $2,200 per month.";

  it("validates SimplifyInputSchema with default language", () => {
    const input = { document: sampleDoc };
    const parsed = SimplifyInputSchema.parse(input);
    expect(parsed.language).toBe("en");
  });

  it("validates AnalyzeInputSchema with supported language", () => {
    const input = { document: sampleDoc, language: "es" };
    const parsed = AnalyzeInputSchema.parse(input);
    expect(parsed.language).toBe("es");
  });

  it("validates AskInputSchema and rejects short or empty questions", () => {
    const invalidInput = { document: sampleDoc, question: "a" };
    expect(() => AskInputSchema.parse(invalidInput)).toThrow();

    const validInput = { document: sampleDoc, question: "What is the monthly rent?" };
    const parsed = AskInputSchema.parse(validInput);
    expect(parsed.question).toBe("What is the monthly rent?");
  });

  it("validates CompareInputSchema with two documents", () => {
    const docB = "Pinnacle Housing Corp leases unit to Jane Doe for $2,450 per month with no grace period.";
    const input = {
      documentA: sampleDoc,
      documentB: docB,
      labelA: "Standard Lease",
      labelB: "Strict Lease",
    };
    const parsed = CompareInputSchema.parse(input);
    expect(parsed.labelA).toBe("Standard Lease");
    expect(parsed.labelB).toBe("Strict Lease");
  });
});

describe("Output Schemas (Model Response Validation)", () => {
  it("validates valid SimplifyResponse structure", () => {
    const mockOutput = {
      summary: "A standard residential lease for 12 months.",
      documentType: "Residential Lease Agreement",
      sections: [
        {
          heading: "1. Parties and Premises",
          originalSnippet: "This Agreement is entered into...",
          plainLanguageSummary: "Identifies who is renting to whom and where.",
          keyTakeaway: "Jane Doe is the sole tenant.",
        },
      ],
      glossary: [
        {
          term: "Escrow",
          definition: "A financial arrangement where a third party holds funds.",
          contextInDoc: "Security deposit is held in escrow.",
        },
      ],
    };
    const validated = SimplifyResponseSchema.parse(mockOutput);
    expect(validated.documentType).toBe("Residential Lease Agreement");
    expect(validated.sections).toHaveLength(1);
  });

  it("validates valid AnalyzeResponse structure with severity and quotes", () => {
    const mockOutput = {
      overallRiskLevel: "medium",
      executiveSummary: "Overall balanced agreement with one strict notice clause.",
      clauses: [
        {
          title: "Early Termination Penalty",
          type: "risk",
          severity: "high",
          exactQuote: "paying an early termination fee equal to one month's rent.",
          explanation: "Tenant must pay one month rent if terminating early.",
          recommendation: "Ensure job relocation qualifies before relying on this clause.",
        },
      ],
      deadlines: [
        {
          title: "Lease Renewal Notice",
          timeframe: "60 days prior to expiration",
          triggerEvent: "Lease expiration date",
          consequenceOfMissing: "Forfeiture of right to renew for standard rate",
          exactQuote: "providing written notice to Landlord at least sixty (60) days prior",
        },
      ],
    };
    const validated = AnalyzeResponseSchema.parse(mockOutput);
    expect(validated.overallRiskLevel).toBe("medium");
    expect(validated.clauses[0].severity).toBe("high");
    expect(validated.clauses[0].exactQuote).toBeTruthy();
  });

  it("validates AskResponse structure with grounding flags", () => {
    const groundedOutput = {
      isCoveredInDocument: true,
      answer: "The rent is $2,200 due on the 1st of each month with a 5-day grace period.",
      relevantQuotes: ["Tenant agrees to pay rent of $2,200.00 per month, due on the first (1st) day"],
      suggestedFollowUps: ["Is there a late fee after the 5th?"],
      informationalDisclaimer: "This response provides factual information and does not constitute legal advice.",
    };
    const validated = AskResponseSchema.parse(groundedOutput);
    expect(validated.isCoveredInDocument).toBe(true);

    const ungroundedOutput = {
      isCoveredInDocument: false,
      answer: "This document does not contain information regarding parking or garage spaces.",
      relevantQuotes: [],
      suggestedFollowUps: ["Does the agreement mention access or premises boundaries?"],
      informationalDisclaimer: "This response provides factual information and does not constitute legal advice.",
    };
    const validatedUngrounded = AskResponseSchema.parse(ungroundedOutput);
    expect(validatedUngrounded.isCoveredInDocument).toBe(false);
  });

  it("validates ChecklistResponse and CompareResponse structures", () => {
    const checklistOutput = {
      immediateActions: [
        {
          task: "Conduct move-in photo inspection",
          priority: "urgent",
          rationale: "Required to protect security deposit return rights.",
          relevantQuote: "less any documented deductions for damage exceeding normal wear",
        },
      ],
      importantDeadlines: [
        {
          dateOrWindow: "60 days before Jan 31, 2026",
          description: "Renewal notice deadline",
          penaltyOrRisk: "Loss of renewal option",
        },
      ],
      lawyerQuestions: [
        {
          category: "Security Deposit Escrow",
          question: "Does Illinois law require statutory interest payment for buildings under 25 units?",
          reasonToAsk: "To ensure deposit handling conforms with municipal codes.",
          potentialRedFlag: "Landlord failing to provide escrow bank details.",
        },
      ],
    };
    expect(ChecklistResponseSchema.parse(checklistOutput).immediateActions).toHaveLength(1);

    const compareOutput = {
      summary: "Document A offers lower rent and more favorable notice periods than Document B.",
      comparisonPoints: [
        {
          topic: "Monthly Rent",
          documentAProvision: "$2,200/month",
          documentBProvision: "$2,450/month",
          moreFavorableToUser: "documentA",
          favourabilityReasoning: "Document A is $250/month cheaper with a 5-day grace period.",
        },
      ],
      uniqueToDocumentA: [
        {
          clause: "Pet Allowance",
          summary: "Allows one pet under 35 lbs with deposit.",
          significance: "Crucial if the tenant owns a pet.",
        },
      ],
      uniqueToDocumentB: [
        {
          clause: "Mandatory Arbitration & Jury Waiver",
          summary: "Requires private arbitration and waives jury trial.",
          significance: "Limits tenant's legal recourse in disputes.",
        },
      ],
      keyRecommendationsForReview: ["Request removal of the non-refundable cleaning fee in Document B."],
    };
    expect(CompareResponseSchema.parse(compareOutput).comparisonPoints).toHaveLength(1);
  });
});
