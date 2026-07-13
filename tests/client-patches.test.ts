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

  it("patches the cached client event area id when an event is active", async () => {
    const source = await readFile(path.resolve("cache/kcs2/js/main.js"), "utf8");

    const inactive = patchKcsMainJs(source, { activeEventAreaId: null });
    const active = patchKcsMainJs(source, { activeEventAreaId: 61 });

    expect(inactive).toContain("__KANCOLLE_LOCAL_EVENT_AREA_PATCH__");
    expect(inactive).toContain("_0x401221[_0x27624d(0x1a1f)]=-0x1/*__KANCOLLE_LOCAL_EVENT_AREA_PATCH__*/");
    expect(active).toContain("__KANCOLLE_LOCAL_EVENT_AREA_PATCH__");
    expect(active).toContain("_0x401221[_0x27624d(0x1a1f)]=0x3d/*__KANCOLLE_LOCAL_EVENT_AREA_PATCH__*/");
  });

  it("cannot deadlock startup when browser audio callbacks are suppressed", async () => {
    const source = await readFile(path.resolve("cache/kcs2/js/main.js"), "utf8");
    const patched = patchKcsMainJs(source);

    expect(patched.match(/__KANCOLLE_LOCAL_TITLECALL_TIMEOUT_PATCH__/g)).toHaveLength(1);
    expect(patched).toContain("setTimeout(_0xfinish,0x9c4)");
    expect(patched).toContain('if(!_0x2b5bdd["_finishedPlayTitleCallTask"])');
  });
});
