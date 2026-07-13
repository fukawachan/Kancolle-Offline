import { describe, expect, it } from "vitest";
import {
  IMPROVEMENT_SUCCESS_RATE_EVIDENCE,
  improvementSuccessRate
} from "../src/kcsapi/improvement.js";
import {
  improvementDataEvidence,
  improvementSourceEvidence
} from "../src/master/improvement-data.js";

describe("Akashi improvement success rates", () => {
  it("guarantees ordinary Akashi improvements from +0 through +3", () => {
    for (let level = 0; level <= 3; level += 1) {
      expect(improvementSuccessRate(level, false)).toBe(1);
    }
  });

  it("does not extend the ordinary Akashi guarantee to +4", () => {
    expect(improvementSuccessRate(4, false)).toBe(0.95);
    expect(improvementSuccessRate(4, true)).toBe(1);
  });

  it("uses the published ordinary and Kai tables through conversion", () => {
    expect(Array.from({ length: 11 }, (_, level) => improvementSuccessRate(level, false)))
      .toEqual([1, 1, 1, 1, 0.95, 0.9, 0.8, 0.77, 0.72, 0.6, 0.5]);
    expect(Array.from({ length: 11 }, (_, level) => improvementSuccessRate(level, true)))
      .toEqual([1, 1, 1, 1, 1, 0.95, 0.9, 0.82, 0.77, 0.67, 0.62]);
    expect(IMPROVEMENT_SUCCESS_RATE_EVIDENCE.level).toBe("community-statistical");
  });
});

describe("improvement recipe coverage", () => {
  it("fails closed and explicitly labels all 40 cross-check-only sources", () => {
    expect(improvementDataEvidence.policy).toBe("fail-closed-cross-check-only-sources");
    expect(improvementDataEvidence.unavailableSourceMasterIds).toHaveLength(40);
    expect(improvementDataEvidence.unavailableSourceMasterIds).toContain(57);
    expect(improvementDataEvidence.unavailableSourceMasterIds).toContain(553);
    for (const masterId of improvementDataEvidence.unavailableSourceMasterIds) {
      expect(improvementSourceEvidence(masterId)).toEqual({
        availability: "unavailable",
        evidence: "cross-check-only-unverified"
      });
    }
  });

  it("distinguishes parsed, cross-check-only, and unknown equipment", () => {
    expect(improvementSourceEvidence(2).availability).toBe("available");
    expect(improvementSourceEvidence(57).availability).toBe("unavailable");
    expect(improvementSourceEvidence(999_999).availability).toBe("unknown");
  });
});
