export type CachedResourceMeta = {
  version?: string;
  lastmodified?: string;
  length?: number;
  cache?: string | null;
};

export type FileResource = {
  id: number;
  frame: string;
  pathname: string;
  filePath: string;
  extension: string;
  version?: string;
  filename?: string;
  lastModified?: string;
  length?: number;
  cache?: string | null;
};

export type ShipResourceManifest = {
  albumStatus: Map<number, FileResource>;
  banner: Map<number, FileResource>;
  card: Map<number, FileResource>;
  full: Map<number, FileResource>;
};

export type SlotResourceManifest = {
  card: Map<number, FileResource>;
  cardThumbnail: Map<number, FileResource>;
  btxtFlat: Map<number, FileResource>;
  itemOn: Map<number, FileResource>;
  itemUp: Map<number, FileResource>;
};

export type FurnitureResourceManifest = {
  normal: Map<number, FileResource>;
  movable: Map<number, FileResource>;
  scripts: Map<number, FileResource>;
  thumbnail: Map<number, FileResource>;
};

export type BgmResourceManifest = {
  port: Map<number, FileResource>;
  battle: Map<number, FileResource>;
  fanfare: Map<number, FileResource>;
};

export type MapFileResource = FileResource & {
  areaId: number;
  mapNo: number;
};

export type MapSpot = {
  no: number;
  x?: number;
  y?: number;
  line?: unknown;
};

export type MapResourceManifest = {
  thumbnail: Map<number, MapFileResource>;
  image: Map<number, MapFileResource>;
  info: Map<number, MapFileResource>;
  spots: Map<number, MapSpot[]>;
};

export type ShipVoiceResource = {
  shipId?: number;
  key: string;
  files: Set<string>;
  availableVoiceNos: Set<number>;
};

export type VoiceResourceManifest = {
  byShipId: Map<number, ShipVoiceResource>;
  byKey: Map<string, ShipVoiceResource>;
};

export type ResourceManifest = {
  ship: ShipResourceManifest;
  slot: SlotResourceManifest;
  furniture: FurnitureResourceManifest;
  bgm: BgmResourceManifest;
  map: MapResourceManifest;
  voice: VoiceResourceManifest;
};
