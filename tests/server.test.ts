import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("local Fastify server", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-server-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("serves the generated kcs2 bootstrap with original query parameters", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const response = await app.inject({
      method: "GET",
      url: "/kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&api_token=test-token&api_starttime=123"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("/local-vendor/pixi.min.js");
    expect(response.body).toContain("/local-vendor/createjs.min.js");
    expect(response.body).toContain("/local-vendor/axios.min.js");
    expect(response.body).toContain("/local-vendor/howler.min.js");
    expect(response.body).toContain("/kcs2/js/main.js");
    expect(response.body).toContain("window.KCS.init()");
    expect(response.body).toContain("id=\"r_editarea\"");
    expect(response.body).toContain("id=\"r_editbox\"");
    expect(response.body).toContain("api_root=/kcsapi");
    expect(response.body).toContain("api_token=test-token");
    expect(response.body).toContain("id=\"game_frame\"");
  });

  it("serves the local launcher and single-world registration page", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const launcher = await app.inject({ method: "GET", url: "/" });
    const world = await app.inject({ method: "GET", url: "/kcs2/world.html?viewer_id=local-viewer" });

    expect(launcher.statusCode).toBe(200);
    expect(launcher.headers["content-type"]).toContain("text/html");
    expect(launcher.body).toContain("Kancolle Local Launcher");
    expect(launcher.body).toContain("api_world/get_id");
    expect(launcher.body).toContain("kcs2/world.html");
    expect(launcher.body).toContain("api_root=/kcsapi&voice_root=/kcs/sound&");
    expect(world.statusCode).toBe(200);
    expect(world.headers["content-type"]).toContain("text/html");
    expect(world.body).toContain("幌筵泊地");
    expect(world.body).toContain("/kcs2/resources/world/15p_ver_com_t.png");
    expect(world.body).toContain("api_world/register");
  });

  it("serves local vendor runtimes before the cached client bundle", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const pixi = await app.inject({ method: "GET", url: "/local-vendor/pixi.min.js" });
    const createjs = await app.inject({ method: "GET", url: "/local-vendor/createjs.min.js" });
    const axios = await app.inject({ method: "GET", url: "/local-vendor/axios.min.js" });
    const howler = await app.inject({ method: "GET", url: "/local-vendor/howler.min.js" });

    expect(pixi.statusCode).toBe(200);
    expect(pixi.headers["content-type"]).toContain("application/javascript");
    expect(pixi.body).toContain("PIXI");
    expect(createjs.statusCode).toBe(200);
    expect(createjs.headers["content-type"]).toContain("application/javascript");
    expect(createjs.body).toContain("createjs");
    const createjsContext: Record<string, unknown> = {
      console,
      Date,
      Math,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      performance: { now: () => Date.now() },
      document: { createElement: () => ({ canPlayType: () => "" }) },
      navigator: { userAgent: "" }
    };
    createjsContext.window = createjsContext;
    createjsContext.self = createjsContext;
    createjsContext.global = createjsContext;
    createContext(createjsContext);
    runInContext(createjs.body, createjsContext);
    expect(() => new (createjsContext.createjs as any).Timeline([], { start: 0 }, { loop: true, paused: true })).not.toThrow();
    expect(axios.statusCode).toBe(200);
    expect(axios.headers["content-type"]).toContain("application/javascript");
    expect(axios.body).toContain("axios");
    expect(howler.statusCode).toBe(200);
    expect(howler.headers["content-type"]).toContain("application/javascript");
    expect(howler.body).toMatch(/Howl|Howler/);
  });

  it("serves cached static files under their original URL paths", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const response = await app.inject({ method: "GET", url: "/kcs2/version.json" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toMatchObject({ title: expect.any(String), port: expect.any(String) });
  });

  it("falls back to cached PNG title images when the client asks for legacy JPG names", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const response = await app.inject({ method: "GET", url: "/kcs2/img/title/title2.jpg?version=6.1.7.0" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
  });

  it("falls back to a cached world image when the local host-derived world image is missing", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const response = await app.inject({ method: "GET", url: "/kcs2/resources/world/127_000_000_001_t.png" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
  });

  it("falls back to cache-backed battle and fanfare BGM when the client asks with a stale frame", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const battle = await app.inject({ method: "GET", url: "/kcs2/resources/bgm/battle/155_0000.mp3" });
    const legacyZero = await app.inject({ method: "GET", url: "/kcs2/resources/bgm/battle/000_1633.mp3" });
    const fanfare = await app.inject({ method: "GET", url: "/kcs2/resources/bgm/fanfare/001_0000.mp3" });

    expect(battle.statusCode).toBe(200);
    expect(battle.headers["content-type"]).toContain("audio/mpeg");
    expect(battle.body.length).toBeGreaterThan(1000);
    expect(legacyZero.statusCode).toBe(200);
    expect(legacyZero.headers["content-type"]).toContain("audio/mpeg");
    expect(fanfare.statusCode).toBe(200);
    expect(fanfare.headers["content-type"]).toContain("audio/mpeg");
  });

  it("falls back to a cache-backed battle slot text image when a cutin asks for an uncached equipment id", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const response = await app.inject({ method: "GET", url: "/kcs2/resources/slot/btxt_flat/0103_0000.png" });
    const fallbackForSlot1 = await app.inject({ method: "GET", url: "/kcs2/resources/slot/btxt_flat/0001_0000.png" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
    expect(fallbackForSlot1.statusCode).toBe(200);
    expect(fallbackForSlot1.headers["content-type"]).toContain("image/png");
    expect(fallbackForSlot1.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
  });

  it("requires single-account world registration before issuing login tokens", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const worldBefore = await app.inject({
      method: "GET",
      url: "/kcsapi/api_world/get_id/local-viewer/1/123"
    });
    const loginBefore = await app.inject({
      method: "GET",
      url: "/kcsapi/api_auth_member/dmmlogin/local-viewer/1/123"
    });
    const register = await app.inject({
      method: "POST",
      url: "/kcsapi/api_world/register/local-viewer/15/123"
    });
    const worldAfter = await app.inject({
      method: "GET",
      url: "/kcsapi/api_world/get_id/local-viewer/1/123"
    });
    const loginAfter = await app.inject({
      method: "GET",
      url: "/kcsapi/api_auth_member/dmmlogin/local-viewer/1/123"
    });

    expect(worldBefore.statusCode).toBe(200);
    expect(worldBefore.json().api_data).toEqual({ api_world_id: 0 });
    expect(loginBefore.statusCode).toBe(200);
    expect(loginBefore.json()).toMatchObject({
      api_result: 403,
      api_data: {}
    });
    expect(loginBefore.json()).not.toHaveProperty("api_token");
    expect(register.statusCode).toBe(200);
    expect(register.json().api_data).toEqual({ api_world_id: 15 });
    expect(worldAfter.json().api_data).toEqual({ api_world_id: 15 });
    expect(loginAfter.statusCode).toBe(200);
    expect(loginAfter.json()).toMatchObject({
      api_result: 1,
      api_token: expect.stringContaining("local-viewer"),
      api_starttime: expect.any(Number)
    });
  });

  it("can serialize kcsapi responses with the svdata prefix expected by the cached client", async () => {
    store.registerAccount(15);
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
      responseFormat: "svdata"
    });

    const response = await app.inject({
      method: "POST",
      url: "/kcsapi/api_start2/get_option_setting"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toMatch(/^svdata=/);
    expect(JSON.parse(response.body.replace(/^svdata=/, ""))).toMatchObject({
      api_result: 1,
      api_data: {
        api_volume_setting: {
          api_bgm: expect.any(Number),
          api_be_left: expect.any(Number),
          api_duty: expect.any(Number)
        }
      }
    });
  });

  it("records unknown kcsapi calls and returns a clear local envelope", async () => {
    store.registerAccount(15);
    const unknownLogPath = path.join(tempDir, "unknown.jsonl");
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath
    });

    const response = await app.inject({
      method: "POST",
      url: "/kcsapi/api_missing/example?api_verno=1",
      payload: "api_id=42",
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      api_result: 404,
      api_result_msg: expect.stringContaining("Unknown local Kancolle API")
    });

    const [line] = (await readFile(unknownLogPath, "utf8")).trim().split("\n");
    expect(JSON.parse(line)).toMatchObject({
      method: "POST",
      path: "/kcsapi/api_missing/example",
      query: { api_verno: "1" },
      body: { api_id: "42" }
    });
  });
});
