import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT_ROOT = path.resolve(process.env.DATA_SNAPSHOT_ROOT || path.join(ROOT, "data", "snapshots"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableObject(child)])
  );
}

async function writeAtomic(filename, body) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, body);
  await rename(temporary, filename);
}

function assertSafeRelativePath(filename) {
  if (!filename || path.isAbsolute(filename) || filename.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe snapshot filename: ${filename}`);
  }
}

function githubBranchUrl(url) {
  return /(?:raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?:master|main)\/|cdn\.jsdelivr\.net\/gh\/[^@/]+\/[^@/]+@(?:master|main)\/)/i.test(url);
}

function normalizedMetadata(response) {
  return {
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified")
  };
}

export function generatedOutputPath(defaultPath) {
  return path.resolve(process.env.GENERATED_OUTPUT_PATH || defaultPath);
}

export function snapshotRoot() {
  return SNAPSHOT_ROOT;
}

/**
 * Frozen-source session shared by every generated-data script.
 *
 * Normal runs are strictly offline and verify every byte against the checked-in
 * lock. `--refresh` is the only mode which may access the network and it writes
 * both the raw response and its HTTP/evidence metadata atomically.
 */
export async function createFrozenSourceSession(domain, options = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(domain)) throw new Error(`Invalid snapshot domain: ${domain}`);
  const refresh = options.refresh ?? process.argv.includes("--refresh");
  const domainRoot = path.join(SNAPSHOT_ROOT, domain);
  const rawRoot = path.join(domainRoot, "raw");
  const lockPath = path.join(domainRoot, "sources.lock.json");
  let previousLock = null;
  try {
    previousLock = JSON.parse(await readFile(lockPath, "utf8"));
  } catch (error) {
    if (!refresh) {
      throw new Error(`Missing frozen-source lock ${path.relative(ROOT, lockPath)}; run the generator with --refresh`, { cause: error });
    }
  }

  if (previousLock && (previousLock.schemaVersion !== 1 || previousLock.domain !== domain)) {
    throw new Error(`Unsupported or mismatched frozen-source lock for ${domain}`);
  }

  const previousByFile = new Map((previousLock?.sources ?? []).map((source) => [source.file, source]));
  const observed = new Map();
  const generatedAt = refresh
    ? (process.env.SOURCE_DATE_EPOCH
      ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
      : new Date().toISOString())
    : previousLock.generatedAt;

  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error(`Frozen-source lock for ${domain} has no valid generatedAt`);
  }

  async function readText(filename, url, metadata = {}) {
    assertSafeRelativePath(filename);
    if (!url || typeof url !== "string") throw new Error(`Missing source URL for ${domain}/${filename}`);
    const rawPath = path.join(rawRoot, filename);
    if (refresh) {
      let response;
      let lastError;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          response = await fetch(url, {
            headers: { "user-agent": options.userAgent || "kancolle-local-data-generator" },
            redirect: "follow",
            signal: AbortSignal.timeout(options.timeoutMs ?? 15_000)
          });
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
        }
      }
      if (!response?.ok) throw new Error(`Unable to refresh ${url}: ${String(lastError)}`);
      const body = Buffer.from(await response.arrayBuffer());
      await writeAtomic(rawPath, body);
      observed.set(filename, {
        file: filename.replaceAll(path.sep, "/"),
        requestedUrl: url,
        ...normalizedMetadata(response),
        retrievedAt: generatedAt,
        sha256: sha256(body),
        bytes: body.length,
        revision: metadata.revision ?? null,
        parameters: metadata.parameters ?? null,
        license: metadata.license ?? { spdx: "NOASSERTION", url: null, note: "Upstream terms require manual verification" },
        evidence: metadata.evidence ?? "exact"
      });
      return body.toString("utf8");
    }

    const locked = previousByFile.get(filename.replaceAll(path.sep, "/"));
    if (!locked) throw new Error(`Snapshot ${domain}/${filename} is not declared in sources.lock.json`);
    const body = await readFile(rawPath);
    const digest = sha256(body);
    if (digest !== locked.sha256 || body.length !== locked.bytes) {
      throw new Error(`Frozen source ${domain}/${filename} does not match its lock (${digest}/${body.length})`);
    }
    if (locked.requestedUrl !== url) {
      throw new Error(`Source URL drift for ${domain}/${filename}: expected ${locked.requestedUrl}, got ${url}`);
    }
    if (githubBranchUrl(url)) {
      throw new Error(`GitHub source is not pinned to a commit: ${url}`);
    }
    observed.set(filename, locked);
    return body.toString("utf8");
  }

  async function readJson(filename, url, metadata) {
    const body = await readText(filename, url, metadata);
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Invalid JSON in frozen source ${domain}/${filename}`, { cause: error });
    }
  }

  async function finalize(extra = {}) {
    if (!refresh) {
      const missing = [...previousByFile.keys()].filter((filename) => !observed.has(filename));
      if (missing.length > 0 && options.requireAllLockedSources !== false) {
        throw new Error(`Generator did not consume ${missing.length} locked ${domain} source(s): ${missing.slice(0, 5).join(", ")}`);
      }
      return previousLock;
    }
    const lock = stableObject({
      schemaVersion: 1,
      domain,
      generatedAt,
      generator: options.generator ?? null,
      ...extra,
      sources: [...observed.values()].sort((left, right) => left.file.localeCompare(right.file))
    });
    await writeAtomic(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    return lock;
  }

  return {
    domain,
    refresh,
    generatedAt,
    readText,
    readJson,
    finalize,
    source(filename) {
      return observed.get(filename) ?? previousByFile.get(filename) ?? null;
    }
  };
}

export const digestSha256 = sha256;
