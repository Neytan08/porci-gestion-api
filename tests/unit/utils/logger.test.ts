import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

describe("pretty log metadata", () => {
  it("escapes user-controlled line breaks and control characters without changing JSON metadata", async () => {
    vi.stubEnv("LOG_FORMAT", "pretty");
    vi.stubEnv("LOG_FILES_ENABLED", "false");
    vi.resetModules();
    const { default: logger } = await import("../../../src/utils/logger");
    try {
      const formatter = logger.transports[0]?.format;
      if (!formatter) throw new Error("Expected a console formatter");
      const tag = "S1\r\nFORGED\tENTRY\u001b[31m\u0085\u2028\u2029";
      const record = {
        level: "info",
        message: "Created breeding sow",
        timestamp: "2024-01-01T00:00:00Z",
        sowTagNumber: tag,
        details: { tag },
        [Symbol.for("level")]: "info",
      };
      const formatted = formatter.transform(record, formatter.options);
      if (typeof formatted !== "object") throw new Error("Expected a formatted log record");
      const output = formatted[Symbol.for("message")];
      expect(output).toEqual(expect.any(String));
      expect(output).not.toMatch(/[\r\n\t\u0085\u2028\u2029]/);
      expect(output).toContain("S1\\r\\nFORGED\\tENTRY\\u001b[31m");
      expect(formatted.sowTagNumber).toBe(tag);
      expect(formatted.details).toEqual({ tag });
    } finally {
      logger.close();
    }
  });
});
