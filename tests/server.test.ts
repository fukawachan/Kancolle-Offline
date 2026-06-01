import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

  it("maps legacy or stale client resource names to cached local resources", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const ship = await app.inject({ method: "GET", url: "/kcs2/resources/ship/full/0006_7134_6.png" });
    const furniture = await app.inject({ method: "GET", url: "/kcs2/resources/furniture/normal/006_9845.png" });
    const bgm = await app.inject({ method: "GET", url: "/kcs2/resources/bgm/port/001_9913.mp3" });
    const favicon = await app.inject({ method: "GET", url: "/favicon.ico" });

    expect(ship.statusCode).toBe(200);
    expect(ship.headers["content-type"]).toContain("image/png");
    expect(ship.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
    expect(furniture.statusCode).toBe(200);
    expect(furniture.headers["content-type"]).toContain("image/png");
    expect(furniture.body.slice(0, 8)).toBe("\uFFFDPNG\r\n\u001a\n");
    expect(bgm.statusCode).toBe(200);
    expect(bgm.headers["content-type"]).toContain("audio/mpeg");
    expect(bgm.body.slice(0, 3)).toBe("ID3");
    expect(favicon.statusCode).toBe(204);
  });

  it("implements launcher world selection and login token endpoints", async () => {
    const app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });

    const world = await app.inject({
      method: "GET",
      url: "/kcsapi/api_world/get_id/local-viewer/1/123"
    });
    const login = await app.inject({
      method: "GET",
      url: "/kcsapi/api_auth_member/dmmlogin/local-viewer/1/123"
    });

    expect(world.statusCode).toBe(200);
    expect(world.json().api_data).toEqual({ api_world_id: 1 });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toMatchObject({
      api_result: 1,
      api_token: expect.stringContaining("local-viewer"),
      api_starttime: expect.any(Number)
    });
  });

  it("can serialize kcsapi responses with the svdata prefix expected by the cached client", async () => {
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
