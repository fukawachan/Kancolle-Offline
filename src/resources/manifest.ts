import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { CachedResourceMeta, FileResource, ResourceManifest } from "./types.js";

type CacheIndex = Record<string, CachedResourceMeta>;

export async function createResourceManifest(cacheDir: string): Promise<ResourceManifest> {
  const resolvedCacheDir = path.resolve(cacheDir);
  const index = await readCacheIndex(resolvedCacheDir);
  const manifest = emptyManifest();

  for (const [pathname, meta] of Object.entries(index)) {
    addShipResource(manifest, resolvedCacheDir, pathname, meta);
    addFurnitureResource(manifest, resolvedCacheDir, pathname, meta);
    addBgmResource(manifest, resolvedCacheDir, pathname, meta);
  }

  return manifest;
}

export function resolveMappedResource(pathname: string, manifest: ResourceManifest): FileResource | undefined {
  const ship = pathname.match(/^\/kcs2\/resources\/ship\/full\/(\d{4})_(\d{4})_[^/]+\.png$/i);
  if (ship) {
    const resource = manifest.ship.full.get(Number(ship[1]));
    if (resource && (resource.frame === ship[2] || !ship[2])) return resource;
    return resource;
  }

  const furniture = pathname.match(/^\/kcs2\/resources\/furniture\/normal\/(\d{3})_\d{4}\.png$/i);
  if (furniture) {
    const id = Number(furniture[1]);
    return manifest.furniture.normal.get(id) || manifest.furniture.movable.get(id) || manifest.furniture.thumbnail.get(id);
  }

  const portBgm = pathname.match(/^\/kcs2\/resources\/bgm\/port\/(\d{3})_\d{4}\.mp3$/i);
  if (portBgm) {
    const id = Number(portBgm[1]);
    return manifest.bgm.port.get(id) || manifest.bgm.port.get(0);
  }

  return undefined;
}

function emptyManifest(): ResourceManifest {
  return {
    ship: {
      full: new Map()
    },
    furniture: {
      normal: new Map(),
      movable: new Map(),
      scripts: new Map(),
      thumbnail: new Map()
    },
    bgm: {
      port: new Map()
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
  const match = pathname.match(/^\/kcs2\/resources\/ship\/full\/(\d{4})_(\d{4})_([a-z]+)\.png$/i);
  if (!match) return;

  manifest.ship.full.set(
    Number(match[1]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[1]),
      frame: match[2],
      extension: "png",
      filename: match[3]
    })
  );
}

function addFurnitureResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const match = pathname.match(/^\/kcs2\/resources\/furniture\/(normal|movable|scripts|thumbnail)\/(\d{3})_(\d{4})\.(png|json)$/i);
  if (!match) return;

  const collection = manifest.furniture[match[1].toLowerCase() as keyof ResourceManifest["furniture"]];
  collection.set(
    Number(match[2]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[2]),
      frame: match[3],
      extension: match[4].toLowerCase()
    })
  );
}

function addBgmResource(manifest: ResourceManifest, cacheDir: string, pathname: string, meta: CachedResourceMeta) {
  const match = pathname.match(/^\/kcs2\/resources\/bgm\/port\/(\d{3})_(\d{4})\.mp3$/i);
  if (!match) return;

  manifest.bgm.port.set(
    Number(match[1]),
    resource(cacheDir, pathname, meta, {
      id: Number(match[1]),
      frame: match[2],
      extension: "mp3"
    })
  );
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
