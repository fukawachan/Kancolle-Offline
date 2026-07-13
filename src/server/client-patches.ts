const SLOTSET_COMPLETED_END = `_0x575abe[_0x3473c9(0x261e)][_0x3473c9(0x4e4)]=function(){var _0x141860=_0x3473c9;_0x3d7c18[_0x141860(0x1483)][_0x141860(0x2e53)][_0x141860(0x1343)][_0x141860(0xd84)](this[_0x141860(0x1a59)])[_0x141860(0x2add)](this[_0x141860(0x11d)],this[_0x141860(0x25d5)]),this[_0x141860(0x2993)](),_0x52c48a[_0x141860(0x261e)][_0x141860(0x4e4)][_0x141860(0x2c47)](this);}`;

const PATCHED_SLOTSET_COMPLETED_END = `_0x575abe[_0x3473c9(0x261e)][_0x3473c9(0x4e4)]=function(){var _0x141860=_0x3473c9,_0x15d4d6=_0x3d7c18["default"]["model"]["ship"]["get"](this["api_id"]),_0x465758=this["_raw_data"]&&(this["_raw_data"]["api_ship_data"]||this["_raw_data"]);/*__KANCOLLE_LOCAL_SLOTSET_PATCH__*/_0x465758&&_0x465758["api_id"]?_0x15d4d6["__update__"](_0x465758):_0x15d4d6["__updateSlot__"](this["api_slot_idx"],this["api_item_id"]),this["_set_bauxite"](),_0x52c48a["prototype"]["_completedEnd"]["call"](this);}`;

const EVENT_AREA_ID_ASSIGNMENT = `_0x401221[_0x27624d(0x1a1f)]=-0x1`;

const STARTUP_TITLE_CALL = `_0x3c6b28[_0x5ecac2(0x261e)][_0x5ecac2(0x1a35)]=function(){var _0x181ed9=_0x5ecac2,_0x2b5bdd=this,_0x31382d=Math[_0x181ed9(0x2a7f)](0x67*Math[_0x181ed9(0x14ba)]())+0x1;_0xebe4cc[_0x181ed9(0x1483)][_0x181ed9(0x2e21)][_0x181ed9(0x2dcd)][_0x181ed9(0x1bb2)](_0x181ed9(0x1aea),_0x31382d,function(){var _0x36c6c7=_0x181ed9,_0x8003b6=Math[_0x36c6c7(0x2a7f)](0x40*Math[_0x36c6c7(0x14ba)]())+0x1;_0xebe4cc[_0x36c6c7(0x1483)][_0x36c6c7(0x2e21)][_0x36c6c7(0x2dcd)][_0x36c6c7(0x1bb2)](_0x36c6c7(0xb0b),_0x8003b6,function(){var _0x2372d8=_0x36c6c7;_0x2b5bdd[_0x2372d8(0x2f89)]=!0x0,_0x2b5bdd[_0x2372d8(0x1b5c)]();});}),_0x562b43[_0x181ed9(0x1fc6)]&&_0xebe4cc[_0x181ed9(0x1483)][_0x181ed9(0x2e21)][_0x181ed9(0x33bf)][_0x181ed9(0x1bb2)](0x0,!0x1);}`;

const PATCHED_STARTUP_TITLE_CALL = `_0x3c6b28[_0x5ecac2(0x261e)][_0x5ecac2(0x1a35)]=function(){var _0x181ed9=_0x5ecac2,_0x2b5bdd=this,_0x31382d=Math.floor(0x67*Math.random())+0x1,_0xfinish=function(){if(!_0x2b5bdd["_finishedPlayTitleCallTask"]){_0x2b5bdd["_finishedPlayTitleCallTask"]=!0x0,_0x2b5bdd["_nextTask"]();}};_0xebe4cc["default"]["sound"]["voice"]["play"]("titlecall_1",_0x31382d,function(){var _0x8003b6=Math.floor(0x40*Math.random())+0x1;_0xebe4cc["default"]["sound"]["voice"]["play"]("titlecall_2",_0x8003b6,_0xfinish);}),_0x562b43["HTML5_AUDIO"]&&_0xebe4cc["default"]["sound"]["bgm"]["play"](0x0,!0x1),setTimeout(_0xfinish,0x9c4);/*__KANCOLLE_LOCAL_TITLECALL_TIMEOUT_PATCH__*/}`;

export type ClientPatchOptions = {
  activeEventAreaId?: number | null;
};

export function patchKcsMainJs(source: string, options: ClientPatchOptions = {}) {
  const occurrences = source.split(SLOTSET_COMPLETED_END).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Unable to apply slotset client patch: expected 1 match, found ${occurrences}`);
  }
  const withSlotsetPatch = source.replace(SLOTSET_COMPLETED_END, PATCHED_SLOTSET_COMPLETED_END);
  const titleCallOccurrences = withSlotsetPatch.split(STARTUP_TITLE_CALL).length - 1;
  if (titleCallOccurrences !== 1) {
    throw new Error(`Unable to apply title-call timeout patch: expected 1 match, found ${titleCallOccurrences}`);
  }
  const withTitleCallPatch = withSlotsetPatch.replace(STARTUP_TITLE_CALL, PATCHED_STARTUP_TITLE_CALL);
  const eventOccurrences = withTitleCallPatch.split(EVENT_AREA_ID_ASSIGNMENT).length - 1;
  if (eventOccurrences !== 1) {
    throw new Error(`Unable to apply event area client patch: expected 1 match, found ${eventOccurrences}`);
  }
  const activeEventAreaId = Math.trunc(Number(options.activeEventAreaId ?? -1));
  const encodedAreaId = activeEventAreaId > 0 ? `0x${activeEventAreaId.toString(16)}` : "-0x1";
  return withTitleCallPatch.replace(
    EVENT_AREA_ID_ASSIGNMENT,
    `_0x401221[_0x27624d(0x1a1f)]=${encodedAreaId}/*__KANCOLLE_LOCAL_EVENT_AREA_PATCH__*/`
  );
}
