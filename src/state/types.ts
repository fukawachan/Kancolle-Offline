export type JsonObject = Record<string, unknown>;

export type Player = {
  id: number;
  worldId: number;
  nickname: string;
  level: number;
  exp: number;
  comment: string;
  tutorialProgress: number;
  options: PlayerOptions;
  flagshipPosition: number;
  combinedFleet: number;
  portBgmId: number;
  maxChara: number;
  maxSlotItem: number;
};

export type PlayerOptions = {
  bgmFlag: number;
  voiceFlag: number;
  seFlag: number;
  volBgm: number;
  volSe: number;
  volVoice: number;
};

export type Materials = {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
  buildKit: number;
  repairKit: number;
  devmat: number;
  screw: number;
};

export type Ship = {
  id: number;
  masterId: number;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  condition: number;
  fuel: number;
  maxFuel: number;
  ammo: number;
  maxAmmo: number;
  locked: number;
  slotIds: number[];
  onSlot: number[];
  exSlotId: number;
  stats: JsonObject;
  marriedAt: number;
  marriageHpBonus: number;
  marriageLuckBonus: number;
};

export type SlotItem = {
  id: number;
  masterId: number;
  level: number;
  proficiency: number;
  proficiencyExp: number;
  locked: number;
};

export type AirBaseSquadron = {
  squadronId: number;
  slotItemId: number;
  state: number;
  count: number;
  maxCount: number;
  condition: number;
};

export type AirBase = {
  areaId: number;
  baseId: number;
  name: string;
  actionKind: number;
  distanceBase: number;
  distanceBonus: number;
  maintenanceLevel: number;
  squadrons: AirBaseSquadron[];
};

export type PresetSlotItem = {
  masterId: number;
  level: number;
};

export type PresetSlot = {
  presetNo: number;
  name: string;
  slotItems: PresetSlotItem[];
  exSlotItem: PresetSlotItem | null;
  exSlotFlag: number;
  locked: number;
  selectedMode: number;
};

export type PresetSlotSettings = {
  maxNum: number;
};

export type PresetDeck = {
  presetNo: number;
  name: string;
  shipIds: number[];
  locked: number;
};

export type PresetDeckSettings = {
  maxNum: number;
};

export type Deck = {
  id: number;
  name: string;
  missionState: MissionState;
  shipIds: number[];
};

export type MissionState = {
  state: number;
  missionId: number;
  completeTime: number;
};

export type ExpeditionProgress = {
  missionId: number;
  unlocked: number;
  completedCount: number;
  periodKey: string;
  periodCount: number;
};

export type ExpeditionRun = {
  deckId: number;
  missionId: number;
  status: "active" | "returning" | "claimed";
  serialCid: string;
  seed: number;
  startedAt: number;
  completeAt: number;
  snapshot: JsonObject;
  outcome: JsonObject | null;
  result: JsonObject | null;
  supportCount: number;
};

export type ExpeditionSettings = {
  fixedSeed: number | null;
  clockOffsetMs: number;
  unlockAll: number;
};

export type RecordStats = {
  battleWin: number;
  battleLose: number;
  practiceWin: number;
  practiceLose: number;
  missionCount: number;
  missionSuccess: number;
};

export type UseItemInventory = {
  id: number;
  count: number;
};

export type RepairDock = {
  id: number;
  shipId: number;
  completeTime: number;
  state: number;
};

export type BuildDock = {
  id: number;
  recipe: JsonObject;
  resultMasterId: number;
  completeTime: number;
  state: number;
};

export type Quest = {
  id: number;
  active: number;
  progress: number;
  completed: number;
  periodKey: string;
  progressData: JsonObject;
};

export type FurnitureState = {
  owned: number[];
  set: {
    api_floor: number;
    api_wall: number;
    api_window: number;
    api_chest: number;
    api_desk: number;
    api_object: number;
  };
  coins: number;
};

export type MapState = {
  id: number;
  areaId: number;
  mapNo: number;
  unlocked: number;
  cleared: number;
  gauge: number;
  phase: number;
  phaseProgress: number;
};

export type SortieSession = {
  id: number;
  deckId: number;
  areaId: number;
  mapNo: number;
  node: number;
  seed: number;
  state: JsonObject;
};

export type SaveState = {
  player: Player;
  materials: Materials;
  ships: Ship[];
  slotItems: SlotItem[];
  airBases: AirBase[];
  presetSlots: PresetSlot[];
  presetSlotSettings: PresetSlotSettings;
  presetDecks: PresetDeck[];
  presetDeckSettings: PresetDeckSettings;
  decks: Deck[];
  repairDocks: RepairDock[];
  buildDocks: BuildDock[];
  quests: Quest[];
  furniture: FurnitureState;
  maps: MapState[];
  sortieSession: SortieSession | null;
  expeditionProgress: ExpeditionProgress[];
  expeditionRuns: ExpeditionRun[];
  expeditionSettings: ExpeditionSettings;
  recordStats: RecordStats;
  useItems: UseItemInventory[];
};

export type MaterialDelta = Partial<Record<keyof Materials, number>>;
