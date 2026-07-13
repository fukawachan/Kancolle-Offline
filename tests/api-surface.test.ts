import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { knownKcsApiPaths } from "../src/kcsapi/handlers.js";

const AUDIT_PATH = new URL("../docs/audits/2026-07-10-kancolle-parity-audit.md", import.meta.url);

describe("cached client API surface", () => {
  it("implements every one of the 138 endpoints in the audit appendix", async () => {
    const audit = await readFile(AUDIT_PATH, "utf8");
    const appendix = audit.slice(audit.indexOf("## 附录 A：138 个客户端端点矩阵"));
    const cachedClientPaths = [...appendix.matchAll(/^\| `([^`]+)` \|/gm)]
      .map((match) => match[1])
      .filter((path) => path.startsWith("api_"))
      .sort();

    expect(cachedClientPaths).toHaveLength(138);
    expect(new Set(cachedClientPaths).size).toBe(138);
    expect(knownKcsApiPaths()).toEqual(cachedClientPaths);
  });
});
