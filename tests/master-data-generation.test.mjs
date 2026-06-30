import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function loadGeneratorExports() {
  const filename = path.resolve("scripts/generate-master-data.cjs");
  const source = fs.readFileSync(filename, "utf8")
    .replace(/\nmain\(\)\.catch\([\s\S]*?\n\}\);\s*$/u, "\n");
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(filename),
    console,
    process
  }, { filename });
  return module.exports;
}

describe("master data generation", () => {
  it("maps wiki remodel material and reversible remodel costs into internal extra costs", () => {
    const { buildShipRemodelExtraCosts } = loadGeneratorExports();

    const shipData = {
      "Kaga Kai": {
        _api_id: 278,
        _name: "Kaga",
        _japanese_name: "加賀改",
        _remodel_to: "Kaga/Kai Ni"
      },
      "Kaga Kai Ni": {
        _api_id: 698,
        _name: "Kaga",
        _japanese_name: "加賀改二",
        _remodel_from: "Kaga/Kai",
        _remodel_development_material: 120,
        _remodel_to: "Kaga/Kai Ni E"
      },
      "Kaga Kai Ni E": {
        _api_id: 610,
        _name: "Kaga",
        _japanese_name: "加賀改二戊",
        _remodel_from: "Kaga/Kai Ni",
        _remodel_development_material: 88,
        _remodel_construction_material: 30
      },
      Johnston: {
        _api_id: 562,
        _name: "Johnston",
        _japanese_name: "Johnston",
        _remodel_to: "Johnston/Kai"
      },
      "Johnston Kai": {
        _api_id: 689,
        _name: "Johnston",
        _japanese_name: "Johnston改",
        _remodel_from: "Johnston/",
        _remodel_development_material: 80,
        _remodel_construction_material: 10
      },
      "Yamato Kai": {
        _api_id: 136,
        _name: "Yamato",
        _japanese_name: "大和改",
        _remodel_to: "Yamato/Kai Ni"
      },
      "Yamato Kai Ni": {
        _api_id: 911,
        _name: "Yamato",
        _japanese_name: "大和改二",
        _remodel_from: "Yamato/Kai",
        _remodel_boiler: 2
      },
      "Yamato Kai Ni Juu": {
        _api_id: 916,
        _name: "Yamato",
        _japanese_name: "大和改二重",
        _remodel_to: "Yamato/Kai Ni",
        _remodel_to_development_material: 50,
        _remodel_to_construction_material: 50
      }
    };

    expect(buildShipRemodelExtraCosts(shipData)).toEqual([
      { fromMasterId: 136, toMasterId: 911, materials: {}, slotItems: [{ masterId: 87, count: 2 }] },
      { fromMasterId: 278, toMasterId: 698, materials: { devmat: 120 }, slotItems: [] },
      { fromMasterId: 562, toMasterId: 689, materials: { buildKit: 10, devmat: 80 }, slotItems: [] },
      { fromMasterId: 698, toMasterId: 610, materials: { buildKit: 30, devmat: 88 }, slotItems: [] },
      { fromMasterId: 916, toMasterId: 911, materials: { buildKit: 50, devmat: 50 }, slotItems: [] }
    ]);
  });

  it("exports generated extra costs for Kaga and Yamato remodels", async () => {
    const generated = await import("../src/master/generated-data.js");

    expect(generated.SHIP_REMODEL_EXTRA_COSTS).toEqual(
      expect.arrayContaining([
        { fromMasterId: 278, toMasterId: 698, materials: { devmat: 120 }, slotItems: [] },
        { fromMasterId: 698, toMasterId: 610, materials: { buildKit: 30, devmat: 88 }, slotItems: [] },
        { fromMasterId: 646, toMasterId: 698, materials: { buildKit: 30, devmat: 60 }, slotItems: [] },
        { fromMasterId: 136, toMasterId: 911, materials: {}, slotItems: [{ masterId: 87, count: 2 }] }
      ])
    );
  });
});
