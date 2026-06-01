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
};

export type ResourceManifest = {
  ship: ShipResourceManifest;
  slot: SlotResourceManifest;
  furniture: FurnitureResourceManifest;
  bgm: BgmResourceManifest;
};
