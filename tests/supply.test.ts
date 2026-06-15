import { describe, expect, it } from "vitest";
import { battleSupplyCost } from "../src/kcsapi/supply.js";

describe("battle supply consumption", () => {
  it("uses 20 percent of maximum fuel and ammo for a daytime battle", () => {
    expect(battleSupplyCost(15, 20, false)).toEqual({ fuel: 3, ammo: 4 });
    expect(battleSupplyCost(65, 75, false)).toEqual({ fuel: 13, ammo: 15 });
  });

  it("uses 20 percent fuel and rounded-up 30 percent ammo after pursuing at night", () => {
    expect(battleSupplyCost(15, 15, true)).toEqual({ fuel: 3, ammo: 5 });
    expect(battleSupplyCost(65, 75, true)).toEqual({ fuel: 13, ammo: 23 });
  });
});
