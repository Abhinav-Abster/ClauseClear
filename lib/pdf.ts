import pdf from "pdf-parse";
import { MAX_FILE_SIZE_BYTES } from "./validation";

export interface ExtractResult {
  text: string;
  charCount: number;
}

export const ALLOWED_MIME_TYPES = ["text/plain", "application/pdf"];

/**
 * Extracts plain text from an uploaded file buffer.
 * Enforces strict MIME type check and maximum file size (5MB).
 * Does not write file to disk or execute scripts.
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the 5MB limit.`,
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Unsupported file type '${mimeType}'. Only .txt (text/plain) and .pdf (application/pdf) documents are supported.`,
    );
  }

  let text = "";

  if (mimeType === "text/plain") {
    text = buffer.toString("utf-8");
  } else if (mimeType === "application/pdf") {
    try {
      const parsed = await pdf(buffer);
      text = parsed.text || "";
    } catch (err) {
      throw new Error(
        `Failed to parse PDF document: ${err instanceof Error ? err.message : "Invalid or encrypted PDF."}`,
      );
    }
  }

  // Normalize line endings and whitespace
  const sanitized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!sanitized) {
    throw new Error("Extracted document content is empty or unreadable.");
  }

  return {
    text: sanitized,
    charCount: sanitized.length,
  };
}
