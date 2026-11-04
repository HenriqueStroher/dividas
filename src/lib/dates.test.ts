import { describe, expect, it } from "vitest";
import { formatDate, todayIso } from "./dates";

describe("todayIso", () => {
  it("usa o dia do Brasil, mesmo quando já é amanhã em UTC", () => {
    expect(todayIso(new Date("2026-11-05T01:30:00Z"))).toBe("2026-11-04");
    expect(todayIso(new Date("2026-11-05T03:30:00Z"))).toBe("2026-11-05");
  });
});

describe("formatDate", () => {
  it("formata no padrão brasileiro", () => {
    expect(formatDate("2026-01-09")).toBe("09/01/2026");
  });
});
