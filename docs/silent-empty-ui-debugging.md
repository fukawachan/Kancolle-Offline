# 无报错但 UI 列表为空：客户端静默过滤问题排障记录

> Scope: local learning and offline experimentation only. Do not redistribute cached client assets, art, music, voice files, or extracted game data.

## 适用场景

浏览器控制台没有 JavaScript runtime error，接口也返回了数据，但某个 UI 列表或面板为空。例如本次进入「改装」界面后，数据库账号里有装备，`api_get_member/slot_item` 和 `api_get_member/require_info.api_slot_item` 也非空，但装备列表没有显示。

这类问题通常不是「数据没有返回」，而是客户端在 UI 生成阶段做了额外的 master/member 交叉校验，校验失败后静默过滤掉所有项目。

## 核心原则

- 没有控制台报错不代表 payload 兼容。客户端经常把不满足条件的模型当成空列表处理。
- 先确认 member 数据是否存在，再追 UI 的过滤条件。
- 同时检查 master 数据和 member 数据。列表项本身存在，但 master 规则缺失时，客户端仍可能不显示。
- 优先修服务端兼容性，不要修改 `cache/` 下的混淆客户端。
- 用一个服务端测试模拟客户端过滤链路，而不只是断言接口数组非空。

## 本次根因摘要

客户端改装装备列表的关键路径是：

1. `UserSlotItemAPI` 请求 `api_get_member/slot_item`，完成后调用 `model.slot.setMemData(raw_data)`。
2. `UnsetSlotAPI` 请求 `api_get_member/unsetslot`，完成后调用 `model.slot.setUnsetData(raw_data)`。
3. `setUnsetData` 从 `api_slottypeN` 字段建立 `_mapUnset`。
4. 改装 UI 调用 `SlotitemModelHolder.createSlotList(UNSET, targetShipOptions)`。
5. `createSlotList` 先用 `_generateUnsetList()` 从 `_mapUnset` 取出未装备装备，再对每件装备调用 `SlotUtil.isEquipAbleSlot(...)`。
6. 普通装备槽会检查：

```text
model.equip.get(ship.mstID).isEquipmentValid(slot.mstID, slot.equipTypeSp)
```

如果 `api_mst_equip_ship` 没有舰船专用规则，客户端会 fallback 到舰种规则：

```text
model.shipType.get(ship.api_stype).getEquippableTypes()
```

该函数读取 `api_mst_stype[].api_equip_type`，只把值为 `1` 的装备类型视为可装备。

本地服务端当时的状态是：

- `api_mst_equip_ship: []`
- `api_mst_stype[].api_equip_type: {}`
- `api_get_member/unsetslot` 非空
- `api_get_member/slot_item` 非空

因此客户端拿到了装备，但 `isEquipmentValid(...)` 对所有装备都返回 false，最终 UI 显示为空且没有报错。

## 快速排障流程

### 1. 先证明接口数据是否真的存在

不要从 UI 现象直接判断接口为空。先查服务端实际响应：

```bash
PORT=3021 KANCOLLE_RESPONSE_FORMAT=json npm start
```

```bash
curl -s -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  http://127.0.0.1:3021/kcsapi/api_get_member/slot_item
```

```bash
curl -s -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  http://127.0.0.1:3021/kcsapi/api_get_member/unsetslot
```

检查：

- `api_slot_item` / `api_data` 是否有装备。
- `api_unsetslot` 是否有 `api_slottypeN` 数组。
- 装备实例的 `api_slotitem_id` 是否能在 `api_start2/getData.api_mst_slotitem` 找到。

### 2. 用客户端 API 字符串定位模型写入点

按照 `Agent.md`，不要读完整 `main.js`。先解字符串表，再找 API 或字段：

```bash
rg -n "api_get_member/slot_item|api_get_member/unsetslot|api_slottype" cache/kcs2/js/main.js
```

如果 literal 被混淆，按 `Agent.md` 的 decoder 方法搜索：

- `api_get_member/slot_item`
- `api_get_member/unsetslot`
- `api_slottype`
- `api_slot_item`
- `api_mst_stype`
- `api_equip_type`
- `api_mst_equip_ship`

目标不是理解整个模块，而是找这四件事：

- 请求 URL。
- completion 中把 `_raw_data` 写到哪个 model manager。
- UI 列表从哪个 model manager 取数据。
- 列表生成前后有哪些 filter / validation。

### 3. 从列表生成点继续追静默过滤

如果接口数据非空但 UI 为空，重点搜这些名字或含义：

- `createSlotList`
- `_generateUnsetList`
- `filter`
- `isEquipAbleSlot`
- `isEquipmentValid`
- `getEquippableTypes`

本次关键代码逻辑等价于：

```text
unset items = slot._generateUnsetList()
visible items = unset items.filter(item => SlotUtil.isEquipAbleSlot(item, targetShip))
```

所以只看 `_generateUnsetList()` 不够，还要继续追 `isEquipAbleSlot(...)`。

### 4. 检查 master/member 交叉依赖

遇到静默空列表时，按这个顺序核对：

1. member 实例数据是否存在，例如 `api_slot_item`。
2. grouping/index 数据是否存在，例如 `api_unsetslot.api_slottypeN`。
3. 实例引用的 master 是否存在，例如 `api_mst_slotitem[api_id]`。
4. UI 过滤所需的规则 master 是否存在，例如 `api_mst_stype.api_equip_type` 或 `api_mst_equip_ship`。
5. 规则里的 type id 是否和实例 master 的 `api_type` 对得上。

本次装备类型判断使用的是 slot master 的 `api_type[2]`，不是 `api_type[1]` 或 `api_type[3]`。

## 服务端测试模式

不要只写「接口返回数组非空」的测试。应该模拟客户端实际过滤链路：

```ts
const shipMasterById = new Map(start2.api_mst_ship.map((ship: any) => [ship.api_id, ship]));
const shipTypeById = new Map(start2.api_mst_stype.map((shipType: any) => [shipType.api_id, shipType]));
const slotMasterById = new Map(start2.api_mst_slotitem.map((slot: any) => [slot.api_id, slot]));
const slotItemById = new Map(requireInfo.api_slot_item.map((slot: any) => [slot.api_id, slot]));

const targetShipMaster: any = shipMasterById.get(targetShip.api_ship_id);
const targetShipType: any = shipTypeById.get(targetShipMaster.api_stype);
const equipType = targetShipType.api_equip_type ?? {};

const unsetSlotIds = Object.values(requireInfo.api_unsetslot)
  .filter(Array.isArray)
  .flat() as number[];

const equippableUnsetSlotIds = unsetSlotIds.filter((slotItemId) => {
  const slotItem: any = slotItemById.get(slotItemId);
  const slotMaster: any = slotMasterById.get(slotItem.api_slotitem_id);
  return equipType[slotMaster.api_type[2]] === 1;
});

expect(unsetSlotIds.length).toBeGreaterThan(0);
expect(equippableUnsetSlotIds.length).toBeGreaterThan(0);
```

红灯形态如果是：

```text
unsetSlotIds.length > 0
equippableUnsetSlotIds.length === 0
```

说明装备确实存在，但被客户端兼容规则全部过滤。

## 修复策略

本地离线服初期可以做兼容优先的 master 补齐：

- 从实际返回的 `api_mst_slotitem` 收集 `api_type[2]`。
- 为 `api_mst_stype[].api_equip_type` 补 `{ [typeId]: 1 }`。
- 保留已有 `api_equip_type`，只补缺失类型。

这样 `api_mst_equip_ship` 为空时，客户端 fallback 到舰种规则仍能得到可装备类型，改装列表不会被全部过滤。

如果以后要实现更真实的装备限制，再补 `api_mst_equip_ship` 的舰船级规则，或提供更准确的 `api_mst_stype.api_equip_type`。不要为了让 UI 显示而直接在 member 装备列表里硬编码特殊项。

## 常见误判

- 只看 `api_get_member/slot_item` 非空，就认为服务端没问题。
- 只看 `api_get_member/unsetslot` 非空，没有继续追 UI filter。
- 看到无报错就怀疑资源图片缺失。资源缺失通常表现为加载失败或空贴图，但列表数量被过滤成 0 时，应先查数据规则。
- 修改混淆客户端绕过过滤。这样会掩盖服务端协议缺口，后续其他 UI 仍可能遇到同类问题。
- 用 page/list 的视觉结果判断 API。客户端可能有分页、分类、舰种、装备类型、锁定状态等多层过滤。

## 复用检查清单

遇到「无报错但 UI 空」时按顺序做：

1. 记录目标 UI、目标列表、目标账号数据。
2. curl 相关 member API，证明实例数据非空。
3. curl `api_start2/getData`，证明实例引用的 master 存在。
4. 解码客户端 API 字符串，找到 completion 写入的 model manager。
5. 搜列表生成函数，确认是否有 filter / validation。
6. 把客户端过滤条件翻译成一个服务端测试。
7. 先看测试红灯是否符合症状。
8. 补服务端 master/member 数据，而不是 patch 客户端。
9. 跑 `npm test` 和 `npm run typecheck`。

## 本次相关文件

- 客户端证据：`cache/kcs2/js/main.js`
- 解码方法：`Agent.md`
- 服务端修复：`src/master/catalog.ts` 中生成 `api_mst_stype.api_equip_type`
- 接口接线：`src/kcsapi/handlers.ts` 的 `api_start2/getData`
- 回归测试：`tests/api.test.ts` 的 `provides equippable ship type metadata for the remodel equipment list`
