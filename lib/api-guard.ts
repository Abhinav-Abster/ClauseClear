import crypto from "crypto";

// ==========================================
// 1. In-Memory Content-Hash Caching
// ==========================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Computes a deterministic SHA-256 hash of untrusted input.
 * We hash inputs so that:
 * 1. Cache keys do not store plaintext legal text.
 * 2. System logs only print cryptographic hashes, never user PII.
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

export function buildCacheKey(route: string, ...parts: string[]): string {
  const combined = [route, ...parts].join("::");
  return crypto.createHash("sha256").update(combined).digest("hex");
}

export function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setInCache<T>(key: string, data: T, ttlMs = DEFAULT_CACHE_TTL_MS): void {
  // Prune expired keys periodically if cache grows
  if (memoryCache.size > 1000) {
    const now = Date.now();
    memoryCache.forEach((v, k) => {
      if (now > v.expiresAt) {
        memoryCache.delete(k);
      }
    });
  }

  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearCache(): void {
  memoryCache.clear();
}

// ==========================================
// 2. In-Memory Rate Limiting
// ==========================================
interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per window
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute window

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export function checkRateLimit(
  identifier: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(identifier);

  if (!record) {
    record = { tokens: maxRequests - 1, lastRefill: now };
    rateLimitStore.set(identifier, record);
    return { allowed: true, remaining: record.tokens, resetInMs: windowMs };
  }

  const elapsed = now - record.lastRefill;
  if (elapsed >= windowMs) {
    record.tokens = maxRequests - 1;
    record.lastRefill = now;
    return { allowed: true, remaining: record.tokens, resetInMs: windowMs };
  }

  if (record.tokens > 0) {
    record.tokens -= 1;
    return { allowed: true, remaining: record.tokens, resetInMs: windowMs - elapsed };
  }

  return { allowed: false, remaining: 0, resetInMs: windowMs - elapsed };
}

export function clearRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Extracts a sanitized client identifier (IP or fallback session hash) from request headers.
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    return hashContent(`ip:${firstIp}`);
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return hashContent(`ip:${realIp}`);
  }
  return "anonymous-client";
}

// ==========================================
// 3. Privacy-Preserving Logger
// ==========================================
/**
 * Logs API activity without EVER logging user document content or PII.
 * References only request IDs, route name, status code, latency, and sha256 hashes.
 */
export function logSafeRequest(meta: {
  requestId: string;
  route: string;
  docHash?: string;
  statusCode: number;
  durationMs: number;
  cached?: boolean;
  errorMessage?: string;
}): void {
  const logPayload = {
    timestamp: new Date().toISOString(),
    requestId: meta.requestId,
    route: meta.route,
    docHash: meta.docHash ? `${meta.docHash.substring(0, 12)}...` : undefined,
    statusCode: meta.statusCode,
    durationMs: meta.durationMs,
    cached: meta.cached ?? false,
    error: meta.errorMessage ? meta.errorMessage : undefined,
  };

  // Structured sanitized output
  // eslint-disable-next-line no-console
  console.info(`[API_AUDIT] ${JSON.stringify(logPayload)}`);
}
