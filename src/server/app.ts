import fastifyStatic from "@fastify/static";
import formbody from "@fastify/formbody";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { readdir, readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResponseFormat } from "../kcsapi/envelope.js";
import { apiError, apiOk, serializeApiResponse } from "../kcsapi/envelope.js";
import { handleKcsApi, requestToHandlerInput } from "../kcsapi/handlers.js";
import { renderBootstrap } from "./bootstrap.js";
import { renderLauncher, renderWorldPage } from "./launcher.js";
import { LOCAL_WORLD_ID } from "../state/store.js";
import type { StateStore } from "../state/store.js";

export type BuildAppOptions = {
  cacheDir: string;
  stateStore: StateStore;
  unknownLogPath: string;
  responseFormat?: ResponseFormat;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  await assertCacheDir(options.cacheDir);

  const app = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });
  await app.register(formbody);

  const sendApi = (reply: FastifyReply, payload: unknown) => {
    const serialized = serializeApiResponse(payload, options.responseFormat || "json");
    const contentType = options.responseFormat === "svdata" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8";
    return reply.header("cache-control", "no-store").type(contentType).send(serialized);
  };

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderLauncher());
  });

  app.get("/kcs2/index.php", async (request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderBootstrap(request.query as Record<string, unknown>));
  });

  app.get("/kcs2/world.html", async (request, reply) => {
    return reply.type("text/html; charset=utf-8").send(renderWorldPage(request.query as Record<string, unknown>));
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
      .send(await readFile(localVendorPath("createjs/builds/1.0.0/createjs.min.js"), "utf8"));
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
      unknownLogPath: options.unknownLogPath
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
    const pngFallback = await readPngFallback(options.cacheDir, request.url);
    if (pngFallback) {
      return reply
        .type("image/png")
        .header("cache-control", "public, max-age=3600")
        .send(pngFallback);
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

function localVendorPath(packagePath: string) {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../node_modules", packagePath);
}

async function readPngFallback(cacheDir: string, url: string) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const resolvedCacheDir = path.resolve(cacheDir);

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
