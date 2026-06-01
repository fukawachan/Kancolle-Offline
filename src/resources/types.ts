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
  full: Map<number, FileResource>;
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
  furniture: FurnitureResourceManifest;
  bgm: BgmResourceManifest;
};
