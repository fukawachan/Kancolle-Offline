import { describe, expect, it } from "vitest";
import {
  enemyTargetKind,
  INSTALLATION_ENEMY_MASTER_IDS
} from "../src/master/enemy-classification.js";

describe("enemy target classification", () => {
  it("classifies current normal-map installations by enemy master id", () => {
    expect(INSTALLATION_ENEMY_MASTER_IDS.has(1573)).toBe(true);
    expect(enemyTargetKind(1573, 10)).toBe("installation");
    expect(enemyTargetKind(1665, 9)).toBe("installation");
  });

  it("does not infer installation status from boss-like names or stype alone", () => {
    expect(enemyTargetKind(1597, 2)).toBe("surface");
    expect(enemyTargetKind(1545, 10)).toBe("surface");
  });

  it("keeps submarine classification separate from surface targets", () => {
    expect(enemyTargetKind(1530, 13)).toBe("submarine");
    expect(enemyTargetKind(1501, 2)).toBe("surface");
  });
});
