import { createRequire } from "node:module";
import type { RoutingMap } from "./routing.js";

type GeneratedRoutingData = {
  generatedAt: string;
  sources: Record<string, string>;
  maps: RoutingMap[];
};

const require = createRequire(import.meta.url);
const GENERATED = require("./routing-data.generated.json") as GeneratedRoutingData;
const MAP_BY_ID = new Map(GENERATED.maps.map((map) => [map.mapId, map]));

export function normalRoutingMaps() {
  return GENERATED.maps;
}

export function normalRoutingMap(areaId: number, mapNo: number) {
  return MAP_BY_ID.get(Math.trunc(areaId) * 10 + Math.trunc(mapNo));
}
