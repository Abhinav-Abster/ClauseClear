/**
 * @jest-environment node
 */
import {
  chunkDocument,
  isSectionHeading,
  PROCESSING_VERSION,
  extractCandidateClauses,
  computeStructuralDiff,
  mapConcurrent,
  type DocumentChunk,
} from "@/lib/document-processor";

describe("Document Processor", () => {
  describe("isSectionHeading", () => {
    it.each([
      ["1. PARTIES AND PREMISES", true],
      ["2. LEASE TERM", true],
      ["10. GOVERNING LAW", true],
      ["1.1 Sub-section Name", true],
      ["2.3. Another Subsection", true],
      ["ARTICLE 1", true],
      ["Article IV", true],
      ["SECTION 2.1", true],
      ["Section 3", true],
      ["PART I", true],
      ["SCHEDULE A", true],
      ["Exhibit 1", true],
      ["APPENDIX B", true],
      ["", false],
      ["This is a regular sentence.", false],
      ["Tenant agrees to pay rent of $2,200.00 per month.", false],
      ["a. lowercase item", false],
    ])("classifies '%s' as heading=%s", (line, expected) => {
      expect(isSectionHeading(line)).toBe(expected);
    });
  });

  describe("chunkDocument — structural chunking", () => {
    const sampleLease = `RESIDENTIAL LEASE AGREEMENT (STANDARD)

1. PARTIES AND PREMISES
This Agreement is entered into on January 1, 2025, between Oakridge Properties LLC ("Landlord") and Jane Doe ("Tenant"). Landlord agrees to lease to Tenant the residential property located at 742 Evergreen Terrace, Apt 4B, Springfield ("Premises").

2. LEASE TERM
The term of this Lease commences on February 1, 2025, and terminates on January 31, 2026 ("Term"). Tenant may renew this Lease for an additional one-year term by providing written notice to Landlord at least sixty (60) days prior to expiration.

3. RENT AND PAYMENT SCHEDULE
Tenant agrees to pay rent of $2,200.00 per month, due on the first (1st) day of each calendar month. A grace period is provided until the fifth (5th) day of the month. If rent is not received by 11:59 PM on the fifth (5th) day, a late fee of $50.00 shall be assessed.

4. SECURITY DEPOSIT
Upon execution of this Lease, Tenant shall deposit with Landlord the sum of $2,200.00 as a Security Deposit. Landlord shall hold this deposit in an interest-bearing escrow account.`;

    it("splits structured document into section-based chunks", () => {
      const result = chunkDocument(sampleLease, "test-doc-hash");

      expect(result.documentId).toBe("test-doc-hash");
      expect(result.processingVersion).toBe(PROCESSING_VERSION);
      expect(result.totalCharacters).toBe(sampleLease.length);

      // Should have preamble + 4 numbered sections = 5 chunks
      expect(result.chunks.length).toBeGreaterThanOrEqual(4);
    });

    it("assigns unique chunkIds to every chunk", () => {
      const result = chunkDocument(sampleLease, "test-hash");
      const ids = result.chunks.map((c) => c.chunkId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("preserves section labels in chunk metadata", () => {
      const result = chunkDocument(sampleLease, "test-hash");
      const sectionLabels = result.chunks.map((c) => c.section);

      // Should detect numbered headings
      expect(sectionLabels.some((s) => s.includes("PARTIES"))).toBe(true);
      expect(sectionLabels.some((s) => s.includes("LEASE TERM"))).toBe(true);
      expect(sectionLabels.some((s) => s.includes("RENT"))).toBe(true);
    });

    it("preserves character offsets for citation support", () => {
      const result = chunkDocument(sampleLease, "test-hash");

      for (const chunk of result.chunks) {
        expect(chunk.startOffset).toBeGreaterThanOrEqual(0);
        expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
        expect(chunk.endOffset).toBeLessThanOrEqual(sampleLease.length + 1);
      }
    });
  });

  describe("chunkDocument — fallback chunking", () => {
    it("uses overlapping chunks when no section headings are detected", () => {
      // Generate unstructured text that exceeds MAX_CHUNK_CHARS (2000)
      const unstructuredText = Array(50)
        .fill("This is a paragraph of unstructured legal text without any numbered headings or section markers. ")
        .join("");

      const result = chunkDocument(unstructuredText, "unstructured-hash");

      expect(result.chunks.length).toBeGreaterThan(1);

      // Chunks should be labeled generically
      expect(result.chunks[0].section).toContain("Chunk");
    });
  });

  describe("chunkDocument — edge cases", () => {
    it("produces a single chunk for very short documents", () => {
      const shortDoc = "This is a short legal notice. Terms and conditions apply.";
      const result = chunkDocument(shortDoc, "short-hash");

      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].text).toBe(shortDoc);
      expect(result.chunks[0].startOffset).toBe(0);
    });

    it("handles empty-ish document gracefully", () => {
      const result = chunkDocument("   \n\n  ", "empty-hash");
      // Should produce at least one chunk (the guard clause)
      expect(result.chunks.length).toBe(1);
    });

    it("all chunks reference the same documentId", () => {
      const doc = `1. Section A\nContent of section A goes here and is meaningful.\n\n2. Section B\nContent of section B is also present and meaningful.`;
      const result = chunkDocument(doc, "multi-section-hash");

      for (const chunk of result.chunks) {
        expect(chunk.documentId).toBe("multi-section-hash");
      }
    });
  });

  describe("extractCandidateClauses (Phase 4)", () => {
    it("filters out benign boilerplate while retaining sections with risks, deadlines, and money", () => {
      const contract = `
1. RECITALS
The parties desire to enter into this agreement for mutual convenience and generic collaboration without any specific warranties.

2. INDEMNIFICATION AND LIABILITY
Tenant shall indemnify, defend, and hold harmless Landlord against all claims, liabilities, and damages. Total liability is uncapped.

3. PAYMENT AND FEES
Rent is $3,500 due on the first day of each calendar month. Late fee of $150 applies after 5 days.

4. MISCELLANEOUS NOTICES
All notices shall be sent to 123 Main Street in writing by certified mail.
`;
      const res = extractCandidateClauses(contract);
      expect(res.totalSections).toBe(4);
      // Sections 2 and 3 contain risk/deadline/money keywords
      expect(res.candidateCount).toBe(2);
      expect(res.candidateText).toContain("INDEMNIFICATION AND LIABILITY");
      expect(res.candidateText).toContain("PAYMENT AND FEES");
      expect(res.candidateText).not.toContain("RECITALS");
    });
  });

  describe("computeStructuralDiff (Phase 6)", () => {
    const docA = `
1. RENT AND FEES
Tenant pays $2,000 per month. Grace period is 5 days.

2. GOVERNING LAW
This agreement is governed by the laws of California.

3. PARKING
One designated parking space is provided.
`;

    const docB = `
1. RENT AND FEES
Tenant pays $2,500 per month. Grace period is 3 days.

2. GOVERNING LAW
This agreement is governed by the laws of California.

4. PETS POLICY
No pets are permitted without prior written consent.
`;

    it("identifies identical, modified, and unique provisions deterministically", () => {
      const diff = computeStructuralDiff(docA, docB);

      // Governing law is identical
      expect(diff.identicalSections.length).toBe(1);
      expect(diff.identicalSections[0].heading).toContain("GOVERNING LAW");

      // Rent and fees is modified with detected money and deadline diffs
      expect(diff.modifiedSections.length).toBe(1);
      expect(diff.modifiedSections[0].heading).toContain("RENT AND FEES");
      expect(diff.modifiedSections[0].detectedDiffs.length).toBeGreaterThanOrEqual(1);

      // Parking is unique to A
      expect(diff.uniqueToA.length).toBe(1);
      expect(diff.uniqueToA[0].heading).toContain("PARKING");

      // Pets policy is unique to B
      expect(diff.uniqueToB.length).toBe(1);
      expect(diff.uniqueToB[0].heading).toContain("PETS POLICY");
    });
  });

  describe("mapConcurrent (Phase 5)", () => {
    it("executes tasks with bounded concurrency while preserving order", async () => {
      let activeWorkers = 0;
      let maxObservedWorkers = 0;

      const items = [1, 2, 3, 4, 5, 6];
      const results = await mapConcurrent(items, 2, async (val) => {
        activeWorkers++;
        if (activeWorkers > maxObservedWorkers) {
          maxObservedWorkers = activeWorkers;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeWorkers--;
        return val * 10;
      });

      expect(results).toEqual([10, 20, 30, 40, 50, 60]);
      expect(maxObservedWorkers).toBeLessThanOrEqual(2);
    });

    it("handles empty array cleanly", async () => {
      const results = await mapConcurrent([], 3, async () => 1);
      expect(results).toEqual([]);
    });
  });
});

