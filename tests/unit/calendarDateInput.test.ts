import { describe, expect, it } from "vitest";
import { parseCalendarDateInput } from "../../src/utils/calendarDateInput";

describe("calendar date input", () => {
  it.each([
    "2/29/2024",
    "2024-02-29",
    "2024-02-29T23:30:00-06:00",
  ])("preserves the supplied calendar day for %s", (input) => {
    expect(parseCalendarDateInput(input)?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });
  it.each([
    "",
    "2023-02-29",
    "29/2/2024",
    "2024-01-01T12:00:00",
    "2024-01-01T12:00:00+15:00",
  ])("rejects invalid input %j", (input) => {
    expect(parseCalendarDateInput(input)).toBeNull();
  });
});
