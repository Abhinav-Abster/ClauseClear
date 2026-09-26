/**
 * Embedding generation, in-memory vector storage, and similarity retrieval.
 *
 * Uses Gemini's text-embedding-004 model for generating embeddings.
 * Stores embedded documents in memory, keyed by documentHash + processingVersion,
 * so that a document is only chunked and embedded once regardless of how many
 * questions are asked against it.
 */

import { getGeminiClient } from "./gemini";
import {
  chunkDocument,
  PROCESSING_VERSION,
  type DocumentChunk,
  type ProcessedDocument,
} from "./document-processor";

const EMBEDDING_MODEL = "text-embedding-004";
const DEFAULT_TOP_K = 5;

// ==========================================
// Types
// ==========================================

export interface EmbeddedDocument {
  processedDoc: ProcessedDocument;
  chunkEmbeddings: number[][];
}

// ==========================================
// In-Memory Embedded Document Store
// ==========================================

function storeKey(docHash: string): string {
  return `${docHash}:v${PROCESSING_VERSION}`;
}

const embeddedDocStore = new Map<string, EmbeddedDocument>();

// ==========================================
// Embedding Generation
// ==========================================

/**
 * Generates an embedding vector for a single text using Gemini's embedding model.
 */
async function embedText(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const result = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  if (!result.embeddings || result.embeddings.length === 0) {
    throw new Error("Embedding API returned no embeddings.");
  }

  const values = result.embeddings[0].values;
  if (!values || values.length === 0) {
    throw new Error("Embedding API returned empty embedding values.");
  }

  return values;
}

/**
 * Generates embeddings for multiple texts sequentially.
 * Sequential to avoid rate limiting — embedding calls are fast (~50ms each),
 * and typical documents produce 5–20 chunks.
 */
async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}

// ==========================================
// Cosine Similarity
// ==========================================

/**
 * Computes cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 indicates identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ==========================================
// Document Processing + Embedding Pipeline
// ==========================================

/**
 * Ensures a document has been chunked and embedded.
 * Returns cached results if the document was already processed with the
 * current PROCESSING_VERSION.
 *
 * This is the main entry point for preparing a document for RAG retrieval.
 */
export async function ensureDocumentEmbedded(
  documentText: string,
  docHash: string,
): Promise<EmbeddedDocument> {
  const key = storeKey(docHash);

  const cached = embeddedDocStore.get(key);
  if (cached) return cached;

  // 1. Chunk the document
  const processedDoc = chunkDocument(documentText, docHash);

  // 2. Generate embeddings for all chunks
  const chunkTexts = processedDoc.chunks.map((c) => c.text);
  const chunkEmbeddings = await embedTexts(chunkTexts);

  // 3. Store for reuse across multiple questions / operations
  const embedded: EmbeddedDocument = { processedDoc, chunkEmbeddings };
  embeddedDocStore.set(key, embedded);

  return embedded;
}

// ==========================================
// Retrieval
// ==========================================

/**
 * Retrieves the top-K most relevant chunks for a given query.
 *
 * The document must have been previously embedded via ensureDocumentEmbedded().
 * If the document has fewer chunks than topK, all chunks are returned
 * (sorted by relevance).
 */
export async function retrieveRelevantChunks(
  query: string,
  docHash: string,
  topK: number = DEFAULT_TOP_K,
): Promise<DocumentChunk[]> {
  const key = storeKey(docHash);
  const embedded = embeddedDocStore.get(key);

  if (!embedded) {
    throw new Error(
      `Document ${docHash.substring(0, 12)}... not found in embedding store. ` +
        `Call ensureDocumentEmbedded() first.`,
    );
  }

  const { processedDoc, chunkEmbeddings } = embedded;

  // If document has fewer chunks than topK, return all (in document order)
  if (processedDoc.chunks.length <= topK) {
    return [...processedDoc.chunks];
  }

  // Embed the query
  const queryEmbedding = await embedText(query);

  // Score each chunk by cosine similarity to the query
  const scored = processedDoc.chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunkEmbeddings[i]),
  }));

  // Sort by descending similarity and take top K
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((s) => s.chunk);
}

/**
 * Returns the processed document for a given hash, if it exists in the store.
 */
export function getProcessedDocument(docHash: string): ProcessedDocument | null {
  const key = storeKey(docHash);
  const embedded = embeddedDocStore.get(key);
  return embedded?.processedDoc ?? null;
}

/**
 * Clears the embedded document store (useful for testing).
 */
export function clearEmbeddedDocStore(): void {
  embeddedDocStore.clear();
}
