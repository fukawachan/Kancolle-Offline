import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PORT_BGM_ID,
  type CachedResourceMeta,
  type FileResource,
  type MapFileResource,
  type MapSpot,
  type ResourceManifest
} from "./types.js";

type CacheIndex = Record<string, CachedResourceMeta>;

const VOICE_FILE_HASHES = [
  2475, 6547, 1471, 8691, 7847, 3595, 1767, 3311, 2507, 9651, 5321, 4473, 7117, 5947, 9489, 2669,
  8741, 6149, 1301, 7297, 2975, 6413, 8391, 9705, 2243, 2091, 4231, 3107, 9499, 4205, 6013, 3393,
  6401, 6985, 3683, 9447, 3287, 5181, 7587, 9353, 2135, 4947, 5405, 5223, 9457, 5767, 9265, 8191,
  3927, 3061, 2805, 3273, 7331
] as const;

export async function createResourceManifest(cacheDir: string): Promise<ResourceManifest> {
  const resolvedCacheDir = path.resolve(cacheDir);
  const index = await readCacheIndex(resolvedCacheDir);
  const manifest = emptyManifest();

  for (const [pathname, meta] of Object.entries(index)) {
    addShipResource(manifest, resolvedCacheDir, pathname, meta);
    addSlotResource(manifest, resolvedCacheDir, pathname, meta);
    addFurnitureResource(manifest, resolvedCacheDir, pathname, meta);
    addBgmResource(manifest, resolvedCacheDir, pathname, meta);
    addMapResource(manifest, resolvedCacheDir, pathname, meta);
    addVoiceResource(manifest, pathname);
  }

  attachShipVoiceResources(manifest);
  await attachMapInfoResources(manifest);

  return manifest;
}

export function voiceFileName(shipId: number, voiceNo: number): string {
  const hash = VOICE_FILE_HASHES[voiceNo - 1];
  if (!hash) return String(voiceNo);
  return String((17 * (shipId + 7) * hash) % 0x18365 + 0x186a0);
}

export function resolveMappedResource(pathname: string, manifest: ResourceManifest): FileResource | undefined {
  const ship = pathname.match(/^\/kcs2\/resources\/ship\/full\/(\d{4})_(\d{4})_[^/]+\.png$/i);
  if (ship) {
    const resource = manifest.ship.full.get(Number(ship[1]));
    if (resource && (resource.frame === ship[2] || !ship[2])) return resource;
    return resource;
  }

  const spRemodelShipArt = pathname.match(/^\/kcs2\/resources\/ship\/sp_remodel\/(silhouette|full_x2)\/(\d{4})_(\d{4})\.png$/i);
  if (spRemodelShipArt) {
    return shipArtFallback(manifest, Number(spRemodelShipArt[2]));
  }

  const shipImage = pathname.match(/^\/kcs2\/resources\/ship\/(album_status|banner|card|character_up|character_up_dmg|power_up|power_up_dmg)\/(\d{4})_(\d{4})\.png$/i);
  if (shipImage) {
    const collection = shipCollection(manifest, shipImage[1]);
    return collection?.get(Number(shipImage[2]));
  }

  const slot = pathname.match(/^\/kcs2\/resources\/slot\/(card|card_t|btxt_flat|item_on|item_up)\/(\d{4})_(\d{4})\.png$/i);
  if (slot) {
    const collection = slotCollection(manifest, slot[1]);
    const id = Number(slot[2]);
    const resource = collection?.get(id);
    if (resource) return resource;
    return slot[1].toLowerCase() === "btxt_flat" && collection ? firstResource(collection) : undefined;
  }

  const furniture = pathname.match(/^\/kcs2\/resources\/furniture\/(normal|movable|scripts|thumbnail|picture)\/(\d{3})_\d{4}\.(png|json)$/i);
  if (furniture) {
    const kind = furniture[1].toLowerCase();
    const id = Number(furniture[2]);
    const collection = furnitureCollection(manifest, kind);
    const direct = collection?.get(id);
    if (direct) return direct;
    if (kind === "normal") {
      return manifest.furniture.normal.get(id) || manifest.furniture.movable.get(id) || manifest.furniture.thumbnail.get(id);
    }
    return undefined;
  }

  const furnitureOutside = pathname.match(/^\/kcs2\/resources\/furniture\/outside\/window_bg_(\d+)-(\d+)\.png$/i);
  if (furnitureOutside) {
    return manifest.furniture.outside.get(`${Number(furnitureOutside[1])}-${Number(furnitureOutside[2])}`);
  }

  const portBgm = pathname.match(/^\/kcs2\/resources\/bgm\/port\/(\d{3})_\d{4}\.mp3$/i);
  if (portBgm) {
    const id = Number(portBgm[1]);
    if (id === 0) return manifest.bgm.port.get(0);
    return manifest.bgm.port.get(id) || defaultPortBgmResource(manifest);
  }

  const bgm = pathname.match(/^\/kcs2\/resources\/bgm\/(battle|fanfare)\/(\d{3})_\d{4}\.mp3$/i);
  if (bgm) {
    const collection = bgm[1].toLowerCase() === "battle" ? manifest.bgm.battle : manifest.bgm.fanfare;
    const id = Number(bgm[2]);
    return collection.get(id) || (id === 0 ? firstResource(collection) : undefined);
  }

  return undefined;
}

function emptyManifest(): ResourceManifest {
  return {
    ship: {
      albumStatus: new Map(),
      banner: new Map(),
      card: new Map(),
      characterUp: new Map(),
      characterUpDamaged: new Map(),
      full: new Map()
    },
    slot: {
      card: new Map(),
      cardThumbnail: new Map(),
      btxtFlat: new Map(),
      itemOn: new Map(),
      itemUp: new Map()
    },
    furniture: {
      normal: new Map(),
      movable: new Map(),
      scripts: new Map(),
      thumbnail: new Map(),
      picture: new Map(),
      outside: new Map()
    },
    bgm: {
      port: new Map(),
      battle: new Map(),
      fanfare: new Map()
    },
    map: {
      thumbnail: new Map(),
      image: new Map(),
      info: new Map(),
      infoVariants: new Map(),
      spots: new Map()
    },
    voice: {
      byShipId: new Map(),
      byKey: new Map()
    }
  };
}

async function readCacheIndex(cacheDir: string): Promise<CacheIndex> {
  try {
    return JSON.parse(await readFile(path.join(cacheDir, "cached.json"), "utf8")) as CacheIndex;
  } catch {
    const paths = await listFiles(cacheDir);
    return Object.fromEntries(paths.map((pathname) => [pathname, {}]));
  }
}

async function listFiles(cacheDir: string, dir = cacheDir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await listFiles(cacheDir, fullPath)));
    } else if (entry.isFile()) {
      paths.push(`/${path.relative(cacheDir, fullPath).split(path.sep).join("/")}`);
    }
  }
  return paths;
}

function addShipResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const full = pathname.match(/^\/kcs2\/resources\/ship\/full\/(\d{4})_(\d{4})_([a-z]+)\.png$/i);
  if (full) {
    manifest.ship.full.set(
      Number(full[1]),
      resource(cacheDir, pathname, meta, {
        id: Number(full[1]),
        frame: full[2],
        extension: "png",
        filename: full[3]
      })
    );
    return;
  }

  const image = pathname.match(/^\/kcs2\/resources\/ship\/(album_status|banner|card|character_up|character_up_dmg)\/(\d{4})_(\d{4})\.png$/i);
  if (!image) return;

  const collection = shipCollection(manifest, image[1]);
  collection?.set(
    Number(image[2]),
    resource(cacheDir, pathname, meta, {
      id: Number(image[2]),
      frame: image[3],
      extension: "png"
    })
  );
}

function addSlotResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const match = pathname.match(/^\/kcs2\/resources\/slot\/(card|card_t|btxt_flat|item_on|item_up)\/(\d{4})_(\d{4})\.png$/i);
  if (!match) return;

  const collection = slotCollection(manifest, match[1]);
  collection?.set(
    Number(match[2]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[2]),
      frame: match[3],
      extension: "png"
    })
  );
}

function shipCollection(manifest: ResourceManifest, rawKind: string) {
  switch (rawKind.toLowerCase()) {
    case "album_status":
      return manifest.ship.albumStatus;
    case "banner":
      return manifest.ship.banner;
    case "card":
      return manifest.ship.card;
    case "character_up":
    case "power_up":
      return manifest.ship.characterUp;
    case "character_up_dmg":
    case "power_up_dmg":
      return manifest.ship.characterUpDamaged;
    default:
      return undefined;
  }
}

function slotCollection(manifest: ResourceManifest, rawKind: string) {
  switch (rawKind.toLowerCase()) {
    case "card":
      return manifest.slot.card;
    case "card_t":
      return manifest.slot.cardThumbnail;
    case "btxt_flat":
      return manifest.slot.btxtFlat;
    case "item_on":
      return manifest.slot.itemOn;
    case "item_up":
      return manifest.slot.itemUp;
    default:
      return undefined;
  }
}

function shipArtFallback(manifest: ResourceManifest, id: number) {
  return (
    manifest.ship.full.get(id) ||
    manifest.ship.card.get(id) ||
    manifest.ship.albumStatus.get(id) ||
    manifest.ship.banner.get(id) ||
    manifest.ship.characterUp.get(id) ||
    manifest.ship.characterUpDamaged.get(id)
  );
}

function addFurnitureResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const outside = pathname.match(/^\/kcs2\/resources\/furniture\/outside\/window_bg_(\d+)-(\d+)\.png$/i);
  if (outside) {
    const outsideId = Number(outside[1]);
    const variant = Number(outside[2]);
    manifest.furniture.outside.set(
      `${outsideId}-${variant}`,
      resource(cacheDir, pathname, meta, {
        id: outsideId,
        frame: String(variant),
        extension: "png"
      })
    );
    return;
  }

  const match = pathname.match(/^\/kcs2\/resources\/furniture\/(normal|movable|scripts|thumbnail|picture)\/(\d{3})_(\d{4})\.(png|json)$/i);
  if (!match) return;

  const collection = furnitureCollection(manifest, match[1]);
  collection?.set(
    Number(match[2]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[2]),
      frame: match[3],
      extension: match[4].toLowerCase()
    })
  );
}

function furnitureCollection(manifest: ResourceManifest, rawKind: string) {
  switch (rawKind.toLowerCase()) {
    case "normal":
      return manifest.furniture.normal;
    case "movable":
      return manifest.furniture.movable;
    case "scripts":
      return manifest.furniture.scripts;
    case "thumbnail":
      return manifest.furniture.thumbnail;
    case "picture":
      return manifest.furniture.picture;
    default:
      return undefined;
  }
}

function addBgmResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const match = pathname.match(/^\/kcs2\/resources\/bgm\/(port|battle|fanfare)\/(\d{3})_(\d{4})\.mp3$/i);
  if (!match) return;

  const collection = manifest.bgm[match[1].toLowerCase() as keyof ResourceManifest["bgm"]];
  collection.set(
    Number(match[2]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[2]),
      frame: match[3],
      extension: "mp3"
    })
  );
}

function firstResource(collection: Map<number, FileResource>) {
  return [...collection.values()].sort((a, b) => a.id - b.id)[0];
}

function defaultPortBgmResource(manifest: ResourceManifest) {
  return (
    manifest.bgm.port.get(DEFAULT_PORT_BGM_ID) ||
    [...manifest.bgm.port.values()].filter((bgm) => bgm.id > 0).sort((a, b) => a.id - b.id)[0]
  );
}

function addMapResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const match = pathname.match(/^\/kcs2\/resources\/map\/(\d{3})\/(\d{2})(?:_(image|info)(\d+)?)?\.(png|json)$/i);
  if (!match) return;

  const areaId = Number(match[1]);
  const mapNo = Number(match[2]);
  const kind = (match[3] || "thumbnail").toLowerCase();
  const variant = match[4] || "";
  const extension = pathname.endsWith(".json") ? "json" : "png";
  const id = areaId * 10 + mapNo;
  const parsed = {
    id,
    areaId,
    mapNo,
    frame: match[2],
    extension
  };

  const file = mapResource(cacheDir, pathname, meta, parsed);
  if (kind === "thumbnail") {
    manifest.map.thumbnail.set(id, file);
  } else if (kind === "info") {
    if (!variant) {
      manifest.map.info.set(id, file);
    } else {
      const variants = manifest.map.infoVariants.get(id) ?? [];
      variants.push(file);
      variants.sort((left, right) => mapInfoVariant(left.pathname) - mapInfoVariant(right.pathname));
      manifest.map.infoVariants.set(id, variants);
    }
  } else if (kind === "image" && (!variant || !manifest.map.image.has(id))) {
    manifest.map.image.set(id, file);
  }
}

function addVoiceResource(manifest: ResourceManifest, pathname: string) {
  const match = pathname.match(/^\/kcs\/sound\/kc([a-z]+)\/(\d+)\.mp3$/i);
  if (!match) return;

  const key = match[1];
  const file = match[2];
  const voice = manifest.voice.byKey.get(key) ?? {
    key,
    files: new Set<string>(),
    availableVoiceNos: new Set<number>()
  };
  voice.files.add(file);
  manifest.voice.byKey.set(key, voice);
}

function attachShipVoiceResources(manifest: ResourceManifest) {
  for (const [shipId, full] of manifest.ship.full) {
    if (!full.filename) continue;

    const voice = manifest.voice.byKey.get(full.filename);
    if (!voice) continue;

    voice.shipId = shipId;
    voice.availableVoiceNos = availableVoiceNos(shipId, voice.files);
    manifest.voice.byShipId.set(shipId, voice);
  }
}

async function attachMapInfoResources(manifest: ResourceManifest) {
  const mapIds = new Set([...manifest.map.info.keys(), ...manifest.map.infoVariants.keys()]);
  for (const mapId of mapIds) {
    const files = [
      manifest.map.info.get(mapId),
      ...(manifest.map.infoVariants.get(mapId) ?? [])
    ].filter((file): file is MapFileResource => Boolean(file));
    const spotsByNo = new Map<number, MapSpot>();
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(file.filePath, "utf8")) as { spots?: MapSpot[] };
        for (const spot of Array.isArray(raw.spots) ? raw.spots : []) {
          const no = Number(spot.no);
          if (Number.isFinite(no)) spotsByNo.set(no, { ...spot, no });
        }
      } catch {
        // Keep other map info fragments when one cached variant is malformed.
      }
    }
    manifest.map.spots.set(mapId, [...spotsByNo.values()].sort((left, right) => left.no - right.no));
  }
}

function mapInfoVariant(pathname: string) {
  return Number(pathname.match(/_info(\d+)\.json$/i)?.[1] ?? 0);
}

function availableVoiceNos(shipId: number, files: Set<string>) {
  const available = new Set<number>();
  for (let voiceNo = 1; voiceNo <= VOICE_FILE_HASHES.length; voiceNo += 1) {
    if (files.has(voiceFileName(shipId, voiceNo))) {
      available.add(voiceNo);
    }
  }
  return available;
}

function resource(
  cacheDir: string,
  pathname: string,
  meta: CachedResourceMeta,
  parsed: Pick<FileResource, "id" | "frame" | "extension" | "filename">
): FileResource {
  return {
    ...parsed,
    pathname,
    filePath: safeCachePath(cacheDir, pathname),
    version: parseVersion(meta.version),
    lastModified: meta.lastmodified,
    length: meta.length,
    cache: meta.cache
  };
}

function mapResource(
  cacheDir: string,
  pathname: string,
  meta: CachedResourceMeta,
  parsed: Pick<MapFileResource, "id" | "areaId" | "mapNo" | "frame" | "extension" | "filename">
): MapFileResource {
  return {
    ...parsed,
    pathname,
    filePath: safeCachePath(cacheDir, pathname),
    version: parseVersion(meta.version),
    lastModified: meta.lastmodified,
    length: meta.length,
    cache: meta.cache
  };
}

function safeCachePath(cacheDir: string, pathname: string) {
  const resolved = path.resolve(cacheDir, `.${pathname}`);
  if (!resolved.startsWith(`${cacheDir}${path.sep}`)) {
    throw new Error(`Cached resource path escapes cache directory: ${pathname}`);
  }
  return resolved;
}

function parseVersion(version: string | undefined) {
  if (!version) return undefined;
  const match = version.match(/(?:\?|&)version=([^&]+)/) || version.match(/^\?(.+)$/);
  return match?.[1] || version;
}

export async function readMappedResource(pathname: string, manifest: ResourceManifest) {
  const mapped = resolveMappedResource(pathname, manifest);
  if (!mapped) return null;

  try {
    await stat(mapped.filePath);
    return mapped;
  } catch {
    return null;
  }
}
