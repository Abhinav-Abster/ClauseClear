import {
  hashContent,
  buildCacheKey,
  getFromCache,
  setInCache,
  clearCache,
  checkRateLimit,
  clearRateLimits,
  logSafeRequest,
} from "@/lib/api-guard";

describe("API Guard: In-Memory Caching", () => {
  beforeEach(() => {
    clearCache();
  });

  it("hashes content deterministically using SHA-256", () => {
    const textA = "Oakridge Properties LLC residential lease agreement.";
    const textB = "Oakridge Properties LLC residential lease agreement.";
    const textC = "Pinnacle Housing Corp lease.";

    const hashA = hashContent(textA);
    const hashB = hashContent(textB);
    const hashC = hashContent(textC);

    expect(hashA).toHaveLength(64); // standard sha256 hex length
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it("stores and retrieves cached items", () => {
    const key = buildCacheKey("simplify", "hash123", "en");
    const mockData = { summary: "Test summary", sections: [] };

    expect(getFromCache(key)).toBeNull();

    setInCache(key, mockData, 5000);
    const cached = getFromCache<typeof mockData>(key);
    expect(cached).toEqual(mockData);
  });

  it("expires cached items after TTL passes", () => {
    const key = buildCacheKey("analyze", "hash456", "en");
    const mockData = { overallRiskLevel: "low" };

    // Set with negative/zero TTL
    setInCache(key, mockData, -100);
    expect(getFromCache(key)).toBeNull();
  });
});

describe("API Guard: Rate Limiting", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it("permits requests within quota and decrements tokens", () => {
    const clientId = "client-test-1";
    const limit = 5;
    const windowMs = 10000;

    const res1 = checkRateLimit(clientId, limit, windowMs);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(4);

    const res2 = checkRateLimit(clientId, limit, windowMs);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(3);
  });

  it("blocks requests that exceed the rate limit quota", () => {
    const clientId = "client-test-overflow";
    const limit = 3;
    const windowMs = 5000;

    checkRateLimit(clientId, limit, windowMs); // 2 remaining
    checkRateLimit(clientId, limit, windowMs); // 1 remaining
    const third = checkRateLimit(clientId, limit, windowMs); // 0 remaining
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = checkRateLimit(clientId, limit, windowMs);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.resetInMs).toBeGreaterThan(0);
  });
});

describe("API Guard: Privacy-Preserving Logger", () => {
  it("never logs document plaintext or PII", () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const sensitiveDoc = "My SSN is 000-11-2222 and my bank account is 987654321.";
    const docHash = hashContent(sensitiveDoc);

    logSafeRequest({
      requestId: "req-xyz-99",
      route: "/api/analyze",
      docHash,
      statusCode: 200,
      durationMs: 45,
      cached: false,
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedOutput = consoleSpy.mock.calls[0][0];

    // Assert that the raw sensitive string is NOT in the log
    expect(loggedOutput).not.toContain(sensitiveDoc);
    expect(loggedOutput).not.toContain("000-11-2222");
    expect(loggedOutput).not.toContain("987654321");

    // Assert that metadata and truncated hash ARE present
    expect(loggedOutput).toContain("req-xyz-99");
    expect(loggedOutput).toContain("/api/analyze");
    expect(loggedOutput).toContain(docHash.substring(0, 12));

    consoleSpy.mockRestore();
  });
});
