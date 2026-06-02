# 舰娘名称与立绘错配：master id 和缓存资源 ID 排障记录

> Scope: local learning and offline experimentation only. Do not redistribute cached client assets, art, music, voice files, or extracted game data.

## 现象

账号中已有舰娘显示的名称和立绘不对应。例如服务端把某艘持有舰返回为“吹雪”，但客户端显示的是另一位舰娘的立绘。

这类问题通常不是图片文件损坏，也不是客户端随机选错图，而是服务端返回的 `api_ship_id` / `api_mst_ship.api_id` 与缓存资源目录中的真实舰娘 ID 不一致。客户端会按 master id 去查 `api_mst_shipgraph` 和 `/kcs2/resources/ship/...` 图片，所以名称和 id 一旦错配，UI 会忠实地把“错误 ID 对应的资源”画出来。

## 本次根因摘要

服务端初期手写的 `api_mst_ship` 中混用了错误 ID：

```text
6  -> Fubuki / 吹雪
7  -> Shirayuki / 白雪
9  -> Miyuki / 深雪
45 -> Sendai / 川内
89 -> Ise / 伊勢
```

但缓存资源和外部资料显示这些舰娘的真实 API id 应为：

```text
9  -> Fubuki / 吹雪
10 -> Shirayuki / 白雪
11 -> Miyuki / 深雪
54 -> Sendai / 川内
77 -> Ise / 伊勢
```

例如缓存中的：

```text
cache/kcs2/resources/ship/full/0006_7134_kksiqffpclxh.png
```

不是吹雪；真正的吹雪资源是：

```text
cache/kcs2/resources/ship/full/0009_5991_gyckjmemgqoe.png
```

因此，当持有舰实例返回 `api_ship_id: 6` 且 master 名称写成“吹雪”时，客户端会显示“吹雪”的文字，但按 `0006` 取另一位舰娘的立绘。

## 核心原则

- `api_ship_id` 是舰娘 master id，不是图鉴编号、排序号或临时占位号。
- 客户端资源路径中的 `0009`、`0010` 这类前缀直接受 master id 影响。
- `api_start2/getData.api_mst_ship`、`api_start2/getData.api_mst_shipgraph`、`api_port/port.api_ship[].api_ship_id` 必须使用同一套 id。
- 不要为了让名字“看起来对”而改 `api_name`。如果 id 不对，资源仍会错。
- 优先修服务端 master/member 数据，不要修改 `cache/` 下的客户端或图片资源。

## 快速排障流程

### 1. 先确认持有舰返回的 master id

启动 JSON 响应服务端：

```bash
PORT=3021 KANCOLLE_RESPONSE_FORMAT=json npm start
```

查询港口数据：

```bash
curl -s -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  http://127.0.0.1:3021/kcsapi/api_port/port
```

重点看：

```text
api_data.api_ship[].api_id       # 持有舰实例 id
api_data.api_ship[].api_ship_id  # 舰娘 master id
```

如果 UI 上错配的是持有舰，优先查 `api_ship_id`，而不是 `api_id`。

### 2. 查 master 名称是否和 master id 对得上

查询 `start2`：

```bash
curl -s -X POST \
  -H 'content-type: application/x-www-form-urlencoded' \
  http://127.0.0.1:3021/kcsapi/api_start2/getData
```

检查同一个 id 在 master 中的名称：

```text
api_data.api_mst_ship[].api_id
api_data.api_mst_ship[].api_name
api_data.api_mst_ship[].api_yomi
```

如果 `api_id: 9` 被写成“深雪”，或 `api_id: 6` 被写成“吹雪”，就是 master 数据错配。

### 3. 查 shipgraph 文件名是否来自同一个 id

客户端取 full 立绘时还会用：

```text
api_data.api_mst_shipgraph[].api_id
api_data.api_mst_shipgraph[].api_filename
api_data.api_mst_shipgraph[].api_version
```

服务端应保证同一个 `api_id` 的 `api_mst_ship` 和 `api_mst_shipgraph` 指向同一位舰娘。

本次可作为 sanity check 的缓存证据：

```text
api_id 9  -> api_filename gyckjmemgqoe -> Fubuki / 吹雪
api_id 77 -> api_filename skgpomqtcedb -> Ise / 伊勢
```

### 4. 直接打开缓存图验证资源 ID

用文件名判断时，不要只看是否存在文件。直接看图：

```bash
find cache/kcs2/resources/ship/full -maxdepth 1 -type f | sort | sed -n '1,80p'
```

然后用图片查看器或 Codex 的本地图片查看能力打开目标：

```text
cache/kcs2/resources/ship/full/0009_5991_gyckjmemgqoe.png
```

如果 `api_name` 和这张图代表的舰娘不一致，说明服务端 master id 错了。

### 5. 用可信资料交叉确认 API id

缓存图片可以证明“资源 ID 对应哪张图”，但同型舰立绘相似时容易误判。应再用外部资料或已知 master 数据交叉确认 API id。

本次确认到的参考：

- Fubuki Class: `9=Fubuki`, `10=Shirayuki`, `11=Miyuki`
- Sendai Class: `54=Sendai`
- Ise Class: `77=Ise`

注意：`Ship No.` / 图鉴编号和 `_api_id` 不是同一个概念。排查服务端时以 API id 为准。

## 修复策略

### 修正手写 master 数据

在 `src/master/data.ts` 中，手写舰娘应使用真实 API id：

```ts
shipMaster(9, "Fubuki", "吹雪", 2, 15, 20, 20);
shipMaster(10, "Shirayuki", "白雪", 2, 15, 20, 20);
shipMaster(11, "Miyuki", "深雪", 2, 15, 20, 20);
shipMaster(54, "Sendai", "川内", 3, 26, 25, 25);
shipMaster(77, "Ise", "伊勢", 9, 74, 85, 120);
```

### 修正新账号和默认 fallback

如果账号种子、建造、初始舰等入口仍用旧 id，新 master 修好后现有流程仍可能生成错配船。同步检查：

- `registerAccount(...)` 默认持有舰。
- `api_req_init/firstship` 默认舰。
- `api_req_kousyou/createship` 建造 fallback。
- `claimBuild(...)` 未设置结果时的 fallback。
- `api_req_kaisou/remodeling` 临时 fallback。

本次默认初始舰改为：

```text
[9, 10, 1, 2]
```

### 旧存档处理

如果旧存档里已经持有 `master_id: 6` 并且语义上曾被当作“吹雪”，它和真实 `api_id: 6` 会产生歧义。尤其当旧代码里同时存在：

```text
6 -> 9
9 -> 11
```

这种迁移表时，逐条 `UPDATE` 可能把旧 `6` 先改成 `9`，再在下一步把它误改成 `11`。

更安全的本地开发策略是：

- 对可破坏的离线存档，提升 schema version。
- 让旧 schema 存档直接重建。
- 手动删除 `.local/save.sqlite*`，下次启动重新注册账号。

如果未来必须保留真实玩家进度，迁移应使用无歧义来源字段或一次性 `CASE` 映射，并且要避免把“已经正确的新 id”再次迁移。

## 服务端测试模式

不要只断言 `api_mst_ship` 非空。应该锁住三组关系：

1. master 名称和 API id。
2. shipgraph 文件名和 API id。
3. 持有舰实例的 `api_ship_id`。

示例：

```ts
expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 9)).toMatchObject({
  api_name: "吹雪",
  api_yomi: "Fubuki"
});

expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 9)).toMatchObject({
  api_filename: "gyckjmemgqoe"
});

expect(port.json().api_data.api_ship.map((ship: any) => ship.api_ship_id)).toEqual([9, 10, 1, 2]);
```

旧存档破坏性重建也应有测试：

```ts
store.db.prepare("UPDATE schema_meta SET version = 2").run();
store.close();

store = createStateStore({ databasePath });
expect(store.hasAccount()).toBe(false);
```

这样能防止以后有人加回有歧义的迁移逻辑，导致正确的 `9=吹雪` 在 reopen 后被误改。

## 常见误判

- 把 `api_id` 当成图鉴编号或排序号。
- 只修 `api_name`，不修 id。
- 只查 `api_mst_ship`，不查 `api_mst_shipgraph`。
- 只看 `ship/full`，忘了 `ship/card`、`ship/banner`、`ship/album_status` 也按同一 id 组织。
- 同型舰立绘相似时凭肉眼下结论，未查 API id 资料。
- 在旧存档上反复测试，忘了清理 `.local/save.sqlite`，导致代码修好了但 UI 仍读旧 `master_id`。
- 写顺序迁移 `6 -> 9`、`9 -> 11`，造成二次迁移。

## 复用检查清单

遇到舰娘名称和立绘错配时按顺序做：

1. 查 `api_port/port.api_ship[].api_ship_id`。
2. 查 `api_start2/getData.api_mst_ship` 中该 id 的名称。
3. 查 `api_start2/getData.api_mst_shipgraph` 中该 id 的 `api_filename`。
4. 打开 `cache/kcs2/resources/ship/full/NNNN_*.png` 看真实图。
5. 用可信资料确认该舰的 API id。
6. 修 `src/master/data.ts` 的 master id，而不是只改名字。
7. 同步修账号种子、建造、初始舰、改造等 fallback。
8. 如果旧存档可丢弃，删除 `.local/save.sqlite*` 或提升 schema version 重建。
9. 加测试锁住 master、shipgraph、member 三侧一致性。
10. 跑 `npm test` 和 `npm run typecheck`。

## 本次相关文件

- 解码和客户端阅读方法：`Agent.md`
- 缓存资源：`cache/kcs2/resources/ship/full`
- master 数据：`src/master/data.ts`
- 存档种子和 schema：`src/state/store.ts`
- API fallback：`src/kcsapi/handlers.ts`
- 回归测试：`tests/api.test.ts`、`tests/state.test.ts`
