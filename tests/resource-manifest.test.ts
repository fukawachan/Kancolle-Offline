import path from "node:path";
import { describe, expect, it } from "vitest";
import { createResourceManifest, resolveMappedResource } from "../src/resources/manifest.js";

describe("cached resource manifest", () => {
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
    expect(manifest.slot.card.get(1)).toMatchObject({
      id: 1,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/card\/0001_\d{4}\.png$/)
    });
    expect(manifest.slot.itemOn.get(1)).toMatchObject({
      id: 1,
      pathname: expect.stringMatching(/^\/kcs2\/resources\/slot\/item_on\/0001_\d{4}\.png$/)
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
});
