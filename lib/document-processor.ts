/**
 * Document processing pipeline: structural chunking with legal-document awareness.
 *
 * Splits legal documents into semantically meaningful chunks that preserve
 * section structure, retaining metadata for accurate citations and
 * efficient retrieval-augmented generation.
 */

/** Increment when chunking logic changes to invalidate cached results. */
export const PROCESSING_VERSION = 1;

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  section: string;
  subsection: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface ProcessedDocument {
  documentId: string;
  processingVersion: number;
  chunks: DocumentChunk[];
  totalCharacters: number;
}

// ==========================================
// Configuration
// ==========================================

/** Maximum characters per chunk before splitting further. */
const MAX_CHUNK_CHARS = 2000;
/** Overlap between fallback fixed-size chunks (characters). */
const CHUNK_OVERLAP = 200;
/** Minimum chunk size — avoid trivially small fragments. */
const MIN_CHUNK_CHARS = 50;

// ==========================================
// Section Heading Detection
// ==========================================

/**
 * Patterns that identify legal section headings.
 * Ordered by specificity so that more specific patterns match first.
 */
const SECTION_HEADING_PATTERNS: RegExp[] = [
  // "ARTICLE 1", "Article IV", "ARTICLE 1."
  /^(ARTICLE|Article)\s+[IVXLC\d]+\.?\s*/,
  // "SECTION 1", "Section 2.1", "SECTION 1.1."
  /^(SECTION|Section)\s+[\d.]+\.?\s*/,
  // "PART I", "Part 2"
  /^(PART|Part)\s+[IVXLC\d]+\.?\s*/,
  // "SCHEDULE A", "Exhibit 1", "APPENDIX B"
  /^(SCHEDULE|Schedule|EXHIBIT|Exhibit|APPENDIX|Appendix)\s+[A-Z\d]+\.?\s*/,
  // "1. HEADING TEXT", "2.1 Sub-heading", "10. SOMETHING"
  /^\d+(?:\.\d+)*\.?\s+[A-Z]/,
];

/**
 * Returns true if the line looks like a legal section heading.
 * Intentionally conservative: avoids false positives on regular sentences.
 */
export function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 200) return false;
  return SECTION_HEADING_PATTERNS.some((p) => p.test(trimmed));
}

// ==========================================
// Internal Types & Section Splitting
// ==========================================

export interface RawSection {
  heading: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Splits a document into structural sections based on detected headings.
 * Returns raw sections preserving original text and character offsets.
 */
export function splitIntoSections(documentText: string): RawSection[] {
  const lines = documentText.split("\n");
  const sections: RawSection[] = [];

  let currentHeading = "(Preamble)";
  let currentLines: string[] = [];
  let sectionStartOffset = 0;
  let currentOffset = 0;

  for (const line of lines) {
    if (isSectionHeading(line) && currentLines.length > 0) {
      // Close previous section
      const sectionText = currentLines.join("\n").trim();
      if (sectionText.length >= MIN_CHUNK_CHARS) {
        sections.push({
          heading: currentHeading,
          text: sectionText,
          startOffset: sectionStartOffset,
          endOffset: sectionStartOffset + sectionText.length,
        });
      }
      // Start new section
      currentHeading = line.trim();
      currentLines = [line];
      sectionStartOffset = currentOffset;
    } else {
      currentLines.push(line);
    }
    currentOffset += line.length + 1; // +1 for \n
  }

  // Close last section
  const lastText = currentLines.join("\n").trim();
  if (lastText.length >= MIN_CHUNK_CHARS) {
    sections.push({
      heading: currentHeading,
      text: lastText,
      startOffset: sectionStartOffset,
      endOffset: sectionStartOffset + lastText.length,
    });
  }

  return sections;
}

// ==========================================
// Overlapping Chunk Splitter
// ==========================================

/**
 * Splits a text block into overlapping character chunks.
 * Attempts to break at sentence boundaries or line breaks for cleaner chunks.
 * Used as fallback when a section exceeds MAX_CHUNK_CHARS.
 */
function splitWithOverlap(
  text: string,
  maxSize: number,
  overlap: number,
): { text: string; localOffset: number }[] {
  const result: { text: string; localOffset: number }[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);

    // Try to break at a sentence boundary or line break
    if (end < text.length) {
      const searchStart = Math.max(start, end - 200);
      const searchRegion = text.slice(searchStart, end);
      const lastBreak = Math.max(
        searchRegion.lastIndexOf(". "),
        searchRegion.lastIndexOf(".\n"),
        searchRegion.lastIndexOf("\n\n"),
      );
      if (lastBreak > 0) {
        end = searchStart + lastBreak + 1;
      }
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length >= MIN_CHUNK_CHARS) {
      result.push({ text: chunkText, localOffset: start });
    }

    // Advance, applying overlap
    const nextStart = end - overlap;
    if (nextStart <= start) break; // Prevent infinite loop
    if (end >= text.length) break;
    start = nextStart;
  }

  return result;
}

// ==========================================
// Main Processing Pipeline
// ==========================================

/**
 * Processes a document into structured, citation-ready chunks.
 *
 * Strategy:
 * 1. Attempt structural splitting based on legal section headings.
 * 2. If a section exceeds MAX_CHUNK_CHARS, split it further with overlap.
 * 3. If no sections are detected, fall back to overlapping character chunks.
 *
 * Every chunk retains offset and section metadata for accurate citations.
 */
export function chunkDocument(documentText: string, documentId: string): ProcessedDocument {
  const sections = splitIntoSections(documentText);

  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // Determine if structural chunking was successful
  const hasStructure =
    sections.length > 1 || (sections.length === 1 && sections[0].heading !== "(Preamble)");

  if (!hasStructure && documentText.length > MAX_CHUNK_CHARS) {
    // Fallback: no detectable structure, use overlapping chunks
    const parts = splitWithOverlap(documentText, MAX_CHUNK_CHARS, CHUNK_OVERLAP);
    for (const part of parts) {
      chunks.push({
        chunkId: `${documentId}:chunk-${chunkIndex}`,
        documentId,
        section: `Chunk ${chunkIndex + 1}`,
        subsection: "",
        text: part.text,
        startOffset: part.localOffset,
        endOffset: part.localOffset + part.text.length,
      });
      chunkIndex++;
    }
  } else {
    // Structural chunking
    for (const section of sections) {
      if (section.text.length <= MAX_CHUNK_CHARS) {
        chunks.push({
          chunkId: `${documentId}:chunk-${chunkIndex}`,
          documentId,
          section: section.heading,
          subsection: "",
          text: section.text,
          startOffset: section.startOffset,
          endOffset: section.endOffset,
        });
        chunkIndex++;
      } else {
        // Section too large: split with overlap, preserving section label
        const parts = splitWithOverlap(section.text, MAX_CHUNK_CHARS, CHUNK_OVERLAP);
        for (let i = 0; i < parts.length; i++) {
          chunks.push({
            chunkId: `${documentId}:chunk-${chunkIndex}`,
            documentId,
            section: section.heading,
            subsection: parts.length > 1 ? `Part ${i + 1}` : "",
            text: parts[i].text,
            startOffset: section.startOffset + parts[i].localOffset,
            endOffset: section.startOffset + parts[i].localOffset + parts[i].text.length,
          });
          chunkIndex++;
        }
      }
    }
  }

  // Edge case: if document is too small to produce any chunks, make one chunk
  if (chunks.length === 0) {
    chunks.push({
      chunkId: `${documentId}:chunk-0`,
      documentId,
      section: "(Full Document)",
      subsection: "",
      text: documentText.trim(),
      startOffset: 0,
      endOffset: documentText.length,
    });
  }

  return {
    documentId,
    processingVersion: PROCESSING_VERSION,
    chunks,
    totalCharacters: documentText.length,
  };
}

// ==========================================
// Candidate Clause Extraction (Phase 4)
// ==========================================

export const RISK_KEYWORDS =
  /\b(indemnif|liab|default|breach|terminat|waiv|remedy|remedies|arbitrat|damages|penalty|penalties|guarant|unilateral|discretion|automatic renewal|non-compete|confidential|intellectual property|warrant|disclaimer|as is|liquidated|accelerat|interest|hold harmless|lien|forfeiture)\b/i;

export const DEADLINE_KEYWORDS =
  /\b(\d+\s+(?:calendar\s+|business\s+)?(?:days|months|years|hours|weeks)|within\s+\d+|due\s+on|notice\s+period|grace\s+period|deadline|expiration|renew|prior\s+to|forthwith|immediately)\b/i;

export const MONETARY_KEYWORDS =
  /(\$\s*[\d,]+(?:\.\d+)?|\b\d+\s*(?:dollars|cents|percent|%)\b|\bfee\b|\bfees\b|\bdeposit\b|\brent\b|\bcost\b|\bcosts\b|\bexpense|\bexpenses\b)/i;

export interface CandidateExtractionResult {
  candidateSections: RawSection[];
  candidateText: string;
  totalSections: number;
  candidateCount: number;
}

/**
 * Extracts sections likely to contain obligations, deadlines, or risks
 * based on keyword, monetary, and date detection.
 */
export function extractCandidateClauses(documentText: string): CandidateExtractionResult {
  const sections = splitIntoSections(documentText);
  if (sections.length <= 1) {
    return {
      candidateSections: sections,
      candidateText: documentText,
      totalSections: sections.length,
      candidateCount: sections.length,
    };
  }

  const candidateSections = sections.filter((sec) => {
    const text = sec.text;
    const heading = sec.heading;
    return (
      RISK_KEYWORDS.test(text) ||
      DEADLINE_KEYWORDS.test(text) ||
      MONETARY_KEYWORDS.test(text) ||
      RISK_KEYWORDS.test(heading) ||
      DEADLINE_KEYWORDS.test(heading) ||
      MONETARY_KEYWORDS.test(heading)
    );
  });

  // If filtering matched nothing, safely fall back to all sections
  const finalSections = candidateSections.length > 0 ? candidateSections : sections;

  const candidateText = finalSections
    .map((sec) => `=== ${sec.heading} ===\n${sec.text}`)
    .join("\n\n");

  return {
    candidateSections: finalSections,
    candidateText,
    totalSections: sections.length,
    candidateCount: finalSections.length,
  };
}

// ==========================================
// Structural Document Diff (Phase 6)
// ==========================================

export interface StructuralDiffResult {
  identicalSections: Array<{ heading: string; text: string }>;
  modifiedSections: Array<{
    heading: string;
    textA: string;
    textB: string;
    detectedDiffs: string[];
  }>;
  uniqueToA: Array<{ heading: string; text: string }>;
  uniqueToB: Array<{ heading: string; text: string }>;
}

/**
 * Performs deterministic structural comparison of two documents.
 * Identifies identical clauses, text modifications, and additions/deletions
 * without consuming any LLM tokens.
 */
export function computeStructuralDiff(documentA: string, documentB: string): StructuralDiffResult {
  const sectionsA = splitIntoSections(documentA);
  const sectionsB = splitIntoSections(documentB);

  const normalizeHeading = (h: string) =>
    h
      .toLowerCase()
      .replace(/^[\d.a-zivx\-)]+\s*/i, "")
      .replace(/[^\w\s]/g, "")
      .trim();

  const mapB = new Map<string, RawSection>();
  for (const b of sectionsB) {
    const norm = normalizeHeading(b.heading);
    if (norm) mapB.set(norm, b);
  }

  const matchedBNorms = new Set<string>();
  const identicalSections: Array<{ heading: string; text: string }> = [];
  const modifiedSections: Array<{
    heading: string;
    textA: string;
    textB: string;
    detectedDiffs: string[];
  }> = [];
  const uniqueToA: Array<{ heading: string; text: string }> = [];

  for (const a of sectionsA) {
    const norm = normalizeHeading(a.heading);
    const b = norm ? mapB.get(norm) : undefined;

    if (!b) {
      uniqueToA.push({ heading: a.heading, text: a.text });
      continue;
    }

    matchedBNorms.add(norm);

    const normTextA = a.text.replace(/\s+/g, " ").trim();
    const normTextB = b.text.replace(/\s+/g, " ").trim();

    if (normTextA === normTextB) {
      identicalSections.push({ heading: a.heading, text: a.text });
    } else {
      const diffs: string[] = [];

      const amountsA = normTextA.match(/\$\s*[\d,]+(?:\.\d+)?/g) || [];
      const amountsB = normTextB.match(/\$\s*[\d,]+(?:\.\d+)?/g) || [];
      if (amountsA.join(", ") !== amountsB.join(", ")) {
        diffs.push(
          `Monetary amounts changed: ${amountsA.join(", ") || "none"} (Doc A) vs ${amountsB.join(", ") || "none"} (Doc B)`,
        );
      }

      const timeA =
        normTextA.match(
          /\b\d+\s+(?:calendar\s+|business\s+)?(?:days|months|years|hours|weeks)\b/gi,
        ) || [];
      const timeB =
        normTextB.match(
          /\b\d+\s+(?:calendar\s+|business\s+)?(?:days|months|years|hours|weeks)\b/gi,
        ) || [];
      if (timeA.join(", ") !== timeB.join(", ")) {
        diffs.push(
          `Timeframes/deadlines changed: ${timeA.join(", ") || "none"} (Doc A) vs ${timeB.join(", ") || "none"} (Doc B)`,
        );
      }

      if (diffs.length === 0) {
        diffs.push("Terms or provisions modified between versions.");
      }

      modifiedSections.push({
        heading: `${a.heading} / ${b.heading}`,
        textA: a.text,
        textB: b.text,
        detectedDiffs: diffs,
      });
    }
  }

  const uniqueToB: Array<{ heading: string; text: string }> = [];
  for (const b of sectionsB) {
    const norm = normalizeHeading(b.heading);
    if (!matchedBNorms.has(norm)) {
      uniqueToB.push({ heading: b.heading, text: b.text });
    }
  }

  return {
    identicalSections,
    modifiedSections,
    uniqueToA,
    uniqueToB,
  };
}

// ==========================================
// Bounded Concurrency Worker Pool (Phase 5)
// ==========================================

/**
 * Maps items through an asynchronous task function with bounded concurrency,
 * preventing rate limits and excessive memory allocation.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (_item: T, _index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  const workerCount = Math.min(limit, items.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

