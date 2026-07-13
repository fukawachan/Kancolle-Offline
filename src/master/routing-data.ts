import { createRequire } from "node:module";
import {
  compileRoutingPredicate,
  inferRoutingRuleEvidence,
  routingPredicateDiagnostics,
  type RoutingDiagnostic,
  type RoutingEvidenceLevel,
  type RoutingMap
} from "./routing.js";

type GeneratedRoutingData = {
  generatedAt: string;
  sources: Record<string, string>;
  maps: RoutingMap[];
};

const require = createRequire(import.meta.url);
const GENERATED = require("./routing-data.generated.json") as GeneratedRoutingData;
const MAPS = GENERATED.maps.map(prepareRoutingMap);
const MAP_BY_ID = new Map(MAPS.map((map) => [map.mapId, map]));

export type NormalRoutingDiagnostic = RoutingDiagnostic & {
  mapId: number;
  from: string;
  ruleIndex: number;
  revision: number;
  source?: string;
};

export function normalRoutingMaps() {
  return MAPS;
}

export function normalRoutingMap(areaId: number, mapNo: number) {
  return MAP_BY_ID.get(Math.trunc(areaId) * 10 + Math.trunc(mapNo));
}

export function normalRoutingDiagnostics(): NormalRoutingDiagnostic[] {
  return MAPS.flatMap((map) => Object.entries(map.branches).flatMap(([from, rules]) =>
    rules.flatMap((rule, ruleIndex) => (rule.diagnostics ?? []).map((diagnostic) => ({
      ...diagnostic,
      mapId: map.mapId,
      from,
      ruleIndex,
      revision: map.revision,
      ...(map.source ? { source: map.source } : {})
    })))
  ));
}

export function normalRoutingEvidenceCounts() {
  const counts: Record<RoutingEvidenceLevel, number> = {
    exact: 0,
    statistical: 0,
    inferred: 0,
    fallback: 0
  };
  for (const map of MAPS) {
    for (const rule of Object.values(map.branches).flat()) {
      counts[rule.evidence?.level ?? "exact"] += 1;
    }
  }
  return counts;
}

function prepareRoutingMap(map: RoutingMap): RoutingMap {
  const prepared = {
    ...map,
    branches: Object.fromEntries(Object.entries(map.branches).map(([from, rules]) => {
      const preparedRules = rules.flatMap((rule) => {
        const correction = correctKnownGeneratedRule(map.mapId, map.revision, from, rule);
        const correctedRules = correction == null
          ? []
          : Array.isArray(correction)
            ? correction
            : [correction];
        return correctedRules.map((corrected) => {
          const diagnostics = corrected.when ? routingPredicateDiagnostics(corrected.when) : [];
          const when = corrected.when && diagnostics.length === 0
            ? compileRoutingPredicate(corrected.when)
            : corrected.when;
          return {
            ...corrected,
            ...(when ? { when } : {}),
            evidence: normalizedGeneratedEvidence(corrected, map.revision),
            ...(diagnostics.length > 0 ? { diagnostics } : {})
          };
        });
      });
      return [from, preparedRules];
    }))
  };

  const diagnostics = Object.entries(prepared.branches).flatMap(([from, rules]) =>
    rules.flatMap((rule, ruleIndex) => (rule.diagnostics ?? []).map((diagnostic) => ({
      ...diagnostic,
      from,
      ruleIndex
    })))
  );
  if (diagnostics.length > 0) {
    const detail = diagnostics
      .map((diagnostic) => `${diagnostic.from}[${diagnostic.ruleIndex}]: ${diagnostic.term}`)
      .join("; ");
    throw new Error(`Routing map ${map.mapId} revision ${map.revision} contains uncompiled predicates: ${detail}`);
  }
  return prepared;
}

function normalizedGeneratedEvidence(
  rule: RoutingMap["branches"][string][number],
  revision: number
) {
  // Evidence written by an older generator is derived data. Recompute it so
  // qualitative "random" rows whose equal weights are only an approximation
  // become fallback evidence instead of retaining a stale statistical label.
  // A correction with a distinct annotated source is deliberate and retained.
  if (rule.evidence?.source && rule.evidence.source !== rule.source) {
    return { ...rule.evidence, revision };
  }
  return inferRoutingRuleEvidence(rule, revision);
}

/**
 * Corrections for ambiguous prose in the pinned generated snapshot.
 *
 * These are deliberately keyed by map/branch and source text: a future source
 * revision with new prose will miss this table and fail closed above rather
 * than silently treating an unknown condition as false.
 */
function correctKnownGeneratedRule(
  mapId: number,
  revision: number,
  from: string,
  rule: RoutingMap["branches"][string][number]
): RoutingMap["branches"][string][number] | RoutingMap["branches"][string] | null {
  const source = rule.source ?? "";

  if (
    mapId === 12
    && from === "Start"
    && rule.when?.wiki === "舰队船数"
    && source.startsWith("舰队船数去A概率")
  ) {
    return [
      countTableRule("fleet", { gte: 1, lte: 3 }, { A: 70, B: 30 }, source),
      countTableRule("fleet", { eq: 4 }, { A: 60, B: 40 }, source),
      countTableRule("fleet", { eq: 5 }, { A: 50, B: 50 }, source),
      countTableRule("fleet", { eq: 6 }, { A: 40, B: 60 }, source)
    ];
  }
  if (
    mapId === 23
    && from === "D"
    && rule.when?.wiki === "DD+DE数量"
    && source.startsWith("DD+DE数量 去F概率")
  ) {
    return [
      countTableRule("DD+DE", { lte: 1 }, { F: 65, G: 35 }, source),
      countTableRule("DD+DE", { eq: 2 }, { F: 50, G: 50 }, source),
      countTableRule("DD+DE", { eq: 3 }, { F: 35, G: 65 }, source),
      countTableRule("DD+DE", { gte: 4 }, { F: 20, G: 80 }, source)
    ];
  }
  if (
    mapId === 23
    && from === "G"
    && rule.when?.wiki === "DD+DE数量"
    && source.startsWith("DD+DE数量 去I概率")
  ) {
    return [
      countTableRule("DD+DE", { eq: 0 }, { I: 0, K: 100 }, source),
      countTableRule("DD+DE", { gte: 1, lte: 2 }, { I: 35, K: 65 }, source),
      countTableRule("DD+DE", { gte: 3 }, { I: 45, K: 55 }, source)
    ];
  }
  if (
    mapId === 42
    && from === "Start"
    && rule.when?.wiki === "DD+DE数量"
    && source.startsWith("DD+DE数量 去A概率")
  ) {
    return [
      countTableRule("DD+DE", { eq: 0 }, { A: 9.96, B: 90.04 }, source),
      countTableRule("DD+DE", { eq: 1 }, { A: 17.2, B: 82.8 }, source),
      countTableRule("DD+DE", { eq: 2 }, { A: 57.72, B: 42.28 }, source),
      countTableRule("DD+DE", { eq: 3 }, { A: 71.69, B: 28.31 }, source),
      countTableRule("DD+DE", { eq: 4 }, { A: 86.06, B: 13.94 }, source),
      countTableRule("DD+DE", { eq: 5 }, { A: 91.44, B: 8.56 }, source),
      countTableRule("DD+DE", { eq: 6 }, { A: 91.14, B: 8.86 }, source)
    ];
  }

  if (mapId === 25 && from === "J" && source.startsWith("42~49之间随机去H")) {
    return {
      ...rule,
      when: { los: { coefficient: 1, gte: 42, lt: 49 } },
      evidence: {
        level: "fallback",
        source: `${source} (published monotonic tendency, no exact probability)`,
        revision
      }
    };
  }
  if (mapId === 42 && from === "G" && source.includes("另有7条")) {
    // This observation follows an unconditional DD+DE<=1 fallback to F and is
    // not a separate predicate. Compiling it as one only made an unreachable,
    // unsupported rule.
    return null;
  }
  if (mapId === 44 && from === "E" && source.includes("SS系>=5(4?)")) {
    return {
      ...rule,
      when: {
        countExpressions: [
          { terms: [{ shipType: "DD" }, { shipType: "DE" }], count: { lte: 1 } },
          { terms: [{ shipType: "SS系" }], count: { gte: 5 } }
        ]
      },
      evidence: {
        level: "inferred",
        source: `${source} (conservative published threshold 5; source notes possible 4)`,
        revision
      }
    };
  }
  if (mapId === 44 && from === "E" && source.includes("其余随机去I/G")) {
    return {
      ...rule,
      weights: { I: 1, G: 1 },
      evidence: {
        level: "fallback",
        source: `${source} (destinations published; exact probability unknown)`,
        revision
      }
    };
  }
  if (mapId === 51 && from === "G" && source.includes("[高速+]或以上")) {
    return {
      ...rule,
      when: {
        all: [
          { shipTypes: { "CA系": { gte: 2 } } },
          { speedAtLeast: "fastPlus" }
        ]
      }
    };
  }
  if (mapId === 52 && from === "G" && source.startsWith("随机去J/L")) {
    return {
      ...rule,
      when: undefined,
      evidence: {
        level: "fallback",
        source: `${source} (no published exact probability; equal deterministic routing)`,
        revision
      }
    };
  }
  if (mapId === 52 && from === "L" && source.includes("目前没有去N的记录")) {
    // Absence of observations is not a positive routing condition.
    return null;
  }
  if (mapId === 53 && from === "G" && source.startsWith("低速BB>=2")) {
    return {
      ...rule,
      when: {
        shipTypeSpeedCounts: [{ shipType: "BB", speed: "slow", count: { gte: 2 } }]
      }
    };
  }
  if (mapId === 53 && from === "J" && source.includes("DD<=1 随机去L/N")) {
    return { ...rule, when: { wiki: "CVL=1 且 DD<=1" } };
  }
  if (mapId === 62 && from === "H" && source.includes("样本太少索敌边界不明")) {
    return {
      ...rule,
      when: { los: { coefficient: 3, gte: 40 } },
      evidence: {
        level: "inferred",
        source: `${source} (provisional Cn3 LoS >= 40 boundary)`,
        revision
      }
    };
  }
  return rule;
}

function countTableRule(
  expression: "fleet" | "DD+DE",
  count: { eq?: number; gte?: number; lte?: number },
  weights: Record<string, number>,
  source: string
): RoutingMap["branches"][string][number] {
  return {
    when: expression === "fleet"
      ? { fleetSize: count }
      : {
          countExpressions: [{
            terms: [{ shipType: "DD" }, { shipType: "DE" }],
            count
          }]
        },
    weights,
    source
  };
}
