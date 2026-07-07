import fastifyStatic from "@fastify/static";
import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { readdir, readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResponseFormat } from "../kcsapi/envelope.js";
import { API_HTTP_STATUS, apiError, apiOk, serializeApiResponse } from "../kcsapi/envelope.js";
import { handleKcsApi, requestToHandlerInput } from "../kcsapi/handlers.js";
import { createResourceManifest, readMappedResource } from "../resources/manifest.js";
import type { FileResource, ResourceManifest } from "../resources/types.js";
import { renderBootstrap } from "./bootstrap.js";
import { patchKcsMainJs } from "./client-patches.js";
import { renderLauncher, renderWorldPage } from "./launcher.js";
import { LOCAL_WORLD_ID } from "../state/store.js";
import type { StateStore } from "../state/store.js";
import { registerDebugRoutes } from "../debug/index.js";

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64"
);
// 64x64 ICO derived from https://zh.wikipedia.org/wiki/File:Kancolle_logo.png for local favicon use.
const FAVICON_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "assets/favicon.ico");
const SPECIAL_REMODEL_STAGE_CENTER = { x: 600, y: 360 };
const SPECIAL_REMODEL_MAX_SHIP_WIDTH = 820;
const SPECIAL_REMODEL_MAX_SHIP_HEIGHT = 680;
const SPECIAL_REMODEL_DEFAULT_SCALE = 0.5;
const SPECIAL_REMODEL_ANIMATION_TYPE = {
  delay: 1,
  shipCamera: 2,
  playVoice: 6
} as const;

export type BuildAppOptions = {
  cacheDir: string;
  extraCacheDir?: string;
  stateStore: StateStore;
  unknownLogPath: string;
  responseFormat?: ResponseFormat;
  arsenalRandom?: () => number;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  await assertCacheDir(options.cacheDir);
  const resourceManifest = await createResourceManifest(options.cacheDir);

  const app = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });
  await app.register(formbody);

  const sendApi = (reply: FastifyReply, payload: unknown) => {
    const serialized = serializeApiResponse(payload, options.responseFormat || "json");
    const contentType = options.responseFormat === "svdata" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
    const status = typeof payload === "object" && payload !== null && API_HTTP_STATUS in payload
      ? Number(payload[API_HTTP_STATUS])
      : 200;
    return reply.code(status).header("cache-control", "no-store").type(contentType).send(serialized);
  };

  registerDebugRoutes(app, options.stateStore, sendApi);

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderLauncher());
  });

  app.get("/kcs2/index.php", async (request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderBootstrap(request.query as Record<string, unknown>));
  });

  app.get("/kcs2/world.html", async (request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderWorldPage(request.query as Record<string, unknown>));
  });

  app.get("/favicon.ico", async (_request, reply) => {
    return reply
      .type("image/x-icon")
      .header("cache-control", "public, max-age=3600")
      .send(await readFile(FAVICON_PATH));
  });

  app.get("/local-vendor/pixi.min.js", async (_request, reply) => {
    return reply
      .type("application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(await readFile(localVendorPath("pixi.js/dist/pixi.min.js"), "utf8"));
  });

  app.get("/local-vendor/createjs.min.js", async (_request, reply) => {
    return reply
      .type("application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(await readFile(localVendorPath("createjs/builds/createjs-2015.11.26.min.js"), "utf8"));
  });

  app.get("/local-vendor/axios.min.js", async (_request, reply) => {
    return reply
      .type("application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(await readFile(localVendorPath("axios/dist/axios.min.js"), "utf8"));
  });

  app.get("/local-vendor/howler.min.js", async (_request, reply) => {
    return reply
      .type("application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(await readFile(localVendorPath("howler/dist/howler.min.js"), "utf8"));
  });

  app.get("/kcs2/js/main.js", async (_request, reply) => {
    return reply
      .type("application/javascript; charset=utf-8")
      .header("cache-control", "no-store")
      .send(patchKcsMainJs(await readFile(path.join(options.cacheDir, "kcs2/js/main.js"), "utf8")));
  });

  app.get("/kcsapi/api_world/get_id/:viewerId/:server/:timestamp", async (_request, reply) => {
    return sendApi(reply, apiOk({ api_world_id: options.stateStore.getWorldId() }));
  });

  app.post("/kcsapi/api_world/register/:viewerId/:worldId/:timestamp", async (request, reply) => {
    const { worldId } = request.params as { worldId: string };
    const selectedWorldId = Number(worldId);
    if (selectedWorldId !== LOCAL_WORLD_ID) {
      return sendApi(reply, apiError(`Unsupported local world id: ${worldId}`, 400));
    }
    options.stateStore.registerAccount(selectedWorldId);
    return sendApi(reply, apiOk({ api_world_id: selectedWorldId }));
  });

  app.get("/kcsapi/api_auth_member/dmmlogin/:viewerId/:server/:timestamp", async (request, reply) => {
    const { viewerId } = request.params as { viewerId: string };
    if (!options.stateStore.hasAccount()) {
      return sendApi(reply, apiError("Local Kancolle account has not been registered. Select a world first.", 403));
    }
    return sendApi(reply, {
      api_result: 1,
      api_result_msg: "成功",
      api_token: `local-${viewerId}-${Date.now()}`,
      api_starttime: Date.now()
    });
  });

  app.all("/kcsapi/*", async (request, reply) => {
    if (!options.stateStore.hasAccount()) {
      return sendApi(reply, apiError("Local Kancolle account has not been registered. Select a world first.", 403));
    }
    const input = requestToHandlerInput(request);
    const payload = await handleKcsApi(input, {
      stateStore: options.stateStore,
      unknownLogPath: options.unknownLogPath,
      resourceManifest,
      arsenalRandom: options.arsenalRandom ?? Math.random
    });
    return sendApi(reply, payload);
  });

  await app.register(fastifyStatic, {
    root: options.cacheDir,
    prefix: "/",
    decorateReply: false,
    setHeaders(res, filePath) {
      const override = contentTypeFor(filePath);
      if (override) res.setHeader("content-type", override);
      res.setHeader("cache-control", "public, max-age=3600");
    }
  });

  app.setNotFoundHandler(async (request, reply) => {
    const extraCacheFallback = await readExtraCacheResource(options.extraCacheDir, request.url);
    if (extraCacheFallback) {
      return reply
        .type(extraCacheFallback.contentType)
        .header("cache-control", "public, max-age=3600")
        .send(extraCacheFallback.body);
    }

    const mappedFallback = await readMappedResource(decodeURIComponent(new URL(request.url, "http://local").pathname), resourceManifest);
    if (mappedFallback) {
      const contentType = contentTypeFor(mappedFallback.filePath);
      return reply
        .type(contentType || "application/octet-stream")
        .header("cache-control", "public, max-age=3600")
        .send(await readFile(mappedFallback.filePath));
    }

    const specialRemodelFallback = await readSpecialRemodelFallback(request.url, resourceManifest);
    if (specialRemodelFallback) {
      return reply
        .type(specialRemodelFallback.contentType)
        .header("cache-control", "public, max-age=3600")
        .send(specialRemodelFallback.body);
    }

    const recordAirbaseFallback = await readRecordAirbaseMaintFallback(options.cacheDir, request.url);
    if (recordAirbaseFallback) {
      return reply
        .type(recordAirbaseFallback.contentType)
        .header("cache-control", "public, max-age=3600")
        .send(recordAirbaseFallback.body);
    }

    const pngFallback = await readPngFallback(options.cacheDir, request.url);
    if (pngFallback) {
      return reply
        .type("image/png")
        .header("cache-control", "public, max-age=3600")
        .send(pngFallback);
    }

    const voiceFallback = await readVoiceFallback(options.cacheDir, request.url);
    if (voiceFallback) {
      return reply
        .type("audio/mpeg")
        .header("cache-control", "public, max-age=3600")
        .send(voiceFallback);
    }

    return reply.code(404).send({
      error: "Not Found",
      path: request.url,
      message: "No cached static file or local API handler matched this request."
    });
  });

  return app;
}

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    case ".woff2":
      return "font/woff2";
    default:
      return undefined;
  }
}

async function assertCacheDir(cacheDir: string) {
  const resolved = path.resolve(cacheDir);
  const stats = await stat(resolved);
  if (!stats.isDirectory()) {
    throw new Error(`Cache path is not a directory: ${resolved}`);
  }
}

export function defaultCacheDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../cache");
}

async function readExtraCacheResource(extraCacheDir: string | undefined, url: string) {
  if (!extraCacheDir) return null;
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const resolvedExtraCacheDir = path.resolve(extraCacheDir);
  const filePath = path.resolve(resolvedExtraCacheDir, `.${pathname}`);
  if (!filePath.startsWith(`${resolvedExtraCacheDir}${path.sep}`)) return null;

  try {
    return {
      filePath,
      contentType: contentTypeFor(filePath) || "application/octet-stream",
      body: await readFile(filePath)
    };
  } catch {
    return null;
  }
}

function localVendorPath(packagePath: string) {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../node_modules", packagePath);
}

async function readVoiceFallback(cacheDir: string, url: string) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const resolvedCacheDir = path.resolve(cacheDir);
  const voiceMatch = pathname.match(/^(\/kcs2\/resources\/voice\/titlecall_[12]\/)\d{3}\.mp3$/i);
  if (!voiceMatch) return null;

  const voiceDir = path.join(resolvedCacheDir, `.${voiceMatch[1]}`);
  try {
    const files = (await readdir(voiceDir)).filter((f) => f.endsWith(".mp3")).sort();
    if (!files.length) return null;
    const fallbackPath = path.join(voiceDir, files[0]);
    return await readFile(fallbackPath);
  } catch {
    return null;
  }
}

async function readRecordAirbaseMaintFallback(cacheDir: string, url: string) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  if (!/^\/kcs2\/img\/record\/record_airbase_maint\.(json|png)$/i.test(pathname)) return null;

  const resolvedCacheDir = path.resolve(cacheDir);
  const extension = path.extname(pathname).toLowerCase();
  const fallbackPath = path.resolve(resolvedCacheDir, `./kcs2/img/sally/sally_airbase_maint${extension}`);
  if (!fallbackPath.startsWith(`${resolvedCacheDir}${path.sep}`)) return null;

  try {
    if (extension === ".png") {
      return { contentType: "image/png", body: await readFile(fallbackPath) };
    }

    const atlas = JSON.parse(await readFile(fallbackPath, "utf8")) as {
      frames?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    const frames = Object.fromEntries(
      Object.entries(atlas.frames ?? {}).map(([key, value]) => [
        key.replace(/^sally_airbase_maint_/, "record_airbase_maint_"),
        value
      ])
    );
    return {
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        ...atlas,
        frames,
        meta: {
          ...(atlas.meta ?? {}),
          image: "record_airbase_maint.png"
        }
      })
    };
  } catch {
    return null;
  }
}

async function readSpecialRemodelFallback(url: string, manifest: ResourceManifest) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const textOrSilhouettePng = pathname.match(
    /^\/kcs2\/resources\/ship\/sp_remodel\/(text_remodel_mes|text_class|text_name|silhouette)\/\d{4}_\d{4}\.png$/i
  );
  if (textOrSilhouettePng) {
    return { contentType: "image/png", body: TRANSPARENT_PNG };
  }

  const fullX2 = pathname.match(/^\/kcs2\/resources\/ship\/sp_remodel\/full_x2\/(\d{4})_\d{4}\.png$/i);
  if (fullX2) {
    return {
      contentType: "image/png",
      body: (await readSpecialRemodelShipArt(manifest, Number(fullX2[1]))) ?? TRANSPARENT_PNG
    };
  }

  const animationKey = pathname.match(/^\/kcs2\/resources\/ship\/sp_remodel\/animation_key\/(\d{4})_remodel\.json$/i);
  if (animationKey) {
    const shipId = Number(animationKey[1]);
    return {
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(await specialRemodelAnimationKeys(manifest, shipId))
    };
  }

  return null;
}

async function readSpecialRemodelShipArt(manifest: ResourceManifest, shipId: number) {
  for (const resource of specialRemodelShipArtCandidates(manifest, shipId)) {
    try {
      return await readFile(resource.filePath);
    } catch {
      // Try the next cached representation when the index points at a missing file.
    }
  }
  return null;
}

function specialRemodelShipArtCandidates(manifest: ResourceManifest, shipId: number): FileResource[] {
  return [
    manifest.ship.spRemodel.fullX2.get(shipId),
    shipArtFallback(manifest, shipId)
  ].filter((resource): resource is FileResource => Boolean(resource));
}

function shipArtFallback(manifest: ResourceManifest, shipId: number) {
  return (
    manifest.ship.full.get(shipId) ||
    manifest.ship.card.get(shipId) ||
    manifest.ship.albumStatus.get(shipId) ||
    manifest.ship.banner.get(shipId) ||
    manifest.ship.characterUp.get(shipId) ||
    manifest.ship.characterUpDamaged.get(shipId)
  );
}

async function specialRemodelAnimationKeys(manifest: ResourceManifest, shipId: number) {
  const art = await readSpecialRemodelShipArt(manifest, shipId);
  const scale = specialRemodelShipScale(art);

  return {
    setting: { zindex: [{ type: SPECIAL_REMODEL_ANIMATION_TYPE.shipCamera, index: 1 }] },
    keys: [
      {
        prop: [
          {
            type: SPECIAL_REMODEL_ANIMATION_TYPE.shipCamera,
            position: SPECIAL_REMODEL_STAGE_CENTER,
            scale
          },
          { type: SPECIAL_REMODEL_ANIMATION_TYPE.playVoice },
          { type: SPECIAL_REMODEL_ANIMATION_TYPE.delay, duration: 1800 }
        ]
      }
    ]
  };
}

function specialRemodelShipScale(art: Buffer | null) {
  const dimensions = art ? pngDimensions(art) : null;
  if (!dimensions) return SPECIAL_REMODEL_DEFAULT_SCALE;

  const scale = Math.min(
    0.68,
    SPECIAL_REMODEL_MAX_SHIP_WIDTH / dimensions.width,
    SPECIAL_REMODEL_MAX_SHIP_HEIGHT / dimensions.height
  );
  return Number(Math.max(0.35, scale).toFixed(3));
}

function pngDimensions(png: Buffer) {
  if (
    png.length < 24 ||
    png[0] !== 0x89 ||
    png[1] !== 0x50 ||
    png[2] !== 0x4e ||
    png[3] !== 0x47 ||
    png[4] !== 0x0d ||
    png[5] !== 0x0a ||
    png[6] !== 0x1a ||
    png[7] !== 0x0a
  ) {
    return null;
  }

  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

async function readPngFallback(cacheDir: string, url: string) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const resolvedCacheDir = path.resolve(cacheDir);

  if (/^\/kcs2\/resources\/area\/sally\/00[3-7]\.png$/i.test(pathname)) {
    return TRANSPARENT_PNG;
  }

  const itemFairyMatch = pathname.match(/^\/kcs2\/img\/item\/fairy\/([12])\.png$/i);
  if (itemFairyMatch) {
    const fallbackPath = path.resolve(resolvedCacheDir, `./kcs2/img/duty/fairy/${itemFairyMatch[1]}.png`);
    if (!fallbackPath.startsWith(`${resolvedCacheDir}${path.sep}`)) return null;

    try {
      return await readFile(fallbackPath);
    } catch {
      return null;
    }
  }

  if (/\.jpe?g$/i.test(pathname)) {
    const fallbackPath = path.resolve(resolvedCacheDir, `.${pathname.replace(/\.jpe?g$/i, ".png")}`);
    if (!fallbackPath.startsWith(`${resolvedCacheDir}${path.sep}`)) return null;

    try {
      return await readFile(fallbackPath);
    } catch {
      return null;
    }
  }

  const worldMatch = pathname.match(/^\/kcs2\/resources\/world\/\d{3}_\d{3}_\d{3}_\d{3}_(t|s|l)\.png$/i);
  if (!worldMatch) return null;

  const worldDir = path.join(resolvedCacheDir, "kcs2/resources/world");
  try {
    const candidates = (await readdir(worldDir)).filter((file) => file.endsWith(`_${worldMatch[1].toLowerCase()}.png`)).sort();
    const fallbackPath = candidates[0] ? path.join(worldDir, candidates[0]) : null;
    return fallbackPath ? await readFile(fallbackPath) : null;
  } catch {
    return null;
  }
}
