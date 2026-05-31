import path from "node:path";
import { buildApp } from "./server/app.js";
import { createStateStore } from "./state/store.js";

const port = Number(process.env.PORT || 3020);
const host = process.env.HOST || "127.0.0.1";
const cacheDir = path.resolve(process.env.KANCOLLE_CACHE_DIR || "cache");
const databasePath = path.resolve(process.env.KANCOLLE_DB_PATH || ".local/save.sqlite");
const unknownLogPath = path.resolve(process.env.KANCOLLE_UNKNOWN_LOG || ".local/unknown-api.jsonl");
const responseFormat = process.env.KANCOLLE_RESPONSE_FORMAT === "json" ? "json" : "svdata";

const stateStore = createStateStore({ databasePath });
const app = await buildApp({ cacheDir, stateStore, unknownLogPath, responseFormat });

const shutdown = async () => {
  await app.close();
  stateStore.close();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ port, host });

console.log(`Kancolle local offline server listening at http://${host}:${port}`);
console.log(`Cache: ${cacheDir}`);
console.log(`SQLite save: ${databasePath}`);
console.log(`Unknown API log: ${unknownLogPath}`);
