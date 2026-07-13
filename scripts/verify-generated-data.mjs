import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GENERATED_DATA_ARTIFACTS } from "./generated-data-manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(ROOT, "data", "provenance", "generated-data.lock.json");
const REBUILD = process.argv.includes("--rebuild");

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function assertFileRecord(record, label) {
  const body = await readFile(path.join(ROOT, record.path));
  if (body.length !== record.bytes || hash(body) !== record.sha256) {
    throw new Error(`${label} drifted: ${record.path}`);
  }
  return body;
}

function assertPinnedSource(source, domain) {
  const url = String(source.requestedUrl ?? "");
  if (!url || !source.sha256 || !Number.isInteger(source.bytes)) {
    throw new Error(`Incomplete source metadata for ${domain}/${source.file}`);
  }
  if (/(?:raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?:master|main)\/|cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+@(?:master|main)\/)/i.test(url)) {
    throw new Error(`Mutable GitHub branch URL in ${domain}/${source.file}: ${url}`);
  }
  if (!source.license?.spdx || !source.evidence || !source.retrievedAt) {
    throw new Error(`Missing license/evidence/retrieval metadata for ${domain}/${source.file}`);
  }
}

async function verifySourceLock(definition, expected) {
  const body = await assertFileRecord(expected, `${definition.id} source lock`);
  const lock = JSON.parse(body);
  if (lock.schemaVersion !== 1 || lock.domain !== definition.domain || !Array.isArray(lock.sources) || lock.sources.length === 0) {
    throw new Error(`Invalid source lock for ${definition.id}`);
  }
  for (const source of lock.sources) {
    assertPinnedSource(source, definition.domain);
    const rawPath = path.join(ROOT, "data", "snapshots", definition.domain, "raw", source.file);
    const raw = await readFile(rawPath);
    if (raw.length !== source.bytes || hash(raw) !== source.sha256) {
      throw new Error(`Raw snapshot drifted: ${path.relative(ROOT, rawPath)}`);
    }
  }
  return lock;
}

function countEvidence(value, counts = { exact: 0, statistical: 0, inferred: 0, fallback: 0 }) {
  if (Array.isArray(value)) {
    for (const child of value) countEvidence(child, counts);
  } else if (value && typeof value === "object") {
    if (value.evidence?.level in counts) counts[value.evidence.level] += 1;
    for (const child of Object.values(value)) countEvidence(child, counts);
  }
  return counts;
}

async function verifyEvidence(definition, artifactBody) {
  if (["master", "shop"].includes(definition.id)) return;
  if (["quest", "expedition"].includes(definition.id)) {
    const occurrences = (artifactBody.toString("utf8").match(/"evidence"\s*:/g) ?? []).length;
    if (occurrences === 0) throw new Error(`${definition.id} has no row-level evidence`);
    return;
  }
  const parsed = JSON.parse(artifactBody);
  const counts = countEvidence(parsed);
  if (Object.values(counts).reduce((sum, value) => sum + value, 0) === 0) {
    throw new Error(`${definition.id} has no row-level evidence`);
  }
  if (definition.id === "sortie" && counts.statistical === 0) {
    throw new Error("Sortie data does not distinguish statistical observations");
  }
  if (definition.id === "routing" && counts.fallback === 0) {
    throw new Error("Routing data does not expose fallback rules");
  }
}

function run(command, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd: ROOT,
      env: { ...process.env, GENERATED_OUTPUT_PATH: outputPath },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolve({ stdout, stderr })
      : reject(new Error(`${command.join(" ")} exited ${code}\n${stdout}\n${stderr}`)));
  });
}

const lock = JSON.parse(await readFile(LOCK_PATH, "utf8"));
if (lock.schemaVersion !== 1) throw new Error("Unsupported generated-data lock schema");
const lockById = new Map(lock.artifacts.map((artifact) => [artifact.id, artifact]));
const temporary = REBUILD ? await mkdtemp(path.join(os.tmpdir(), "kancolle-generated-data-")) : null;

try {
  for (const definition of GENERATED_DATA_ARTIFACTS) {
    const expected = lockById.get(definition.id);
    if (!expected) throw new Error(`Missing generated-data lock entry ${definition.id}`);
    const artifactBody = await assertFileRecord(expected.artifact, `${definition.id} artifact`);
    for (const input of expected.codeInputs) await assertFileRecord(input, `${definition.id} code input`);
    await verifySourceLock(definition, expected.sourceLock);
    await verifyEvidence(definition, artifactBody);
    if (REBUILD) {
      const outputPath = path.join(temporary, `${definition.id}${path.extname(definition.artifact)}`);
      await run(definition.command, outputPath);
      const rebuilt = await readFile(outputPath);
      if (!artifactBody.equals(rebuilt)) throw new Error(`${definition.id} rebuild is not byte-for-byte reproducible`);
    }
    console.log(`ok ${definition.id}${REBUILD ? " (rebuilt)" : ""}`);
  }
  if (lockById.size !== GENERATED_DATA_ARTIFACTS.length) throw new Error("Generated-data lock has stale artifact entries");
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}

await stat(LOCK_PATH);
console.log(`Verified ${GENERATED_DATA_ARTIFACTS.length} generated artifacts and frozen source chains`);
