import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateAge } from "../../../src/utils/getAgeFromDate";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("age in completed UTC calendar months", () => {
  it.each([
    ["2024-06-14T12:00:00Z", "2023-06-15", 0, 11],
    ["2024-06-15T12:00:00Z", "2023-06-15", 1, 0],
    ["2024-02-29T12:00:00Z", "2024-01-31", 0, 0],
    ["2024-03-01T12:00:00Z", "2024-01-31", 0, 1],
    ["2025-03-01T12:00:00Z", "2024-02-29", 1, 0],
  ])("at %s for birth %s", (now, birth, years, months) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    expect(calculateAge(new Date(birth))).toEqual({ years, months });
  });
  it("uses the UTC day even when the server local day differs", () => {
    vi.stubEnv("TZ", "America/Costa_Rica");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-06-15T01:00:00Z"));
    expect(calculateAge(new Date("2023-06-15"))).toEqual({ years: 1, months: 0 });
  });
});
