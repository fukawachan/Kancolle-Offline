# 舰娘/装备 Master 数据生成

> 自动从 [kcwiki/kancolle-data](https://github.com/kcwiki/kancolle-data) 仓库抓取完整的舰娘和装备数据，生成 TypeScript 格式的 master 数据文件。

## 背景

服务端需要 `api_start2/getData` 返回 `api_mst_ship`、`api_mst_slotitem`、`api_mst_stype`、`api_mst_slotitem_equiptype` 等数组。客户端按 `api_id` 去缓存资源目录取对应图片，因此 ID 和名称必须与真实游戏一致，否则 UI 会显示错配的立绘/装备图。

手写覆盖了极少部分（7/840 舰娘、7/562 装备），其余条目通过 `generatedShipMaster()` / `generatedSlotMaster()` 生成占位名称（如 `"Ship 0006"`、`"Equipment 0005"`），导致名称与图片不匹配。

本脚本从 kcwiki 的社区维护数据仓库抓取完整 JSON，生成 `src/master/generated-data.ts`，覆盖全部已知 ID。

## 数据来源

| 数据类型 | 来源 |
|---------|------|
| 装备 | `https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/equipment.json` |
| 舰娘 | `https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/ship.json` |

本地缓存位置：`.local/wiki-cache/equipment.json`、`.local/wiki-cache/ship.json`

## 使用方法

```bash
# 在项目根目录下执行
node scripts/generate-master-data.cjs
```

脚本会：
1. 从本地缓存或网络下载 kcwiki JSON 数据
2. 映射为 `api_mst_slotitem` / `api_mst_ship` / `api_mst_stype` / `api_mst_slotitem_equiptype` 格式
3. 解析改造链（`_remodel_to` → `api_aftershipid`）
4. 生成 `src/master/generated-data.ts`
5. 输出统计信息

## 验证

```bash
npm run typecheck   # 检查类型无误
npm test            # 运行全部测试
```

## 何时需要重新生成

- 游戏更新添加了新舰娘 / 新装备
- kcwiki 数据仓库有重大更新
- 需要更新装备 / 舰娘的属性数据

## 字段映射

### 装备 (equipment.json → api_mst_slotitem)

| kcwiki 字段 | API 字段 | 说明 |
|-------------|---------|------|
| `_id` | `api_id` | 装备 master ID |
| `_japanese_name` | `api_name` | 日文名称 |
| `_name` | `api_yomi` | 英文/罗马字名称 |
| `_types` | `api_type` | 装备类别数组 `[cat, subcat, type, icon, 0]` |
| `_firepower` | `api_houg` | 火力 |
| `_torpedo` | `api_raig` | 雷装 |
| `_aa` | `api_tyku` | 对空 |
| `_armor` | `api_souk` | 装甲 |
| `_bombing` | `api_baku` | 爆装 |
| `_asw` | `api_tais` | 对潜 |
| `_los` | `api_saku` | 索敌 |
| `_shelling_accuracy` | `api_houm` | 命中 |
| `_torpedo_accuracy` | `api_raim` | 雷击命中 |
| `_evasion` | `api_houk` | 回避 |
| `_luck` | `api_luck` | 运 |
| `_range` | `api_leng` | 射程 |
| `_rarity` | `api_rare` | 稀有度 |
| `_scrap_*` | `api_broken` | 解体回收资源 |
| `_info` | `api_info` | 装备说明 |
| `_version` | `api_version` | 数据版本号 |
| `false` | `0` | 不适用的字段一律映射为 0 |

### 舰娘 (ship.json → api_mst_ship)

| kcwiki 字段 | API 字段 | 说明 |
|-------------|---------|------|
| `_api_id` | `api_id` | 舰娘 master ID（优先于 `_id`） |
| `_id` | `api_sortno` / `api_sort_id` | 图鉴编号 |
| `_japanese_name` | `api_name` | 日文名称 |
| `_name` | `api_yomi` | 英文/罗马字名称 |
| `_type` | `api_stype` | 舰种 |
| `_hp` / `_hp_max` | `api_taik` | 耐久 [最小, 最大] |
| `_armor` / `_armor_max` | `api_souk` | 装甲 [最小, 最大] |
| `_firepower` / `_firepower_max` | `api_houg` | 火力 [最小, 最大] |
| `_torpedo` / `_torpedo_max` | `api_raig` | 雷装 [最小, 最大] |
| `_aa` / `_aa_max` | `api_tyku` | 对空 [最小, 最大] |
| `_luck` / `_luck_max` | `api_luck` | 运 [最小, 最大] |
| `_fuel` | `api_fuel_max` | 燃料容量 |
| `_ammo` | `api_bull_max` | 弹药容量 |
| `_build_time` | `api_buildtime` | 建造时间（分钟） |
| `_range` | `api_leng` | 射程 |
| `_equipment[].size` | `api_maxeq` | 装备槽容量 |
| `_remodel_to` | `api_aftershipid` | 改造目标 ID（脚本自动解析） |
| `_remodel_level` | `api_afterlv` | 改造等级 |
| `_scrap_*` | `api_broken` | 解体回收资源 |
| `_*_mod` | `api_powup` | 近代化改修加成 [火, 雷, 空, 甲] |

### 改造链解析

kcwiki 中 `_remodel_to` 使用 `/` 分隔符（如 `"Abukuma/Kai"`），而 JSON 键名使用空格（如 `"Abukuma Kai"`）。脚本将 `/` 规范化为空格后进行匹配，解析成功率 100%（543/543）。

## 注意事项

- 生成的文件较大（约 1500 行），不要手动编辑。
- 本地缓存 `.local/wiki-cache/` 可避免每次重新下载，如需强制更新可删除缓存文件。
- kcwiki 数据可能包含部分深海水姬（敌方）条目 — 脚本一并保留，不影响正常使用。
- 脚本使用 CommonJS（`.cjs`），因为 `node` 可直接运行，不依赖 `tsx`。

## 相关文件

- 生成脚本：`scripts/generate-master-data.cjs`
- 生成数据：`src/master/generated-data.ts`
- 数据入口：`src/master/data.ts`
- 缓存位置：`.local/wiki-cache/`
- 装备/舰娘排障记录：`docs/ship-master-id-art-mismatch.md`
- 客户端逆向方法：`Agent.md`
