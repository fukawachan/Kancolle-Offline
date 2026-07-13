import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildShipMasters,
  buildSlotMasters,
  masterAssetClosureReport
} from "../src/master/catalog.js";
import { masterData } from "../src/master/data.js";
import { normalRoutingMaps } from "../src/master/routing-data.js";
import { createResourceManifest, resolveMappedResource } from "../src/resources/manifest.js";

describe("cached resource manifest", () => {
  it("exposes known masters, using typed equipment-art fallbacks, and reports snapshot drift", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));
    const ships = buildShipMasters(manifest);
    const slots = buildSlotMasters(manifest);
    const report = masterAssetClosureReport(manifest);

    expect(ships).toHaveLength(961);
    expect(slots).toHaveLength(643);
    expect(ships.some((ship) => String(ship.api_name).startsWith("Ship "))).toBe(false);
    expect(slots.some((slot) => String(slot.api_name).startsWith("Equipment "))).toBe(false);
    expect(report.shipMastersWithoutDisplayResources).toEqual([
      743, 744, 745, 982, 1031, 1033, 1034, 1035, 1040
    ]);
    expect(report.slotMastersWithoutDisplayResources).toEqual([
      547, 548, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 1990
    ]);
    expect(report.shipResourcesWithoutMasters).toHaveLength(711);
    expect(report.slotResourcesWithoutMasters).toEqual([]);
    expect(report.exposedSlotIds).toEqual(expect.arrayContaining([
      547, 548, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 1990
    ]));
    expect(new Set(report.exposedShipIds).size).toBe(report.exposedShipIds.length);
    expect(new Set(report.exposedSlotIds).size).toBe(report.exposedSlotIds.length);
  });

  it("derives ship, furniture, and BGM mappings from the cache index without writing into cache", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    expect(manifest.ship.full.get(6)).toMatchObject({
      id: 6,
      frame: "7134",
      filename: "kksiqffpclxh",
      pathname: "/kcs2/resources/ship/full/0006_7134_kksiqffpclxh.png",
      version: "28"
    });
    expect(manifest.ship.albumStatus.get(6)).toMatchObject({
      id: 6,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/ship\/album_status\/0006_\d{4}\.png$/)
    });
    expect(manifest.ship.card.get(6)).toMatchObject({
      id: 6,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/ship\/card\/0006_\d{4}\.png$/)
    });
    expect(manifest.ship.characterUp.get(131)).toMatchObject({
      id: 131,
      frame: "7543",
      pathname: "/kcs2/resources/ship/character_up/0131_7543.png"
    });
    expect(manifest.ship.characterUpDamaged.get(131)).toMatchObject({
      id: 131,
      frame: "3346",
      pathname: "/kcs2/resources/ship/character_up_dmg/0131_3346.png"
    });
    expect(resolveMappedResource("/kcs2/resources/ship/power_up/0131_5449.png", manifest)).toMatchObject({
      id: 131,
      frame: "7543",
      pathname: "/kcs2/resources/ship/character_up/0131_7543.png"
    });
    expect(resolveMappedResource("/kcs2/resources/ship/power_up_dmg/0131_0000.png", manifest)).toMatchObject({
      id: 131,
      frame: "3346",
      pathname: "/kcs2/resources/ship/character_up_dmg/0131_3346.png"
    });
    expect(resolveMappedResource("/kcs2/resources/ship/sp_remodel/silhouette/0698_4471.png", manifest)).toBeUndefined();
    expect(resolveMappedResource("/kcs2/resources/ship/sp_remodel/full_x2/0698_0000.png", manifest)).toBeUndefined();
    expect(manifest.slot.card.get(1)).toMatchObject({
      id: 1,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/card\/0001_\d{4}\.png$/)
    });
    expect(manifest.slot.itemOn.get(1)).toMatchObject({
      id: 1,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/item_on\/0001_\d{4}\.png$/)
    });
    expect(manifest.slot.remodel.get(199)).toMatchObject({
      id: 199,
      frame: "9077",
      pathname: "/kcs2/resources/slot/remodel/0199_9077.png"
    });
    expect(resolveMappedResource("/kcs2/resources/slot/remodel/0199_0000.png", manifest)).toMatchObject({
      id: 199,
      frame: "9077"
    });
    expect(manifest.slot.btxtFlat.get(7)).toMatchObject({
      id: 7,
      frame: "2591",
      pathname: "/kcs2/resources/slot/btxt_flat/0007_2591.png"
    });
    expect(resolveMappedResource("/kcs2/resources/slot/btxt_flat/0007_0000.png", manifest)).toMatchObject({
      id: 7,
      frame: "2591"
    });
    expect(resolveMappedResource("/kcs2/resources/slot/btxt_flat/0103_0000.png", manifest)).toMatchObject({
      extension: "png",
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/btxt_flat\/\d{4}_\d{4}\.png$/)
    });
    expect(manifest.furniture.normal.get(1)).toMatchObject({
      id: 1,
      frame: "8807",
      pathname: "/kcs2/resources/furniture/normal/001_8807.png"
    });
    expect(manifest.furniture.normal.has(6)).toBe(false);
    expect(manifest.furniture.movable.get(6)).toMatchObject({
      id: 6,
      frame: "3938",
      pathname: "/kcs2/resources/furniture/movable/006_3938.png"
    });
    expect(manifest.furniture.scripts.get(6)).toMatchObject({
      id: 6,
      frame: "8280",
      pathname: "/kcs2/resources/furniture/scripts/006_8280.json"
    });
    expect(manifest.furniture.picture.get(280)).toMatchObject({
      id: 280,
      frame: "5376",
      pathname: "/kcs2/resources/furniture/picture/280_5376.png"
    });
    expect(manifest.furniture.outside.get("1-1")).toMatchObject({
      id: 1,
      frame: "1",
      pathname: "/kcs2/resources/furniture/outside/window_bg_1-1.png"
    });
    expect(resolveMappedResource("/kcs2/resources/furniture/normal/038_0000.png", manifest)).toMatchObject({
      id: 38,
      frame: "1261"
    });
    expect(resolveMappedResource("/kcs2/resources/furniture/picture/280_0000.png", manifest)).toMatchObject({
      id: 280,
      frame: "5376"
    });
    expect(resolveMappedResource("/kcs2/resources/furniture/outside/window_bg_1-1.png", manifest)).toMatchObject({
      id: 1,
      frame: "1"
    });
    expect(manifest.bgm.port.get(0)).toMatchObject({
      id: 0,
      frame: "7138",
      pathname: "/kcs2/resources/bgm/port/000_7138.mp3"
    });
    expect(manifest.bgm.port.has(1)).toBe(false);
    expect(manifest.bgm.battle.get(155)).toMatchObject({
      id: 155,
      frame: "2953",
      pathname: "/kcs2/resources/bgm/battle/155_2953.mp3"
    });
    expect(manifest.bgm.fanfare.get(1)).toMatchObject({
      id: 1,
      frame: "7793",
      pathname: "/kcs2/resources/bgm/fanfare/001_7793.mp3"
    });
    expect(resolveMappedResource("/kcs2/resources/bgm/battle/155_0000.mp3", manifest)).toMatchObject({
      id: 155,
      frame: "2953"
    });
    expect(resolveMappedResource("/kcs2/resources/bgm/battle/000_1633.mp3", manifest)).toMatchObject({
      id: 1,
      frame: "6601"
    });
    expect(resolveMappedResource("/kcs2/resources/bgm/fanfare/001_0000.mp3", manifest)).toMatchObject({
      id: 1,
      frame: "7793"
    });
    expect(manifest.map.thumbnail.get(11)).toMatchObject({
      id: 11,
      areaId: 1,
      mapNo: 1,
      frame: "01",
      pathname: "/kcs2/resources/map/001/01.png"
    });
    expect(manifest.map.info.get(11)).toMatchObject({
      id: 11,
      areaId: 1,
      mapNo: 1,
      frame: "01",
      pathname: "/kcs2/resources/map/001/01_info.json",
      extension: "json"
    });
    expect(manifest.map.image.get(11)).toMatchObject({
      id: 11,
      areaId: 1,
      mapNo: 1,
      frame: "01",
      pathname: "/kcs2/resources/map/001/01_image.png"
    });
  });

  it("falls back from missing slot remodel art to a cached image for the equipment type", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    expect(manifest.slot.remodel.has(1990)).toBe(false);
    const sb2uFallback = resolveMappedResource("/kcs2/resources/slot/remodel/1990_6668.png", manifest);
    expect(sb2uFallback).toMatchObject({
      id: 23,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/remodel\/0023_\d{4}\.png$/)
    });
    expect(slotIconType(sb2uFallback?.id)).toBe(7);

    expect(manifest.slot.remodel.has(548)).toBe(false);
    const jetFighterFallback = resolveMappedResource("/kcs2/resources/slot/remodel/0548_0000.png", manifest);
    expect(jetFighterFallback).toMatchObject({
      id: 19,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/remodel\/0019_\d{4}\.png$/)
    });
    expect(slotIconType(jetFighterFallback?.id)).toBe(6);
  });

  it("falls back from missing slot item-up art to a cached image for the equipment type", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    expect(manifest.slot.itemUp.has(570)).toBe(false);
    const tomonagaFallback = resolveMappedResource("/kcs2/resources/slot/item_up/0570_1119.png", manifest);
    expect(tomonagaFallback).toMatchObject({
      extension: "png",
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/item_up\/\d{4}_\d{4}\.png$/)
    });
    expect(tomonagaFallback?.id).not.toBe(570);
    expect(slotIconType(tomonagaFallback?.id)).toBe(slotIconType(570));

    expect(resolveMappedResource("/kcs2/resources/slot/item_up/0568_0000.png", manifest)).toMatchObject({
      id: 568,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/item_up\/0568_\d{4}\.png$/)
    });
  });

  it("can resolve slot remodel art for every start2 equipment master", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    for (const slot of buildSlotMasters(manifest)) {
      const id = Number(slot.api_id);
      const resource = resolveMappedResource(`/kcs2/resources/slot/remodel/${String(id).padStart(4, "0")}_0000.png`, manifest);

      expect(resource, `${id} ${slot.api_name}`).toMatchObject({
        extension: "png",
        pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/remodel\/\d{4}_\d{4}\.png$/)
      });
    }
  });

  it("resolves every display kind needed by persisted missing-art equipment", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    for (const id of [547, 570, 1990]) {
      for (const kind of ["card", "card_t", "item_on", "item_up", "remodel"]) {
        const resource = resolveMappedResource(
          `/kcs2/resources/slot/${kind}/${String(id).padStart(4, "0")}_0000.png`,
          manifest
        );
        expect(resource, `${id} ${kind}`).toMatchObject({
          extension: "png",
          pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/.+\/\d{4}_\d{4}\.png$/)
        });
      }
    }
  });

  it("derives ship voice availability from cache-backed sound files", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));

    const fubuki = manifest.voice.byShipId.get(9);
    expect(fubuki).toMatchObject({
      shipId: 9,
      key: "gyckjmemgqoe"
    });
    expect(fubuki?.availableVoiceNos.has(1)).toBe(true);
    expect(fubuki?.availableVoiceNos.has(28)).toBe(true);
    expect(fubuki?.availableVoiceNos.has(29)).toBe(false);
    expect(fubuki?.files.has("105230")).toBe(false);

    const ship179 = manifest.voice.byShipId.get(179);
    expect(ship179).toMatchObject({
      shipId: 179,
      key: "qgkjswznylty"
    });
    expect(ship179?.availableVoiceNos.has(18)).toBe(true);
    expect(ship179?.availableVoiceNos.has(29)).toBe(true);
    expect(ship179?.files.has("105230")).toBe(true);
  });

  it("derives official special-remodel resources when they are present in the cache index", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-sp-remodel-manifest-"));
    try {
      await writeFile(path.join(tempDir, "cached.json"), JSON.stringify({
        "/kcs2/resources/ship/sp_remodel/silhouette/0698_4471.png": { version: "?version=62" },
        "/kcs2/resources/ship/sp_remodel/full_x2/0698_3344.png": { version: "?version=62" },
        "/kcs2/resources/ship/sp_remodel/text_remodel_mes/0278_1783.png": { version: "?version=62" },
        "/kcs2/resources/ship/sp_remodel/text_class/0698_1234.png": { version: "?version=62" },
        "/kcs2/resources/ship/sp_remodel/text_name/0698_5678.png": { version: "?version=62" },
        "/kcs2/resources/ship/sp_remodel/animation_key/0698_remodel.json": { version: "?version=62" }
      }));

      const manifest = await createResourceManifest(tempDir);

      expect(manifest.ship.spRemodel.silhouette.get(698)).toMatchObject({
        id: 698,
        frame: "4471",
        pathname: "/kcs2/resources/ship/sp_remodel/silhouette/0698_4471.png"
      });
      expect(manifest.ship.spRemodel.fullX2.get(698)).toMatchObject({
        id: 698,
        frame: "3344"
      });
      expect(manifest.ship.spRemodel.textRemodelMessage.get(278)).toMatchObject({
        id: 278,
        frame: "1783"
      });
      expect(manifest.ship.spRemodel.textClass.get(698)).toMatchObject({
        id: 698,
        frame: "1234"
      });
      expect(manifest.ship.spRemodel.textName.get(698)).toMatchObject({
        id: 698,
        frame: "5678"
      });
      expect(manifest.ship.spRemodel.animationKey.get(698)).toMatchObject({
        id: 698,
        frame: "remodel",
        extension: "json"
      });
      expect(resolveMappedResource("/kcs2/resources/ship/sp_remodel/silhouette/0698_0000.png", manifest)).toMatchObject({
        id: 698,
        frame: "4471"
      });
      expect(resolveMappedResource("/kcs2/resources/ship/sp_remodel/animation_key/0698_remodel.json", manifest)).toMatchObject({
        id: 698,
        extension: "json"
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("merges normal-map info variants for multi-stage maps", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));
    const sevenFiveSpots = manifest.map.spots.get(75) ?? [];

    expect(sevenFiveSpots.map((spot) => spot.no)).toEqual(Array.from({ length: 26 }, (_, index) => index));
  });

  it("contains every topology edge number across all normal-map resource variants", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));
    const rulesOnlyMaps: number[] = [];

    for (const map of normalRoutingMaps()) {
      if (!manifest.map.spots.has(map.mapId)) {
        rulesOnlyMaps.push(map.mapId);
        continue;
      }
      const spotNos = new Set((manifest.map.spots.get(map.mapId) ?? []).map((spot) => spot.no));
      for (const edge of map.edges) {
        expect(spotNos.has(edge.no), `map ${map.mapId} contains edge ${edge.no}`).toBe(true);
      }
    }
    // 5-6 is available to the 2026 rules validator, but the bundled 6.2.3.1
    // client predates its map assets and therefore hides it by profile.
    expect(rulesOnlyMaps).toEqual([56]);
  });
});

function slotIconType(slotId: number | undefined) {
  return masterData.api_mst_slotitem.find((slot) => slot.api_id === slotId)?.api_type[2];
}
