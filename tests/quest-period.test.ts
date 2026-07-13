import { describe, expect, it } from "vitest";
import { currentQuestPeriodKey } from "../src/kcsapi/quests.js";

describe("quest period keys", () => {
  it("rolls daily quests over at 05:00 JST", () => {
    expect(currentQuestPeriodKey("daily", Date.parse("2026-07-10T19:59:59.999Z"))).toBe("2026-07-10");
    expect(currentQuestPeriodKey("daily", Date.parse("2026-07-10T20:00:00.000Z"))).toBe("2026-07-11");
  });

  it("rolls weekly quests over on Monday at 05:00 JST", () => {
    expect(currentQuestPeriodKey("weekly", Date.parse("2026-07-12T19:59:59.999Z"))).toBe("2026-W28");
    expect(currentQuestPeriodKey("weekly", Date.parse("2026-07-12T20:00:00.000Z"))).toBe("2026-W29");
  });

  it("uses the ISO week-year across the New Year boundary", () => {
    expect(currentQuestPeriodKey("weekly", Date.parse("2025-12-28T19:59:59.999Z"))).toBe("2025-W52");
    expect(currentQuestPeriodKey("weekly", Date.parse("2025-12-28T20:00:00.000Z"))).toBe("2026-W01");
  });

  it("applies the same 05:00 JST boundary to monthly and quarterly quests", () => {
    expect(currentQuestPeriodKey("monthly", Date.parse("2026-07-31T19:59:59.999Z"))).toBe("2026-07");
    expect(currentQuestPeriodKey("monthly", Date.parse("2026-07-31T20:00:00.000Z"))).toBe("2026-08");
    expect(currentQuestPeriodKey("quarterly", Date.parse("2026-06-30T19:59:59.999Z"))).toBe("2026-Q2");
    expect(currentQuestPeriodKey("quarterly", Date.parse("2026-06-30T20:00:00.000Z"))).toBe("2026-Q3");
  });
});
