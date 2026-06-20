import { QUEST_BY_ID, QUEST_DEFINITIONS, QUEST_PAGE_SIZE, type QuestDefinition, type QuestRequirement } from "../master/quest-data.js";
import { masterData } from "../master/data.js";
import type { JsonObject, Quest, SaveState, Ship } from "../state/types.js";

export type QuestEvent =
  | { kind: "sortie"; map?: string; boss?: boolean; result?: string; sinks?: string[] }
  | { kind: "practice"; result?: string; victory?: boolean }
  | { kind: "expedition"; missionId?: number; success?: boolean }
  | { kind: "simple"; subcategory: string; amount?: number }
  | { kind: "scrapequipment"; names?: string[]; amount?: number }
  | { kind: "modelconversion"; names?: string[]; amount?: number }
  | { kind: "equipexchange"; names?: string[]; amount?: number };

export type QuestListOptions = {
  tabId?: number;
  pageNo?: number;
};

export type QuestEvaluation = {
  achieved: boolean;
  progressFlag: number;
};

type QuestListEntry = {
  definition: QuestDefinition;
  state: Quest;
  evaluation: QuestEvaluation;
};

const SORTIE_RESULT_ORDER = ["E", "D", "C", "B", "A", "S", "SS"];
const CLIENT_ACTIVE_QUEST_TAB_ID = 9;
const CLIENT_PERIOD_TABS: Record<number, QuestDefinition["period"]> = {
  1: "daily",
  2: "weekly",
  3: "monthly",
  4: "quarterly",
  5: "once"
};
const SHIP_TYPE_ALIASES = new Map<string, number[]>([
  ["海防艦", [1]],
  ["駆逐", [2]],
  ["駆逐艦", [2]],
  ["軽巡", [3]],
  ["軽巡洋艦", [3]],
  ["雷巡", [4]],
  ["重巡", [5]],
  ["重巡洋艦", [5]],
  ["航巡", [6]],
  ["航空巡洋艦", [6]],
  ["軽母", [7]],
  ["軽空母", [7]],
  ["戦艦", [8, 9, 10]],
  ["高速戦艦", [8]],
  ["低速戦艦", [9]],
  ["航戦", [10]],
  ["航空戦艦", [10]],
  ["正空", [11, 18]],
  ["正規空母", [11, 18]],
  ["空母", [7, 11, 18]],
  ["潜水艦", [13, 14]],
  ["潜母", [14]],
  ["潜水空母", [14]],
  ["水母", [16]],
  ["水上機母艦", [16]],
  ["揚陸艦", [17]],
  ["装甲空母", [18]],
  ["工作艦", [19]],
  ["潜水母艦", [20]],
  ["練巡", [21]],
  ["練習巡洋艦", [21]],
  ["補給艦", [22]]
]);
const EQUIPMENT_TYPE_ALIASES = new Map<string, number[]>([
  ["小口径主砲", [1]],
  ["中口径主砲", [2]],
  ["大口径主砲", [3]],
  ["副砲", [4]],
  ["魚雷", [5]],
  ["艦上戦闘機", [6]],
  ["艦戦", [6]],
  ["艦上爆撃機", [7]],
  ["艦爆", [7]],
  ["艦上攻撃機", [8]],
  ["艦攻", [8]],
  ["艦上偵察機", [9]],
  ["偵察機", [9, 10]],
  ["水上偵察機", [10]],
  ["電探", [12, 13]],
  ["対空機銃", [21]],
  ["機銃", [21]],
  ["対潜装備", [14, 15, 25, 26]]
]);

export function buildQuestList(save: SaveState, options: QuestListOptions = {}) {
  const tabId = Math.max(0, Math.trunc(options.tabId ?? 0));
  const requestedPageNo = options.pageNo == null ? undefined : Math.max(1, Math.trunc(options.pageNo));
  const questStates = questStateMap(save.quests);
  const visible = QUEST_DEFINITIONS
    .filter((definition) => definitionMatchesQuestListTab(definition, questStates.get(definition.id), tabId));

  const completedIds = visible
    .filter((definition) => questStates.get(definition.id)?.completed === 1)
    .map((definition) => definition.id);

  const listable = visible
    .filter((definition) => questStates.get(definition.id)?.completed !== 1)
    .map((definition) => buildQuestListEntry(definition, save, questStates.get(definition.id) ?? defaultQuestState(definition.id)));

  const pageCount = Math.max(1, Math.ceil(listable.length / QUEST_PAGE_SIZE));
  const currentPage = Math.min(requestedPageNo ?? 1, pageCount);
  const start = (currentPage - 1) * QUEST_PAGE_SIZE;
  const page = requestedPageNo == null ? listable : listable.slice(start, start + QUEST_PAGE_SIZE);

  return {
    api_count: listable.length,
    api_completed_kind: completedIds.length > 0 ? 1 : 0,
    api_page_count: pageCount,
    api_disp_page: currentPage,
    api_list: page.map(toQuestListItem),
    api_c_list: completedIds,
    api_exec_count: save.quests.filter((quest) => quest.active === 1 && quest.completed !== 1).length,
    api_exec_type: 0
  };
}

export function questIsVisible(save: SaveState, questId: number) {
  return QUEST_BY_ID.has(questId);
}

export function evaluateQuest(definition: QuestDefinition, save: SaveState, state: Quest): QuestEvaluation {
  return evaluateRequirement(definition.requirements, save, state, "root");
}

export function advanceQuestProgress(
  definition: QuestDefinition,
  save: SaveState,
  state: Quest,
  event: QuestEvent
) {
  const progressData = { ...state.progressData };
  advanceRequirement(definition.requirements, save, event, progressData, "root");
  const nextState = {
    ...state,
    progressData
  };
  const evaluation = evaluateQuest(definition, save, nextState);
  return {
    progressData,
    progressFlag: evaluation.achieved ? 0 : evaluation.progressFlag
  };
}

export function currentQuestPeriodKey(period: QuestDefinition["period"], now = Date.now()) {
  if (period === "once") return "once";
  const jst = new Date(now + 9 * 60 * 60_000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  if (period === "daily") return `${year}-${pad(month)}-${pad(day)}`;
  if (period === "weekly") return `${year}-W${pad(jstWeek(jst))}`;
  if (period === "monthly") return `${year}-${pad(month)}`;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function buildQuestListEntry(definition: QuestDefinition, save: SaveState, state: Quest): QuestListEntry {
  const evaluation = state.active === 1 && state.completed !== 1
    ? evaluateQuest(definition, save, state)
    : { achieved: false, progressFlag: state.progress };
  return { definition, state, evaluation };
}

function toQuestListItem(entry: QuestListEntry) {
  const { definition, state, evaluation } = entry;
  return {
    api_no: definition.id,
    api_category: definition.category,
    api_type: definition.type,
    api_state: state.completed === 1 ? 3 : evaluation.achieved ? 3 : state.active === 1 ? 2 : 1,
    api_title: definition.title,
    api_detail: definition.detail,
    api_voice_id: 0,
    api_get_material: definition.materialRewards,
    api_bonus_flag: definition.rewards.length > 0 ? 1 : 0,
    api_progress_flag: evaluation.achieved ? 0 : evaluation.progressFlag,
    api_select_rewards: selectRewards(definition)
  };
}

function selectRewards(definition: QuestDefinition) {
  const choices = definition.rewards.filter((reward) => reward.kind === "choice");
  if (choices.length === 0) return undefined;
  return choices.map((reward, index) => ({
    api_no: index + 1,
    api_reward: reward.choices.map((choice, choiceIndex) => ({
      api_no: choiceIndex + 1,
      api_kind: choice.kind,
      api_name: "name" in choice ? choice.name : "",
      api_count: "amount" in choice ? choice.amount ?? 1 : 1
    }))
  }));
}

function definitionMatchesQuestListTab(definition: QuestDefinition, state: Quest | undefined, tabId: number) {
  if (tabId <= 0) return true;
  if (tabId === CLIENT_ACTIVE_QUEST_TAB_ID) return state?.active === 1 && state.completed !== 1;
  const period = CLIENT_PERIOD_TABS[tabId];
  return period == null ? false : definition.period === period;
}

function questStateMap(quests: readonly Quest[]) {
  return new Map(quests.map((quest) => [quest.id, quest] as const));
}

function defaultQuestState(id: number): Quest {
  return {
    id,
    active: 0,
    progress: 0,
    completed: 0,
    periodKey: currentQuestPeriodKey(QUEST_BY_ID.get(id)?.period ?? "once"),
    progressData: {}
  };
}

function evaluateRequirement(requirement: QuestRequirement, save: SaveState, state: Quest, path: string): QuestEvaluation {
  const category = String(requirement.category ?? "");
  if (category === "and" || category === "then") {
    const children = requirementList(requirement).map((item, index) => evaluateRequirement(item, save, state, `${path}.${index}`));
    return combineAll(children);
  }
  if (category === "or") {
    const children = requirementList(requirement).map((item, index) => evaluateRequirement(item, save, state, `${path}.${index}`));
    return combineAny(children);
  }
  if (category === "fleet") return evaluateFleetRequirement(requirement, save);
  if (category === "scrapequipment") return evaluateEquipmentProgress(scrapItems(requirement), state, path);
  if (category === "modelconversion") return evaluateEquipmentProgress(scrapItems(requirement), state, path);
  if (category === "equipexchange") {
    const checks: QuestEvaluation[] = [];
    const required = requiredEquipmentItems(requirement);
    const scraps = scrapItems(requirement);
    if (required.length > 0) checks.push(evaluateEquipmentPossession(required, save));
    if (scraps.length > 0) checks.push(evaluateEquipmentProgress(scraps, state, path));
    if (Array.isArray(requirement.resources)) checks.push(evaluateResourceRequirement(requirement.resources, save));
    return checks.length > 0 ? combineAll(checks) : { achieved: true, progressFlag: 0 };
  }

  const target = requirementTarget(requirement);
  const current = progressCount(state.progressData, path);
  return countEvaluation(current, target);
}

function advanceRequirement(
  requirement: QuestRequirement,
  save: SaveState,
  event: QuestEvent,
  progressData: JsonObject,
  path: string
) {
  const category = String(requirement.category ?? "");
  if (category === "and" || category === "or" || category === "then") {
    requirementList(requirement).forEach((item, index) => advanceRequirement(item, save, event, progressData, `${path}.${index}`));
    return;
  }
  if (category === "fleet") return;
  if (category === "scrapequipment") {
    advanceEquipmentProgress(scrapItems(requirement), event, progressData, path, "scrapequipment");
    return;
  }
  if (category === "modelconversion") {
    advanceEquipmentProgress(scrapItems(requirement), event, progressData, path, "modelconversion");
    return;
  }
  if (category === "equipexchange") {
    advanceEquipmentProgress(scrapItems(requirement), event, progressData, path, "equipexchange");
    return;
  }
  if (!eventMatchesRequirement(requirement, save, event)) return;
  const current = progressCount(progressData, path);
  progressData[path] = current + Math.max(1, Math.trunc("amount" in event ? Number(event.amount ?? 1) : 1));
}

function eventMatchesRequirement(requirement: QuestRequirement, save: SaveState, event: QuestEvent) {
  const category = String(requirement.category ?? "");
  if (category === "sortie") {
    if (event.kind !== "sortie") return false;
    if (!mapMatches(requirement.map, event.map)) return false;
    if (requirement.boss === true && event.boss !== true) return false;
    if (typeof requirement.result === "string" && !resultAtLeast(event.result, requirement.result)) return false;
    return groupsMatch(requirement.groups, currentFleetShips(save));
  }
  if (category === "sink") return event.kind === "sortie";
  if (category === "a-gou") return event.kind === "sortie";
  if (category === "excercise") {
    if (event.kind !== "practice") return false;
    if (requirement.victory === true && event.victory === false) return false;
    return groupsMatch(requirement.groups, currentFleetShips(save));
  }
  if (category === "expedition") return event.kind === "expedition" && event.success !== false;
  if (category === "simple") {
    if (event.kind !== "simple") return false;
    const subcategory = String(requirement.subcategory ?? "");
    return subcategory === "" || subcategory === event.subcategory;
  }
  if (category === "modernization") return event.kind === "simple" && event.subcategory === "modernization";
  return false;
}

function evaluateFleetRequirement(requirement: QuestRequirement, save: SaveState): QuestEvaluation {
  const matched = groupsMatch(requirement.groups, currentFleetShips(save));
  return { achieved: matched, progressFlag: 0 };
}

function groupsMatch(rawGroups: unknown, ships: Ship[]) {
  if (!Array.isArray(rawGroups) || rawGroups.length === 0) return true;
  return rawGroups.every((group) => groupMatches(isRecord(group) ? group : {}, ships));
}

function groupMatches(group: Record<string, unknown>, ships: Ship[]) {
  const candidates = candidateShipsForGroup(group, ships);
  const required = Math.max(1, Math.trunc(Number(group.amount ?? group.select ?? 1)));
  if (group.flagship === true) return candidates.some((ship) => ship.id === ships[0]?.id);
  if (group.place != null) {
    const index = Math.max(0, Math.trunc(Number(group.place)) - 1);
    const ship = ships[index];
    return ship != null && candidates.some((candidate) => candidate.id === ship.id);
  }
  return candidates.length >= required;
}

function candidateShipsForGroup(group: Record<string, unknown>, ships: Ship[]) {
  const selector = group.ship ?? group.shipclass;
  if (selector == null) return ships;
  return ships.filter((ship) => shipMatchesSelector(ship, selector));
}

function shipMatchesSelector(ship: Ship, selector: unknown): boolean {
  if (Array.isArray(selector)) return selector.some((item) => shipMatchesSelector(ship, item));
  const token = String(selector ?? "");
  if (!token || token === "艦") return true;
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  if (!master) return false;
  if (master.api_name === token) return true;
  const typeIds = SHIP_TYPE_ALIASES.get(token);
  if (typeIds?.includes(Number(master.api_stype))) return true;
  const stype = masterData.api_mst_stype.find((item) => item.api_id === Number(master.api_stype));
  return typeof stype?.api_name === "string" && (stype.api_name === token || stype.api_name.startsWith(token));
}

function currentFleetShips(save: SaveState) {
  const deck = save.decks.find((item) => item.id === 1) ?? save.decks[0];
  if (!deck) return [];
  return deck.shipIds
    .filter((id) => id > 0)
    .map((id) => save.ships.find((ship) => ship.id === id))
    .filter((ship): ship is Ship => ship != null);
}

function requirementList(requirement: QuestRequirement) {
  return Array.isArray(requirement.list)
    ? requirement.list.filter(isRecord) as QuestRequirement[]
    : [];
}

function requirementTarget(requirement: QuestRequirement) {
  if (Number.isFinite(Number(requirement.times))) return Math.max(1, Math.trunc(Number(requirement.times)));
  if (Number.isFinite(Number(requirement.amount))) return Math.max(1, Math.trunc(Number(requirement.amount)));
  if (Array.isArray(requirement.objects)) {
    const first = requirement.objects.find(isRecord);
    if (first && Number.isFinite(Number(first.times))) return Math.max(1, Math.trunc(Number(first.times)));
  }
  if (String(requirement.category) === "a-gou") return 36;
  return 1;
}

type EquipmentRequirementItem = { name: string; amount: number };

function scrapItems(requirement: QuestRequirement): EquipmentRequirementItem[] {
  const raw = requirement.list ?? requirement.scraps;
  return equipmentRequirementItems(raw);
}

function requiredEquipmentItems(requirement: QuestRequirement): EquipmentRequirementItem[] {
  return equipmentRequirementItems(requirement.equipments ?? requirement.equipment);
}

function equipmentRequirementItems(raw: unknown): EquipmentRequirementItem[] {
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return values.flatMap((value) => {
    if (typeof value === "string") return [{ name: value, amount: 1 }];
    if (!isRecord(value)) return [];
    const name = String(value.name ?? value.equipment ?? "");
    if (!name) return [];
    return [{ name, amount: Math.max(1, Math.trunc(Number(value.amount ?? 1))) }];
  });
}

function evaluateEquipmentProgress(items: EquipmentRequirementItem[], state: Quest, path: string): QuestEvaluation {
  if (items.length === 0) return { achieved: true, progressFlag: 0 };
  return combineAll(items.map((item) => countEvaluation(progressCount(state.progressData, equipmentProgressKey(path, item.name)), item.amount)));
}

function advanceEquipmentProgress(
  items: EquipmentRequirementItem[],
  event: QuestEvent,
  progressData: JsonObject,
  path: string,
  eventKind: "scrapequipment" | "modelconversion" | "equipexchange"
) {
  if (event.kind !== eventKind || !Array.isArray(event.names) || items.length === 0) return;
  for (const actualName of event.names) {
    const item = items.find((candidate) =>
      equipmentNameMatches(candidate.name, actualName) &&
      progressCount(progressData, equipmentProgressKey(path, candidate.name)) < candidate.amount
    );
    if (!item) continue;
    const key = equipmentProgressKey(path, item.name);
    progressData[key] = progressCount(progressData, key) + 1;
  }
}

function evaluateEquipmentPossession(items: EquipmentRequirementItem[], save: SaveState): QuestEvaluation {
  if (items.length === 0) return { achieved: true, progressFlag: 0 };
  return combineAll(items.map((item) => countEvaluation(countOwnedEquipment(save, item.name), item.amount)));
}

function countOwnedEquipment(save: SaveState, requiredName: string) {
  const equipped = new Set(save.ships.flatMap((ship) => [...ship.slotIds, ship.exSlotId]).filter((id) => id > 0));
  return save.slotItems.filter((item) => {
    if (equipped.has(item.id)) return false;
    const master = masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId);
    return master != null && equipmentNameMatches(requiredName, String(master.api_name ?? ""));
  }).length;
}

function evaluateResourceRequirement(rawResources: unknown, save: SaveState): QuestEvaluation {
  const resources = Array.isArray(rawResources) ? rawResources.map((value) => Math.max(0, Math.trunc(Number(value) || 0))) : [];
  const values = [save.materials.fuel, save.materials.ammo, save.materials.steel, save.materials.bauxite];
  const achieved = resources.every((required, index) => (values[index] ?? 0) >= required);
  return { achieved, progressFlag: achieved ? 0 : 0 };
}

function equipmentNameMatches(requiredName: string, actualName: string) {
  if (requiredName === actualName) return true;
  const typeIds = EQUIPMENT_TYPE_ALIASES.get(requiredName);
  if (!typeIds) return false;
  const master = masterData.api_mst_slotitem.find((item) => item.api_name === actualName);
  return master != null && typeIds.includes(Number(master.api_type?.[2]));
}

function equipmentProgressKey(path: string, name: string) {
  return `${path}:equipment:${name}`;
}

function progressCount(progressData: JsonObject, path: string) {
  const value = Number(progressData[path]);
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function countEvaluation(current: number, target: number): QuestEvaluation {
  if (current >= target) return { achieved: true, progressFlag: 0 };
  if (current * 5 >= target * 4) return { achieved: false, progressFlag: 2 };
  if (current * 2 >= target) return { achieved: false, progressFlag: 1 };
  return { achieved: false, progressFlag: 0 };
}

function combineAll(children: QuestEvaluation[]): QuestEvaluation {
  if (children.length === 0) return { achieved: false, progressFlag: 0 };
  if (children.every((child) => child.achieved)) return { achieved: true, progressFlag: 0 };
  const achievedCount = children.filter((child) => child.achieved).length;
  const childFlag = Math.max(0, ...children.map((child) => child.progressFlag));
  if (achievedCount * 5 >= children.length * 4) return { achieved: false, progressFlag: 2 };
  if (achievedCount * 2 >= children.length) return { achieved: false, progressFlag: Math.max(1, childFlag) };
  return { achieved: false, progressFlag: childFlag };
}

function combineAny(children: QuestEvaluation[]): QuestEvaluation {
  if (children.some((child) => child.achieved)) return { achieved: true, progressFlag: 0 };
  return { achieved: false, progressFlag: Math.max(0, ...children.map((child) => child.progressFlag)) };
}

function mapMatches(required: unknown, actual: string | undefined) {
  if (required == null || required === "") return true;
  if (!actual) return false;
  if (Array.isArray(required)) return required.map(String).includes(actual);
  return String(required) === actual;
}

function resultAtLeast(actual: string | undefined, required: string) {
  if (!actual) return false;
  const actualIndex = SORTIE_RESULT_ORDER.indexOf(actual);
  const requiredIndex = SORTIE_RESULT_ORDER.indexOf(required);
  if (actualIndex < 0 || requiredIndex < 0) return actual === required;
  return actualIndex >= requiredIndex;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jstWeek(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((day - start) / (7 * 24 * 60 * 60_000)) + 1;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
