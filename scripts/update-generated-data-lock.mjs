import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_DATA_ARTIFACTS } from "./generated-data-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "data", "provenance", "generated-data.lock.json");

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fileRecord(filename) {
  const body = await readFile(path.join(ROOT, filename));
  return { path: filename, sha256: hash(body), bytes: body.length };
}

const artifacts = [];
for (const definition of GENERATED_DATA_ARTIFACTS) {
  const sourceLockPath = `data/snapshots/${definition.domain}/sources.lock.json`;
  const sourceLockBody = await readFile(path.join(ROOT, sourceLockPath));
  const sourceLock = JSON.parse(sourceLockBody);
  artifacts.push({
    id: definition.id,
    generatedAt: sourceLock.generatedAt,
    artifact: await fileRecord(definition.artifact),
    generator: definition.generator,
    codeInputs: await Promise.all(definition.codeInputs.map(fileRecord)),
    sourceLock: { path: sourceLockPath, sha256: hash(sourceLockBody), bytes: sourceLockBody.length },
    rebuildCommand: definition.command
  });
}

const lock = {
  schemaVersion: 1,
  policy: {
    networkDuringRebuild: false,
    digest: "sha256",
    githubSourcesRequireCommitSha: true,
    evidenceLevels: ["exact", "statistical", "inferred", "fallback"]
  },
  artifacts
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Updated ${path.relative(ROOT, OUTPUT)} for ${artifacts.length} generated artifacts`);
