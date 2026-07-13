export type PublishedLandBaseRange = Readonly<{
  mapId: number;
  point: string;
  requiredDistance: number;
  source: string;
  checkedAt: string;
}>;

/**
 * Fail-closed snapshot of publicly stated normal-map distances. Entries are
 * added only when the source states an exact cell distance; an absent cell is
 * not approximated from graph hop count or screen coordinates.
 */
export const PUBLISHED_LAND_BASE_RANGES: readonly PublishedLandBaseRange[] = Object.freeze([
  range(64, "B", 1, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"),
  range(64, "J", 6, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"),
  range(64, "K", 7, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"),
  range(64, "M", 8, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"),
  range(64, "N", 5, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"),
  range(65, "M", 5, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-5"),
  range(74, "C", 7, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-4"),
  range(74, "P", 2, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-4")
]);

const RANGE_BY_MAP_POINT = new Map(
  PUBLISHED_LAND_BASE_RANGES.map((entry) => [`${entry.mapId}:${entry.point}`, entry] as const)
);

export function publishedLandBaseRange(mapId: number, point: string) {
  return RANGE_BY_MAP_POINT.get(`${Math.trunc(mapId)}:${String(point).trim()}`) ?? null;
}

function range(mapId: number, point: string, requiredDistance: number, source: string): PublishedLandBaseRange {
  return Object.freeze({
    mapId,
    point,
    requiredDistance,
    source,
    checkedAt: "2026-07-12"
  });
}
