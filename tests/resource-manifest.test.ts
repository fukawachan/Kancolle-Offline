import path from "node:path";
import { describe, expect, it } from "vitest";
import { createResourceManifest } from "../src/resources/manifest.js";

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
  });
});
