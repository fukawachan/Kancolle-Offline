const SLOTSET_COMPLETED_END = `_0x575abe[_0x3473c9(0x261e)][_0x3473c9(0x4e4)]=function(){var _0x141860=_0x3473c9;_0x3d7c18[_0x141860(0x1483)][_0x141860(0x2e53)][_0x141860(0x1343)][_0x141860(0xd84)](this[_0x141860(0x1a59)])[_0x141860(0x2add)](this[_0x141860(0x11d)],this[_0x141860(0x25d5)]),this[_0x141860(0x2993)](),_0x52c48a[_0x141860(0x261e)][_0x141860(0x4e4)][_0x141860(0x2c47)](this);}`;

const PATCHED_SLOTSET_COMPLETED_END = `_0x575abe[_0x3473c9(0x261e)][_0x3473c9(0x4e4)]=function(){var _0x141860=_0x3473c9,_0x15d4d6=_0x3d7c18["default"]["model"]["ship"]["get"](this["api_id"]),_0x465758=this["_raw_data"]&&(this["_raw_data"]["api_ship_data"]||this["_raw_data"]);/*__KANCOLLE_LOCAL_SLOTSET_PATCH__*/_0x465758&&_0x465758["api_id"]?_0x15d4d6["__update__"](_0x465758):_0x15d4d6["__updateSlot__"](this["api_slot_idx"],this["api_item_id"]),this["_set_bauxite"](),_0x52c48a["prototype"]["_completedEnd"]["call"](this);}`;

const EVENT_AREA_ID_ASSIGNMENT = `_0x401221[_0x27624d(0x1a1f)]=-0x1`;

export type ClientPatchOptions = {
  activeEventAreaId?: number | null;
};

export function patchKcsMainJs(source: string, options: ClientPatchOptions = {}) {
  const occurrences = source.split(SLOTSET_COMPLETED_END).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Unable to apply slotset client patch: expected 1 match, found ${occurrences}`);
  }
  const withSlotsetPatch = source.replace(SLOTSET_COMPLETED_END, PATCHED_SLOTSET_COMPLETED_END);
  const eventOccurrences = withSlotsetPatch.split(EVENT_AREA_ID_ASSIGNMENT).length - 1;
  if (eventOccurrences !== 1) {
    throw new Error(`Unable to apply event area client patch: expected 1 match, found ${eventOccurrences}`);
  }
  const activeEventAreaId = Math.trunc(Number(options.activeEventAreaId ?? -1));
  const encodedAreaId = activeEventAreaId > 0 ? `0x${activeEventAreaId.toString(16)}` : "-0x1";
  return withSlotsetPatch.replace(
    EVENT_AREA_ID_ASSIGNMENT,
    `_0x401221[_0x27624d(0x1a1f)]=${encodedAreaId}/*__KANCOLLE_LOCAL_EVENT_AREA_PATCH__*/`
  );
}
