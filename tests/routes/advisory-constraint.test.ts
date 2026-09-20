import { buildAskPrompt, SYSTEM_BASE_INSTRUCTION } from "@/lib/prompts";
import { AskResponseSchema } from "@/lib/validation";

describe("Core Non-Negotiable Constraint: Informational-Not-Advisory", () => {
  const sampleContract = `
RESIDENTIAL LEASE AGREEMENT
Tenant agrees to pay $2,000/month.
Landlord may enter premises at any time without notice.
Tenant waives right to jury trial and agrees to binding arbitration.
`;

  it("embeds strict non-advisory instructions in the base system prompt", () => {
    expect(SYSTEM_BASE_INSTRUCTION).toContain("STRICT INFORMATIONAL-NOT-ADVISORY CONSTRAINT");
    expect(SYSTEM_BASE_INSTRUCTION).toContain("You provide legal information and educational assistance, NEVER professional legal advice");
    expect(SYSTEM_BASE_INSTRUCTION).toContain('You must NEVER tell a user "Yes, you should sign this" or "No, do not sign this"');
    expect(SYSTEM_BASE_INSTRUCTION).toContain("recommend consulting a licensed attorney");
  });

  it("instructs the model to refuse advisory 'Should I sign this?' queries and mandate lawyer consultation", () => {
    const prompt = buildAskPrompt(
      sampleContract,
      "Should I sign this lease? Is it safe for me to agree?",
      [],
      "en",
    );

    // System instruction must contain instructions forbidding direct advisory verdicts
    expect(prompt.systemInstruction).toContain("STRICT INFORMATIONAL-NOT-ADVISORY CONSTRAINT");
    expect(prompt.systemInstruction).toContain("If the user asks for legal advice (such as \"Should I sign this?\"");
    expect(prompt.systemInstruction).toContain("cannot advise whether to sign");
    expect(prompt.systemInstruction).toContain("recommending consultation with a legal professional");

    // The user's question must be isolated in userContent
    expect(prompt.userContent).toContain("Should I sign this lease?");
  });

  it("validates that an advisory inquiry produces an informational response adhering to the constraint", () => {
    // Simulated model response adhering to the system prompt's non-advisory directive
    const simulatedCompliantResponse = {
      isCoveredInDocument: true,
      answer:
        "ClauseClear provides legal information and document comprehension assistance, but cannot advise you on whether or not to sign this lease. When considering this agreement, notice that Clause 2 allows the Landlord to enter at any time without notice, and Clause 3 requires waiving your right to a jury trial in favor of binding arbitration. These terms significantly limit tenant protections. You should consult a licensed tenant rights attorney or legal aid organization to evaluate whether these terms are acceptable or lawful in your jurisdiction before signing.",
      relevantQuotes: [
        "Landlord may enter premises at any time without notice.",
        "Tenant waives right to jury trial and agrees to binding arbitration.",
      ],
      suggestedFollowUps: [
        "What does the lease say about notice before landlord entry?",
        "What are the implications of the binding arbitration clause?",
      ],
      informationalDisclaimer:
        "This response provides factual information from the document and does not constitute legal advice.",
    };

    // Must strictly validate against AskResponseSchema
    const validated = AskResponseSchema.parse(simulatedCompliantResponse);

    // Assert that the response adheres to informational-not-advisory behavior:
    // 1. Never outputs a direct definitive "Yes, sign" or "No, do not sign" instruction
    expect(validated.answer.toLowerCase()).not.toMatch(/^yes,?\s+sign/);
    expect(validated.answer.toLowerCase()).not.toMatch(/^no,?\s+do not sign/);
    expect(validated.answer.toLowerCase()).not.toMatch(/you should sign this/);

    // 2. Explicitly disclaims advice and directs to legal counsel
    expect(validated.answer.toLowerCase()).toContain("cannot advise");
    expect(validated.answer.toLowerCase()).toContain("consult a licensed");

    // 3. Includes standard disclaimer
    expect(validated.informationalDisclaimer).toContain("does not constitute legal advice");
  });
});
