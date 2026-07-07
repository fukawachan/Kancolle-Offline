import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { patchKcsMainJs } from "../src/server/client-patches.js";

describe("cached client compatibility patches", () => {
  it("updates slotset completion to consume the full ship payload", async () => {
    const source = await readFile(path.resolve("cache/kcs2/js/main.js"), "utf8");
    const originalUpdateSlotCalls = source.match(/__updateSlot__/g) ?? [];

    const patched = patchKcsMainJs(source);

    expect(patched).not.toBe(source);
    expect(patched.match(/__KANCOLLE_LOCAL_SLOTSET_PATCH__/g)).toHaveLength(1);
    expect(patched).toContain("api_ship_data");
    expect(patched).toContain("__update__");
    expect(patched).toContain("__updateSlot__");
    expect(patched.match(/__updateSlot__/g)).toHaveLength(originalUpdateSlotCalls.length + 1);
  });
});
