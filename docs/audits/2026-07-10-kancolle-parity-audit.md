# 《舰队 Collection》本地服务端还原度与资产完整性审查

> 审查基线：`e090c39cbae745ea94449b3e5b5538896ac5fe38`
> 玩法资料截止：2026-07-10；执行时间：2026-07-10—2026-07-11
> 客户端协议基线：缓存核心 `6.2.3.1`（2025-12-31），索引内最新资源 2026-01-28
> 报告范围：`src/`、`cache/`、`cache-extra/`、生成数据与测试；未修改服务端逻辑、数据库 schema 或测试

## 1. 执行摘要

结论很明确：当前实现已经是一个覆盖面很广、内部测试自洽的离线服务端，但还不能视为官服数值或流程的高还原实现。基线的 39 个测试文件、437 项测试和 TypeScript 类型检查均通过；这些测试主要证明当前实现彼此一致，并未用官服抓包或公开逆向向量锁定大部分公式。

本轮确认 6 项 P0、26 项 P1、8 项 P2 和 1 项 P3。最高风险不是某个伤害公式的几个百分点，而是写入口没有维持资产与引用不变量：伪造或重复 ID 可直接增加资源、零库存仍可完成补给、同一装备实例可同时属于多艘舰、删除舰船或装备会留下悬空引用、初始化端点可重放并接受未知 master、未知 schema 版本会静默清空存档。任务前置与目标绕过同样是明确 P1，但当前复现只证明有限的一次性越权奖励，未将其夸大为无限资产生成。这些问题使任何后续数值校准都缺少可信的状态基础。

战斗域已具备昼战、夜战、航空、联合舰队、陆航、支援、熟练度等代码骨架，但核心端点之间大多只切换阶段列表；舰船回避/对潜成长、伤害保护、胜败判定、航空 Stage 2、触接、AACI、雷击同时结算、联合敌舰队、阵型、夜战和对陆基目标仍有明显简化或错误。成长运营域中，入渠资源公式较接近公开公式，但高等级时间、近代化、装备改修成功率、提督经验、资源上限、任务周期、远征收益等存在可确定差异。

缓存索引本身是完整的：63,434 个索引项全部存在且文件长度与索引一致。不过它是一个跨日期增量快照，而生成 master 已更新到 2026 年 6—7 月，因此“缓存完整”不等于“当前 master 的所有引用都能解析”。实际检查发现 9 个生成舰船 master 没有进入缓存支持的服务 master、10 个装备 master 没有卡图，以及 717 个资源支持的舰船 ID 只能由通用占位 master 填充。单一 in-app 浏览器环境能走过泊地选择、登录、`getData`/`require_info`/`port` 和母港资源加载，但在临时存档上持续停留于舰影加载画面，未能进入可交互母港；这是动态观察到的 P2 启动风险和本轮 UI 验证边界，尚不能归因为确定的服务端兼容缺陷。

建议修复顺序：先建立资产守恒、唯一所有权、外键修复、写入口鉴权/方法/幂等和安全迁移；再替换战斗基础属性、伤害与结算；随后按端点语义重构战斗阶段；最后校准成长、任务、远征、地图与生成数据。第 11 节给出按风险排序的路线。

## 2. 口径、证据与限制

### 2.1 严重度与置信度

| 等级 | 本报告中的含义 |
|---|---|
| P0 | 可无限生成/无故损失资产、破坏存档，或使核心状态不可再信任 |
| P1 | 主要玩法、阶段、结算或公式明显错误，或旧客户端核心流程不可用 |
| P2 | 有限边界错误、协议兼容缺口、数据过期或统计插值 |
| P3 | 低影响差异、证据可追溯性或测试基线问题 |

置信度“动态确认”表示已在临时 SQLite 或临时 HTTP/浏览器服务上复现；“高”表示代码路径和公开基准均明确；“中”表示差异明确但官服隐藏参数或版本边界仍可能影响细节；“待实服验证”只用于没有足够公开证据的随机/隐藏机制，不把推测写成漏洞。

### 2.2 来源优先级

1. 缓存客户端字符串、客户端实际请求、服务端响应和隔离存档前后状态。
2. 官方更新信息；本轮没有使用实服账号，也没有把社区 Wiki 当作官方文档。
3. 公开逆向资料和统计：主要使用 [Damage Calculations](https://en.kancollewiki.net/Damage_Calculations)、[Accuracy / Evasion / Criticals](https://en.kancollewiki.net/Accuracy)、[Combat](https://en.kancollewiki.net/Combat)、[Aerial Combat](https://en.kancollewiki.net/Aerial_combat)、[Experience and Rank](https://en.kancollewiki.net/Experience_and_Rank)、[Repairs](https://en.kancollewiki.net/Repairs)、[Modernization](https://en.kancollewiki.net/Modernization)、[Akashi's Improvement Arsenal](https://en.kancollewiki.net/Akashi%27s_improvement_arsenal)、[Resources](https://en.kancollewiki.net/Resources)、[Quests](https://en.kancollewiki.net/Quests)、[Expeditions](https://en.kancollewiki.net/Expeditions)、[Drop](https://en.kancollewiki.net/Drop) 和 [Line of Sight](https://en.kancollewiki.net/Line_of_Sight)。这些页面本身也包含测量、Vita 数据和社区推导，报告据此标记置信度。
4. 独立交叉源：基础战斗公式另与日文攻略 Wiki 的[战斗](https://wikiwiki.jp/kancolle/%E6%88%A6%E9%97%98%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6)、[命中与回避](https://wikiwiki.jp/kancolle/%E5%91%BD%E4%B8%AD%E3%81%A8%E5%9B%9E%E9%81%BF%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6)及 [KC3 出击模拟器计算说明](https://kc3kai.github.io/kancolle-replay/sources.html)比较；入渠与任务周期另与日文[入渠](https://wikiwiki.jp/kancolle/%E5%85%A5%E6%B8%A0)、[Fandom Docking](https://kancolle.fandom.com/wiki/Docking) 和 [Fandom Quests](https://kancolle.fandom.com/wiki/Quests)核对；资源上限另与日文[资材](https://wikiwiki.jp/kancolle/%E8%B3%87%E6%9D%90)核对。旧实现只作为独立性证据，不覆盖其发布日期之后的新机制。
5. 当前仓库生成数据中的统计插值或无依据回退；这类数据不能反过来证明官服行为。

官服没有公开大部分服务端公式；因此“高”只用于本地代码差异可确定、且预期至少有客户端/API事实或两个独立社区资料支持的条目。特殊攻击、活动热更新和隐藏概率没有达到该门槛时均保留“中”或“待实服验证”。版本更新日期优先按官方 `@KanColle_STAFF` 公告线程核对，报告中的 Wiki 更新页仅作为可检索镜像入口。

### 2.3 未执行的内容

- 没有执行完整混淆 `main.js`。只隔离求值首部字符串表旋转器、末部解码器/字符串数组，并做静态调用检查。
- 没有接触用户正式存档；所有动态状态测试均使用 `/tmp` 下临时 SQLite，完成后已删除。
- 没有实服账号，因此不能直接测量隐藏 RNG、活动动态掉率、服务器侧带路权重和当前实服响应。
- 浏览器在母港加载层被阻断，编成、补给、改装、入渠、工厂、任务、远征、出击和演习的 UI 逐屏验证未完成；对应 HTTP、序列化器和状态变更仍已静态/隔离验证，但不能替代客户端消费验证。
- 通用公网 Web 安全、依赖 CVE、版权与音画质量不在范围内；报告中的鉴权问题只讨论本地存档和资产状态边界。

## 3. 冻结证据与完整性结果

### 3.1 基线文件

| 对象 | 版本/时间 | SHA-256 |
|---|---|---|
| Git 基线 | `e090c39c`，2026-07-08 22:25:45 +08:00 | `e090c39cbae745ea94449b3e5b5538896ac5fe38` |
| `cache/cached.json` | 63,434 项 | `a6c22190efebcda5eddeb84c97e0c417778af54a678f89f23f1766312f5273a3` |
| `cache/kcs2/version.json` | 分模块版本，最高 `6.2.1.0` | `a9c8e5a9e04453a6fcb51c25ad1d07e21782c2bb09b2bdc11663801f2baa624c` |
| `cache/kcs2/js/main.js` | 查询版本 `6.2.3.1`；2025-12-31；10,896,725 B | `e5e4e7bfe07c8b78e223d54f2e997ce05b7f3bfe55de28d1f01b2951971acfb5` |
| `src/server/client-patches.ts` | 两个定向客户端补丁 | `07df12d62a0e9426ee977b94b3b9fa4533d02bace5c073c8f0b31e645255c23e` |
| 建造/开发生成数据 | 2026-06-25 | `fd68e550da31343965f9d8cab0957542af8f4a2940a2af82a053bcbf9bf9be4e` |
| 改修生成数据 | 2026-06-28 | `89f9e97dd70c3d572eac97da567388a7f05c20f6733ec8bc1846e759a15a6c88` |
| 带路生成数据 | 2026-06-11 | `dd6c203efa6b1521376f114b04cdc4e29cd97be967dfec183b4ffda87650d53c` |
| 出击生成数据 | 2026-06-14 | `2e08d3ef0efb0b4781da540c20d28b2f3e75b75f82db863f6fe6277d27bc0c80` |
| 活动生成数据 | 2026-07-08 | `2321b8278234e4cb9f92086ef880c0ef86d6f4ebce8e4017dda0931dae0fc5a9` |
| 通用 master / 任务 | 当前生成物 | `2b321ac97c13faef46b3a9ae58e8296285794107aac446e518b5196c8cff37a6` / `ea8a11124f21e99c7aa50a35dcc1495d643f40e28c6b6816b79abb9fad5a80bc` |
| 远征 / 商店 master | 2026-06-29 / 2026-06-28 | `056699abe962cb1c3b7108263a7b8d02756a8b23e8dc4b837a39430bc74d984f` / `9af5019b59462e4ecf9a82335aca81553f41deb516457f76a407d54730a125c6` |

缓存最晚时间戳为 2026-01-28 10:31:09 GMT；该时间同时对应 `full`/`full_dmg` 下 0924、0929、0936 共 6 项，`ship/full_dmg/0924...png` 只是其中之一。核心脚本与局部资源日期不同，因此应将它视为增量快照，不应把 `version.json` 的分模块值误当成整个缓存的单一发布日期。

### 3.2 缓存与 master 引用检查

| 检查 | 结果 | 结论 |
|---|---:|---|
| 索引项 | 63,434 | 全量遍历 |
| 文件存在 | 63,434 / 63,434 | 无缺失 |
| 文件长度与索引一致 | 63,434 / 63,434 | 无长度差异 |
| 原始舰船 master | 840 | 其中 9 个不在缓存支持的服务 master：`743,744,745,982,1031,1033,1034,1035,1040` |
| 服务输出舰船 master | 1,672 | 均有至少一种展示资源；其中 717 个只能使用 `Ship ####` 通用占位属性 |
| 原始装备 master | 572 | 10 个没有卡图/缩略图：`547,548,569,570,571,572,573,574,575,1990` |
| 服务输出装备 master | 637 | 额外包含深海装备；总计 75 个无玩家卡图，其中大部分为深海装备 |
| 改造目标引用 | 7 个服务 master 指向未输出目标 | `handlers.ts` 会在输出时清除这些目标，避免直接悬空，但也使改造链缺失 |

所以，资产目录对自身索引是完整的；跨到 2026 年 6—7 月生成 master 后则不是完整闭包。新 ID 应按客户端版本裁剪，或补齐对应资源，不能同时暴露新 master 和旧缓存。

### 3.3 生成数据规模与证据质量

| 数据域 | 规模 | 已知证据边界 |
|---|---:|---|
| 建造 | 77 个普通配方、5 个大型/特殊项 | 未命中配方会混合距离最近的 3 个社区统计配方 |
| 开发 | 251 个配方 | 同样插值，且概率不是官方公开表 |
| 改修 | 322 条配方 | KC3 交叉源 332 个 source master；解析源只有 292，明确缺 40 个 master ID |
| 带路 | 36 图、627 边、362 分支点、1,529 条规则 | 419 条权重规则；191 条明示“无公开精确概率，等权确定性回退”，另 1 条为 `English Wiki M routing fallback` |
| 出击 | 36 图、273 点、1,624 个敌编成样本、124 个敌舰模板 | 敌联合编成行数为 0；掉落来自社区统计快照 |
| 活动 | 1 个活动、3 图 | 仅覆盖 2026-07-08 首段活动数据，不是完整活动生命周期 |
| 任务/远征 | 446 个任务、63 个远征 | 任务语义解析不完整；远征前置由生成器简单设为上一行 |

所有生成源 URL 都指向可变的 `master`、在线 API 或实时站点，没有固定 commit、ETag、原始快照哈希和逐行证据等级。这会导致同一 commit 无法严格重建相同生成物。

## 4. 客户端端点与动态协议结论

字符串表共有 14,049 项。过滤完整 API 路径得到 138 个客户端端点；服务端最终 handler 集合为 137 个。`handlers.ts` 先给联合战斗/演习注册占位，再由后续注册覆盖；按最终 Map 计算，仍有 6 个占位和 1 个缺失端点。附录 A 列出全部 138 项。

- 缺失：`api_req_kaisou/open_exslot`。
- 最终占位：`api_req_air_corps/change_name`、`cond_recovery`、`change_deployment_base`、`expand_base`、`expand_maintenance_level`、`api_req_practice/change_matching_kind`。
- 有限/常量响应：陆航疲劳恢复、出击条件、激励/活动选择奖励、友军/OSS 设置、泊地修理、两个开渠端点等。

浏览器使用默认 `svdata=` 响应格式和临时存档：泊地选择、登录、标题页均正常；点击 GAME START 后观察到 `api_start2/get_option_setting`、`api_req_member/get_incentive`、`api_start2/getData`、`api_get_member/require_info`、`api_port/port`，随后母港图集、家具、舰船立绘和 BGM 均完成请求，但画面超过 45 秒仍停留在黑底舰影加载层。控制台没有 JavaScript error，仅有一条 HTML5 Audio pool 警告。该症状在本轮环境中可重复，但尚不能区分响应字段、动画/音频时序和浏览器环境因素；因此“启动阻断”是动态事实，“根因在服务端哪个字段”仍需抓取更完整的网络时序后再定。

## 5. 完整发现矩阵

表中“版本”写“缓存”表示相对 `6.2.3.1` 客户端即成立；“最新”表示相对 2026-07-10 公开玩法；“两者”表示不依赖版本。每项均包含预期、代码位置、差异、影响、最小复现、测试盲区和修复/回归方向。

### 5.1 P0：资产或存档完整性

| ID | 模块 / 置信度 / 版本 | 预期与来源 | 当前差异与位置 | 影响与最小复现 | 测试盲区、修复与回归 |
|---|---|---|---|---|---|
| ST-01 | 解体 / 动态确认 / 两者 | 只对真实、唯一、可解体实例结算其 master 的 `api_broken` | `store.ts:714-747` 仅排除远征 ID，按输入数组长度加 `[1,1,2,0]`；`handlers.ts:593-599` 也回显原始长度 | 初始燃/弹/钢 `1000/1000/1000`；`destroySlotItem([999999,999999,-7])` 后为 `1003/1003/1006`，再 `destroyShip([888888,888888,0,-1])` 后为 `1007/1007/1014` | 现有测试只走有效 ID。先解析并去重真实实例、验证锁定/装备/编成/入渠状态，再按 master 结算；回归无效、重复、负数、浮点、超大 ID 和混合有效/无效的原子失败 |
| ST-02 | 补给 / 动态确认 / 两者 | 库存不足时整次失败，不得先补满再把资源截为 0 | `store.ts:505-532` 先更新舰船后调用通用扣除；`4829-4896` 对负结果 clamp 为 0。陆航 `2523-2538` 同型 | 资源四项设为 0、舰船油弹 `0/0`；补给报告消耗 `15/20`，舰船变 `15/20`，库存仍为 0。可反复免费补给 | 缺少库存差 1/为 0。所有消费入口先 `hasMaterials`，在同一事务中扣除与变更；为舰队、飞机、陆航、预设换装分别做不足库存原子性测试 |
| ST-03 | 装备所有权 / 动态确认 / 两者 | 一个装备实例同一时刻只能属于库存、某舰某槽或某陆航中一个位置 | `equipment-rules.ts:17-49` 只验适装性；`store.ts:542-561` 直接写目标舰，不从其他舰/扩展槽移除；删除 `714-725` 不清引用 | 将实例 5 装到舰 1 槽 0，再装到舰 2 槽 0，两舰均引用 5；删除实例后两处均成为悬空引用 | 测试只覆盖适装，不覆盖全局唯一性。建立统一 ownership 查询/唯一约束和 move 事务；回归普通槽、扩展槽、陆航、预设、远征快照之间的互斥 |
| ST-04 | 舰船引用 / 动态确认 / 两者 | 编成、入渠、出击、远征、预设引用中的舰不能被直接删除；删除成功后所有引用必须同时修复 | `store.ts:736-747` 直接删 `ships`，无锁定/编成/入渠校验，也无外键；默认参数还可能删 1 号舰 | 删除第一舰队旗舰后舰表无该舰，但 deck 仍为 `[1,2,-1,…]`；后续序列化和战斗读取不再满足引用完整性 | 现有解体测试不检查所有引用。集中实现 `canDestroyShip`，事务清理或拒绝；为旗舰、非旗舰、锁定、入渠、远征、出击、预设建立矩阵 |
| ST-05 | 初始化/请求边界 / 动态确认 / 两者 | token、方法和初始化状态应限制写入口；初始舰只能领取一次且 master 必须存在 | `app.ts:135-159` 生成 token 但不验证，`app.all` 接受任意方法；`handlers.ts:198-203` 每次创建；`store.ts:4553-4561` 对未知 master 使用默认属性 | 临时存档初始 4 舰；无 token `GET firstship` 后 5 舰，`POST api_ship_id=999999` 后 6 舰且未知 master 存在；无 body `GET destroyship` 又删除 1 号舰 | server 测试把任意方法/无 token 当便利路径。为会话 token、POST、初始化状态、master 白名单和 replay key 加验证；回归重复请求、乱序调用、旧 token、未知 ID |
| DB-01 | 存档迁移 / 动态确认 / 两者 | 未知未来 schema 应拒绝启动并保留原文件；旧版本应显式、可备份迁移 | `store.ts:2596-2600` 对 `<3` 或 `>SCHEMA_VERSION` 调 `resetSchema`；`3017-3045` DROP 全部业务表 | 在有效临时存档把 schema 设为 20 后重开，旧业务数据被清空并留下空 schema 19；随后走正常 `registerAccount()` 才生成默认账号、4 舰与资源，旧数据已不可恢复。版本 1/2 同样清空 | 没有“未来版本不得写”的测试。启动前备份，未来版本 fail closed；为每个受支持旧版本提供显式迁移；回归哈希/行数在失败后不变 |

### 5.2 P1：主要协议、战斗与成长差异

| ID | 模块 / 置信度 / 版本 | 预期与来源 | 当前差异与位置 | 影响与最小复现 | 测试盲区、修复与回归 |
|---|---|---|---|---|---|
| PROTO-02 | 端点覆盖 / 高 / 缓存 | 客户端出现的端点应有明确 handler 和兼容响应 | `api_req_kaisou/open_exslot` 不在最终 handler，落入 `handlers.ts:920-926` 404 | 客户端调用返回 HTTP 200 包装的 API 404，扩展槽开启流程中断 | 端点没有直接测试。依据缓存调用链实现前置/消费/舰船更新；增加客户端请求体与响应字段 fixture |
| PROTO-03 | 占位写入口 / 高 / 缓存 | 陆航改名、疲劳恢复、基地扩张/维护等级、演习匹配和开渠应更新状态并消费对应物品；舰队和渠位应按官服进度解锁 | `handlers.ts:844-870` 最终保留 6 个 `api_disabled`；`564`、`637` 两个开渠只回成功，不改变 dock；`store.ts:3386-3403` 新账号直接创建 4 舰队、4 入渠和 4 建造渠 | 客户端表面成功或明确 disabled，但存档无变化；同时初始账号已绕过舰队/渠位解锁，开渠端点没有可观察意义 | 6 个占位无直接测试，开渠测试只看响应。实现解锁/消费状态或在离线 profile 中明确配置；回归初始数量、任务解锁、响应前后状态、库存不足和重放 |
| Q-01 | 任务 / 动态确认 / 两者 | 只有前置完成且在可见/并行上限内才能开始；事件必须匹配任务目标；完成后才可领取一次 | `quests.ts:126-128` 对所有定义恒可见；`284-307` 的 expedition 不比较 mission ID；`store.ts:1550-1608` 不验前置与并行上限；`master/data.ts:106-109` 还向客户端宣告并行上限 9,999 | 任务 405 需要前置 127、远征 30；未完成前置也能开始，远征 1 成功即推进，随后领取 10 钢、10 铝和装备 42。446 个任务均可开始，活动上限未限制 | 测试验证解析器的当前行为，未以真实任务前置/目标做负例。可见性使用 `prerequisiteIds` 与周期状态；每类事件严格匹配目标；回归任务 405、5/8 并行上限、重复领取和选项奖励 |
| BTL-01 | 阶段编排 / 高 / 缓存 | night-to-day 应先结算夜战再进入昼战；第二航空战等端点字段应按节点类型出现 | `endpoint-modes.ts:45-51,117-124` 声明 `night`，但 `battle.ts:188-239,325-412` 从不执行该阶段，且 `api_kouku2` 恒 null | night-to-day 实际只做航空/昼炮击/雷击；夜战先手伤害与状态完全丢失 | 测试只断言阶段字段形状。用官方抓包 fixture 校验阶段顺序、前后 HP 和 `kouku2`；让 endpoint mode 驱动真正的执行器 |
| BTL-02 | 敌联合舰队 / 高 / 缓存与最新 | 敌主/护卫舰队应分别加载、选目标和序列化 | 出击数据敌联合行数为 0；`battle.ts:2235-2237` 对任何 `shipIds` 只取前 6。联合字段虽存在，运行时通常为空 | 例如 6-5 M 的 12 艘样本若落在单一 `shipIds` 中，后 6 艘被截断；`api_stage3_combined` 等无法表达真实伤害 | 测试用手工 record 验证字段，不验证真实地图数据。生成器拆分主/护卫；用至少一组敌联合抓包做航空、炮击、雷击、夜战全阶段回归 |
| BTL-03 | 伤害/轰沉保护 / 高 / 两者 | 擦弹为当前 HP 的约 6%—14% 随机；出击中的 overkill 保护是有条件机制，不是所有我方舰永久 1 HP | `battle-formulas.ts:398-411` 对所有 `targetSide=0` 把正伤害限制为 `HP-1`，擦弹固定 6%；`battle.ts:1901-1923` 广泛传入该侧别 | 我方舰永远无法轰沉，战损、撤退、胜败、掉落与资源循环均失真；HP 100 擦弹永远 6 而非分布 | 测试锁定了当前常量。加入 HP、旗舰、开战损伤/疲劳、出击/演习/友军的边界向量和分布检验 |
| BTL-04 | 舰船属性成长 / 高 / 两者 | 回避、对潜、索敌等由 master 上下限和等级成长；命中还受等级/装备/状态等影响 | 生成 master 缺回避/对潜完整字段；`battle.ts:2082-2093,2852-2864` 将我方回避设为“等级+装备回避”，对潜按舰种猜测 | 同一等级不同舰的回避趋同，婚舰等级直接变成巨大回避；先制反潜、命中、远征与战斗伤害均连锁偏离 | 测试甚至固定 Lv85 回避=85。补齐 master 成长字段，建立 Lv1/50/99/188 官方表向量；移除按舰种猜测回退或显式标记占位 |
| BTL-05 | 雷击结算 / 高 / 两者 | 同一雷击阶段应先决定双方攻击，再同时应用；交战形态会影响开幕与闭幕雷击，雷击不得选择潜艇或陆基目标，参见两份战斗公式交叉源 | `battle.ts:1780-1855` 先完整应用我方，再让仍存活敌方攻击，且开幕/闭幕 power 均未乘 engagement；`1888-1890` 已正确只选 `surface`，这部分不是缺陷 | 我方先击沉会取消本应发生的敌雷击；四种交战形态不改变雷击伤害 | 现有测试只检查数组。先生成 immutable attack intents，再同时结算并对相应雷击阶段应用交战补正；加入互相致死、四交战形态、仅潜艇/仅陆基/混合目标回归 |
| BTL-06 | 胜败、经验、掉落 / 高 / 两者 | S/A/B/C/D/E 取决于击沉数、旗舰、双方损伤比例和特殊节点；经验/掉落再按 rank 表结算 | `battle.ts:1926-1953` 仅按敌方击沉或敌总伤害比例输出 S/A/B/C，无 D/E，也忽略我方损伤和敌旗舰 | 战果、任务、地图血条、经验、掉落资格系统性错误 | 测试用当前 70%/40% 阈值。以 [Combat](https://en.kancollewiki.net/Combat) 的全 rank 决策表建立边界 fixture，并把经验/掉落作为同一结算回归 |
| BTL-07 | 航空战 / 高 / 两者 | Stage 1、Stage 2 两个独立 50% 防空判定、调整对空/舰队防空、触接选取和舰种专用 AACI 应分别实现 | `battle.ts:917-1021` 用连续损耗率并强制至少 1 架，Stage 2 合成单个线性式；触接只选排序首项；AACI selector `battle/aaci.ts:47-72` 只识别通用 5/7/8 且舰队只试第一个候选 | 制空损耗、开幕伤害、AACI 触发与熟练度损失分布错误 | 现有测试主要锁常数。为五制空状态、Prop/Fixed 四组合、触接率/倍率、舰种专用 AACI 和多舰候选做固定种子+统计区间 |
| BTL-08 | 炮击顺序、阵型、航母公式 / 高 / 两者 | 第一轮按射程并含同射程随机，第二轮按舰队位置；先锋阵等应可用；航母炮击为 `floor((FP+TP+floor(DB×1.3)+...)*1.5)+55` | `battle.ts:1603-1640` 两轮共用 `attackOrder`；`2784-2786` 把阵型 6 clamp 到 5；`1244-1248` 把航空数值简单求和后乘 1.5；联合 4 舰边界见 `combined-fleet.ts:76-81` | 行动顺序、伤害和目标存活状态均偏离，活动先锋阵无法表示 | 增加同射程随机、第二轮位置、4/5/6/7 舰先锋阵、联合阵型和航母装备组合公式 fixture |
| BTL-09 | 夜战/对潜/陆基 / 高 / 两者 | 夜战 CI 激活包含等级、运、旗舰、损伤、装备和多次判定；单舰队夜战对潜通常为擦弹；陆基目标忽略雷装并有专用倍率 | `battle-formulas.ts:329-340` 使用自定义 `sqrt(luck)*0.06`；`battle.ts:1208-1233` 夜战火力统一加入雷装，`1710-1726` 可随机选潜艇/陆基；照明弹字段恒 `[-1,-1]` | 夜战主力、潜艇和陆基节点结果不可与公开公式对齐 | 用普通/新型 CI、照明灯/照明弹/夜侦、潜艇、PT、陆基各建独立 fixture；证据不足的激活率保留可配置统计基线 |
| BTL-10 | 陆航/支援/熟练/特殊系统 / 中 / 最新 | 各基地各波、航程、陆攻特效、喷气、支援类型/命中、友军、特殊攻击、烟幕、气球、适重炮等应有独立阶段和公式 | `battle.ts:535-589` 把所有活动基地合并成一次航空战；`2131-2176` 支援用简化随机伤害；友军/喷气/特殊攻击等没有可执行实现 | 虽有字段骨架，活动图和高阶战斗无法还原 | 按机制拆模块，先用协议 fixture 固定阶段/数组，再逐项加入公开公式；对隐藏概率做区间而非单值断言 |
| GRW-01 | 舰娘等级 / 高 / 最新（版本漂移） | 2026-05-29 后婚舰上限 188，经验总量 186/187/188 为 17.2m/18.6m/20.2m | `experience.ts:1-2,5-112` 上限和表停在 185（总经验 16m） | 高等级舰无法继续升级，演习可生成 Lv188 对手但己方结算仍 clamp 185 | 增加 186—188 表和 cap 变更测试；若坚持旧缓存玩法，应显式配置玩法日期而不是混用当前数据 |
| GRW-02 | 提督经验 / 高 / 两者 | HQ Lv20→21 需要 2,000，Lv80→81 需要 14,000，之后为公开离散表 | `experience.ts:217-220` 在 20—79 使用 `level*250`，80 后 `level*500`；Lv20 得 5,000，Lv80 得 40,000 | HQ 等级、自然恢复上限、开发稀有度、活动难度和排名全部偏移 | 用完整 Lv1—120 累计表替代分段近似；回归 19/20/30/60/80/90/99/120 边界 |
| GRW-03 | 入渠时间 / 高 / 两者 | Lv≤11 基数 `Lv×10`；Lv≥12 为 `Lv×5+floor(sqrt(Lv-11))×10+50`，再乘损失 HP 与舰种倍率并加 30 秒 | `repair.ts:27-33` 所有等级恒 `30+lostHp*level*10*倍率`；资源成本 `17-24` 与公开公式相符 | Lv50、损 1 HP、1 倍舰：当前 530 秒，公开公式 390 秒 | 现有测试集中低级/自洽。加入 Lv11/12/50/99/188 和四类舰种倍率边界 |
| GRW-04 | 近代化 / 高 / 两者 | 每个属性独立 50% 成功/失败；成功与失败使用不同取整公式，并存在海防舰耐久/对潜/运特殊近代化 | `store.ts:4586-4605` 每项固定 `floor(total*1.2+0.3)`，相当于所有属性必定成功；只处理前四项 | 输入显示值 10 时恒加 12；公开行为应各属性独立得到成功 12 或失败 6 | 注入 RNG 并分别结算；回归多属性混合结果、上限截断、海防舰特殊属性和消费舰装备 |
| GRW-05 | 装备改修 / 高 / 两者 | 官服按曜日/二号舰显示 3 个改修槽，明石/明石改成功率按星级表；生成交叉缺失应显式降级 | `improvement.ts:47-53` 返回 3 条本身正确，但尚无证据证明选择/替换顺序符合官服；`128-136` 普通明石 +0—+3 错为 95%（两份资料均为 100%），后段及转换率也有差异；生成数据缺 40 个 source master | 三槽候选可能与官服曜日/二号舰顺序不同；确定的成功率错误会改变材料消耗分布，部分装备完全不可改修 | 用公开成功率表逐级回归（普通/改/确保）；保留 3 槽并以曜日/二号舰 fixture 验证选择顺序；对 40 个缺失 ID 补源或从 master 隐藏并给出证据标记 |
| GRW-06 | 解体收益 / 高 / 两者 | 舰船/装备应按各自 master 的 `api_broken`，并考虑当前油弹等官服规则 | `store.ts:714-747` 和 `handlers.ts:593-599` 对所有实例固定 `[1,1,2,0]` 比例 | 即使只传有效 ID，大型舰和不同装备的收益也完全相同 | 在修复 ST-01 后按 master 结算；为最小/大型舰、四类装备资源和批量取整建 fixture |
| GRW-07 | 资源恢复/上限 / 高 / 两者 | 自然恢复只到 `(HQ+3)*250`；当前公开主资源硬上限 350,000，次级 3,000 | `store.ts:242-243,4855-4896` 自然恢复和一般 clamp 均使用 1,000,000；`handlers.ts:114` 也写 1,000,000 | Lv1 会从 1,000 继续自然恢复到 1,000,000，奖励/消费边界也错误 | 分离 soft cap、hard cap 和允许越界的少数奖励；回归 Lv1/120、恰好 cap、cap-1、特殊越界 |
| GRW-08 | 任务周期 / 高 / 两者 | 每日/每周/月/季任务均在 JST 05:00 重置；周任务星期一 05:00 | `quests.ts:153-163,502-505` 以 JST 日历零点和从 1 月 1 日起每 7 天分块，既不是 05:00，也不保证星期一 | 04:59/05:00 边界、跨年第一周和周一重置均可能错误；任务可提前清零或延迟 | 统一业务日 `now-5h`，周 key 以 JST 周一为起点；回归跨日、跨月、跨季、跨年和夏令时无关性 |
| GRW-09 | 远征 / 高 / 两者 | 大成功按任务类型、闪舰/旗舰等级/桶等判定；收益含大发种类、改修平均、特大发、鬼怒，部分远征有专用经验/伤害公式；月常远征只有成功后才消耗当月次数，失败可重试；解锁图非简单线性 | `expedition.ts:212-330` 用统一概率和最高 20% 大发加成，忽略改修/特大发/鬼怒与多项专用式；`store.ts:1201-1206` 在出发时就增加月常 `period_count`，失败或召回也会锁死；生成器 `generate-expedition-data.mjs:292-297` 默认前置为上一条 | 收益、大成功、解锁与任务进度长期偏差；月常远征可因失败/召回被错误永久消耗 | 按三类大成功和收益公式拆表；月常只在成功结算时原子计数；把前置做显式数据；为失败/召回重试、21/32、大成功、桶、鬼怒/特大发建立向量和统计测试 |
| GRW-10 | 陆航配置与补给 / 高 / 缓存与最新 | 不同机种的陆航槽上限不同；换装、待机时间、铝耗、航程和基地解锁需校验 | `store.ts:2458-2505` 任何飞机装入即设固定 18 且不扣资源/等待；`2523-2538` 又受免费补给问题影响 | 可免费将任意飞机变为 18 架，陆航战力和资产均失真 | 建立机种容量表与部署状态机；回归换装来源唯一性、容量、部署成本、等待、补给不足和航程 |
| MAP-01 | 带路/速力 / 中高 / 两者 | 每个分支应使用可追溯的精确条件/权重；未知条件不能静默当作普通不匹配；提速应按多类速力组与舰级例外，参见 [Improving Ship Speed](https://en.kancollewiki.net/Improving_Ship_Speed) | 1,529 条规则中 191 条明示等权确定性回退，另 1 条为 English Wiki M routing fallback；`routing.ts:405-495` 运行时解析中文 prose，未知 term 返回 false；`ship-speed.ts:6-61` 除大和级外把所有低速/高速舰压成同一锅炉步进阶梯，未表达 A/B/C 等速力组和舰级例外 | 同一地图可能落入错误后续规则或直接无匹配；统计权重被伪装成确定实现；同样锅炉组合会把不同速力组舰算成相同结果，进而改变带路 | 生成时编译类型化 AST 并输出未解析 term；精确/统计/回退分层；把速力组版本化，对每个分支和典型 A/B/C/大和例外各做正负边界测试 |
| MAP-02 | 敌编成与掉落 / 中高 / 两者 | 敌编成应按节点、难度、HQ、阵型和联合类型；掉落按节点、rank、编成、容量/持有状态及活动动态表 | 出击数据 1,624 行但敌联合为 0；`sortie-data` 的社区快照汇总权重被直接用于确定种子抽取，结算又依赖错误 rank；未见容量/持有限制闭包 | 普通图尚可近似，联合/活动/限掉与满船位时明显偏离 | 保留原始样本维度和采样时间，加入无掉落/容量/持有上限；用抓包或两个独立数据源交叉检查高价值节点 |
| MAP-03 | 海域进度/活动 / 高 / 最新 | 每图血条、阶段、重置、难度、奖励和解锁应由版本化数据驱动 | `map-progress.ts:9-27` 只硬编码 7-2/7-3/7-5 与 EO；活动生成数据仅 1 活动 3 图，缓存核心又早于活动 | 新 5-6、当前活动后段、阶段切换、甲乙丙丁奖励与锁船不能完整结算 | 将阶段/血条/奖励/解锁纳入版本化 event schema；按地图从开始到清图做状态机回归，旧缓存模式下隐藏新图 |

### 5.3 P2/P3：边界、数据与可追溯性

| ID | 模块 / 等级 / 置信度 / 版本 | 预期与来源 | 当前差异与位置 | 影响与最小复现 | 测试盲区、修复与回归 |
|---|---|---|---|---|---|
| ST-06 | 读时结算 / P2 / 高 / 两者 | 对外读取应是纯 snapshot；到期结算若随读触发，也应在单一事务中原子完成。这是存档一致性要求，不依赖隐藏官服公式 | `getSave()` 在 `store.ts:3423-3438` 会完成修理/建造、同步远征、自然恢复、刷新任务/地图并写库，多个 settle 不在一个总事务 | 连续 GET 可改变状态；在中间步骤注入异常，可能只完成部分 settle | 现有测试未故障注入。拆成显式 `settle(now)` 单事务与纯 snapshot；回归重复 GET 幂等、固定时钟和每个步骤异常后的字节级不变 |
| ST-07 | 跨域事务 / P2 / 高 / 两者 | 战斗、远征、改修和对应任务事件应同成同败；这是状态守恒要求 | 战斗 `store.ts:2093-2130`、远征 `1216-1274`、改修 `4534-4544` 先提交核心结算，再在事务外调用 `recordQuestEvent` | 在两次提交之间模拟崩溃，资产已结算但任务永久漏进度 | 当前没有 crash-point 测试。把任务事件并入事务或 durable outbox；对三个入口逐点注入异常并比较前后状态 |
| PROTO-01 | 客户端启动 / P2 / 动态观察、根因待验证 / 缓存 | `getData`、`require_info`、`port` 后应进入可交互母港，这是缓存客户端的可观察流程 | 单一 in-app 浏览器中，默认 `svdata` 的五个初始 API 和母港资源完成后，舰影加载层超过 45 秒不消失；尚无 HAR、浏览器版本/UA、普通 Chrome 对照或具体服务字段根因 | 新临时账号按泊地→GAME START 可观察到停滞，但不能据此归因服务端 | 建立普通 Chrome 与 in-app 双环境 E2E，保存 HAR、服务日志及动画/音频 promise trace；定位到服务响应前不升级为 P1 |
| PROTO-04 | 有限响应 / P2 / 高 / 缓存 | 客户端消费字段的 `null`、空数组、空对象和省略语义应与该版协议一致；写类成功响应还应有持久状态 | `handlers.ts:123,190,251,260-263,778` 等返回空数组/空对象/常量，字段形状可能防崩但状态语义未实现 | 调用对应 12 个有限端点比较前后存档，多数目标状态不变；真实客户端是否接受每个空值尚未逐屏确认 | 为每个有限端点保存请求/响应 fixture，明确“有意离线禁用”和“应该实装”，逐字段回归 `null`/空数组/省略及前后状态 |
| GRW-11 | 建造/开发概率 / P2 / 中 / 两者 | 隐藏概率只能使用同版本、带上下文和样本数的统计分布；无证据配方不应伪装成精确官服池 | `arsenal.ts:173-235` 对无精确样本的配方混合距离最近的 3 个社区配方 | 任取未收录配方得到 `source=interpolated`，其结果对距离函数敏感而非官服机制 | 公开统计不足以定精确率。API/调试界面暴露证据等级；高价值配方可拒绝或用版本化已知池，统计回归给置信区间 |
| GRW-12 | 演习 / P2 / 高 / 两者 | 官服对手来自同服玩家快照；离线服务无法无账号还原，但应明确声明模拟边界 | `practice.ts` 合成编成、等级、装备和熟练度；03:00/15:00 JST 重置键思路较接近公开资料 | 同一临时档刷新只得到生成对手，不能代表官服匹配或真实装备；战斗还继承核心公式差异 | 将功能命名为离线模拟，不宣称镜像；测试只要求协议与本地结算一致，避免给所有敌机最大熟练度，并固定生成 seed |
| DATA-01 | master/资产闭包 / P2 / 高 / 混合版本 | 对客户端暴露的每个 master、改造目标和资源引用都应在同一 `gameplayProfile` 内解析 | `catalog.ts:30-64,141-174` 按资源生成 master；当前 9 个新舰缺资源、10 个新装备缺卡图、717 个通用舰船占位 master，且 2026-07-08 新装备 No.577 未进入生成 master | 全量闭包脚本得到上述计数；请求这些 ID 会被裁剪、回退透明/通用图或根本不可用 | 启动时生成 master—资源—改造目标闭包报告并按版本裁剪；任何玩家对象不得依赖透明图或 `Ship ####`；为新增 ID 做资源回归 |
| DATA-02 | 数据溯源 / P2 / 高 / 两者 | 生成物应由固定 commit/原始响应、抓取参数和生成器版本可重复重建 | 各生成器使用可变 `master`/在线 API，没有原始输入哈希、ETag、逐行 evidence/license 元数据 | 同一 commit 日后重跑可能得到不同结果；当前只能验证成品 hash，不能重建来源 | 保存原始快照与 HTTP 元数据，固定 commit SHA；CI 重建后逐文件比 hash，并让每条规则携带 exact/statistical/fallback 等级 |
| TEST-01 | 测试证据 / P3 / 高 / 两者 | 还原度测试的 oracle 应独立来自协议 fixture、公开公式向量或统计样本 | 39 文件/437 项测试大量断言当前常量和字段存在，例如 Lv85 回避=85、当前 rank 阈值和简化阶段会被测试“保护” | 替换任一自洽常量会导致测试失败，却不能证明官服一致；基线全绿仍存在 40 项 P0—P2 | 分为 protocol fixture、official/community formula vector、invariant/property、statistical 四层；每个断言附来源日期，版本变化显式迁移 |

## 6. 动态复现证据

### 6.1 P0 前后状态

所有状态复现都使用新建临时 SQLite；HTTP 复现使用绑定 `127.0.0.1` 的临时服务。没有复制或修改 `.local/save.sqlite`。

| ID | 操作前 | 操作 | 操作后 / 证明 |
|---|---|---|---|
| ST-01 | 燃/弹/钢 `1000/1000/1000`，输入 ID 均不存在 | `destroySlotItem([999999,999999,-7])` | `1003/1003/1006`，奖励取决于输入长度而非删除行数 |
| ST-01 | 上一步状态 | `destroyShip([888888,888888,0,-1])` | `1007/1007/1014`，重复/0/负数同样计奖 |
| ST-02 | 四项主资源为 0；舰 1 油/弹 `0/0`，上限 `15/20` | `supplyShips([1], {kind:3, refillAircraft:true})` | API 计算消耗 `15/20`，舰船变 `15/20`，材料仍为 0 |
| ST-03 | 装备实例 5 仅在库存 | 依次 `equipSlotItem(1,0,5)`、`equipSlotItem(2,0,5)` | 两艘舰槽 0 都为 5；再删除 5 后，装备表无 5、两艘舰仍引用 5 |
| ST-04 | 第一舰队 `[1,2,-1,-1,-1,-1]`，舰 1 存在 | `destroyShip([1])` | 舰 1 行消失，deck JSON 不变，产生确定悬空引用 |
| ST-05 | 临时账号 4 舰 | 无 token `GET /kcsapi/api_req_init/firstship` | HTTP 200 / `api_result=1`，舰数 5 |
| ST-05 | 5 舰 | 无 token POST 同端点，`api_ship_id=999999` | 舰数 6，未知 master 999999 的实例存在；同一请求可继续重放 |
| ST-05 | 舰 1 存在 | 无 token、无 body `GET /kcsapi/api_req_kousyou/destroyship` | 默认 ID 1 被删除，说明方法、token 和缺参均未形成边界 |
| DB-01 | 有效账号/舰船/资源，schema 19 | 手工把 `schema_meta.version` 改为 20 后重新打开 store | 原业务数据消失，只留下空 schema 19；随后正常注册会生成一套新默认账号，版本 1/2 同型 |

可复现的 HTTP 核心序列如下；`<tmp-db>` 必须指向临时路径：

```sh
PORT=3037 KANCOLLE_DB_PATH=<tmp-db> npm start
curl -sS http://127.0.0.1:3037/kcsapi/api_req_init/firstship
curl -sS -X POST http://127.0.0.1:3037/kcsapi/api_req_init/firstship \
  -d 'api_ship_id=999999'
curl -sS http://127.0.0.1:3037/kcsapi/api_req_kousyou/destroyship
curl -sS -X POST http://127.0.0.1:3037/kcsapi/api_req_kaisou/open_exslot
```

最后一项返回 API 404，前三项在没有 `api_token` 的情况下改变存档。测试完必须停止服务并删除临时目录。

### 6.2 P1 最小确定性向量

| ID | 最小向量 / 当前结果 |
|---|---|
| PROTO-02 | POST `api_req_kaisou/open_exslot`；进入 unknown handler，API 404 |
| PROTO-03 | 分别调用 6 个占位或两个 `open_new_dock`，比较前后 `getSave()`；响应成功/disabled，目标状态不变 |
| Q-01 | 临时 schema 19 中任务 127 未完成；启动 405、记录远征 1、领取 405，得到钢 10、铝 10、装备 42；证明前置与目标均可绕过，但不是无限重放 |
| BTL-01 | `createSortieBattle(...,{endpoint:'sortieNightToDay'})`；record 没有执行夜战伤害，`kouku2=null` |
| BTL-02 | 向 `enemyUnits` 提供 12 ID 或选择含 12 舰的样本；输出只有前 6，escort 数组为空 |
| BTL-03 | `resolveBattleDamage` 令我方目标 HP=30、raw damage≥30；返回最多 29。令无法击穿、HP=100；每次返回 6 |
| BTL-04 | 将普通舰设为 Lv85 且无回避装备；显示回避固定 85，与 master 舰种/上下限无关 |
| BTL-05 | 构造双方各一艘可互相致死的雷击舰；我方先结算击沉后，敌方不再发射；改变 engagement 不改变开幕/闭幕雷击 power。仅潜艇或陆基目标时当前 selector 正确不选择，不计入缺陷 |
| BTL-06 | 构造敌方总 HP 100、受伤 39/40/69/70 且旗舰/我方损伤变化；rank 只在当前 40%/70% 阈值变化，没有 D/E |
| BTL-07 | 固定 seed 重复 Stage 2；实现每槽只有一个合成随机量，而不是 Prop/Fixed 两个独立伯努利。给专属 AACI 配装则 selector 返回 null |
| BTL-08 | 输入 formation=6，`battleFormation` 返回 5；同射程舰多次固定同序。任选 FP/TP/DB 非零航母可直接算出当前式与公开式不同 |
| BTL-09 | 夜战仅剩潜艇或陆基目标；普通夜战 profile 仍使用 FP+TP 并可抽为目标；CI 率只随自定义 sqrt(luck) 式变化 |
| BTL-10 | 启用两个陆航基地；响应只有一次合并的 `api_air_base_attack`，不是每基地/每波序列；支援每次命中至少造成 1 |
| GRW-01 | 给予达到 Lv186 的总经验；`shipLevelForExp(...,188)` 仍被 `MARRIED_SHIP_LEVEL_CAP=185` 截断 |
| GRW-02 | `playerExpToNext(20)` 当前隐式为 5,000，公开表为 2,000；Lv80 当前 40,000，公开表 14,000 |
| GRW-03 | Lv50、损 1 HP、倍率 1：当前 530 秒；公开分段基数给出 390 秒 |
| GRW-04 | 近代化显示输入 10：当前每次加 12；公开行为每项独立 50% 得 12 或 6 |
| GRW-05 | 普通明石从 +0 升 +1，当前成功率 95%，两份公开表均为 100%；三槽数量正确，另比较曜日/二号舰候选顺序是否与 fixture 一致 |
| GRW-06 | 解体任意两个 `api_broken` 不同的有效装备；当前每个都按 `[1,1,2,0]` |
| GRW-07 | Lv1、资源刚好 1,000，推进一个恢复 tick；当前继续增长。一般增加可到 1,000,000，而公开硬上限为 350,000 |
| GRW-08 | JST 00:00 与 05:00 前后取 `currentQuestPeriodKey('daily')`；当前在 00:00 变化。选跨年周一可见 week key 不按周一切换 |
| GRW-09 | 带 +10 大发或鬼怒改二的相同舰队与无改修舰队比较；当前改修平均/鬼怒不改变收益；启动一个月常后立即召回或令其失败，`period_count` 已增加且不能重试；远征前置可见简单相邻链 |
| GRW-10 | 向空陆航槽装入任意合法飞机实例；立即成为 18/18，材料不变；材料 0 时再补给仍恢复满 |
| MAP-01 | 选择任一 source 为 `No published exact fallback probability` 的分支，相同 seed 按等权稳定路由；再给两艘公开速力组不同、基础速力相同的舰配置相同涡轮/锅炉，当前函数返回相同提速结果 |
| MAP-02 | 遍历 1,624 encounters，`enemyCombinedShipIds` 非空计数为 0；任何敌联合端点都无法从正常图数据获得护卫舰队 |
| MAP-03 | 查询 map 56 或当前活动后段；36 图数据不含 5-6，普通多阶段表仅有 72/73/75，活动只有首段 3 图 |

这些向量可以转成不依赖浏览器的单元/属性测试；随机机制应注入 RNG，并用固定种子验证边界、用置信区间验证分布。

## 7. 逐域结论矩阵

“已接入”只表示存在真实 handler，不表示官服一致。

| 域 | 覆盖结论 | 主要正确/可复用部分 | 主要缺口 |
|---|---|---|---|
| 启动/master | 部分 | `start2`、option、port、require_info 字段面广；会按资源裁剪舰船 master | 浏览器未进入母港；跨版本 master/资源不闭合；占位深海 master 多 |
| 编成/联合 | 部分 | 基本换舰、锁定、联合类型和预设结构存在 | 舰实例引用约束不足；联合阵型/敌联合战斗语义错误 |
| 装备/预设 | 部分 | 适装/扩展槽规则、预设接口和改修应用事务已有基础 | 全局唯一所有权缺失；`open_exslot` 缺失；跨舰移动和删除可悬空 |
| 补给 | 部分 | 最大油弹、婚舰 85% 消耗、飞机每架 5 铝的结构合理 | 库存不足不失败；陆航/普通舰飞机来源与状态约束不足 |
| 改造 | 部分 | 等级、基础资源、部分特殊物品与新初始装备有校验 | 改造链受旧资产裁剪；最新分支/特殊消耗依赖不完整生成表 |
| 近代化 | 不还原 | 容量截断和消费舰去重存在 | 成功/失败 RNG 和海防舰特殊属性未实现 |
| 入渠 | 接近但有关键差异 | 油/钢公式与公开式一致，舰种倍率分类存在 | Lv12+ 时间公式错误；开渠不落库；状态互斥需加强 |
| 建造/开发 | 统计近似 | 精确命中已有社区样本时能给出带样本数的分布 | 未命中配方为最近邻插值；不是官服池，证据不可复建 |
| 解体 | 不还原且不安全 | 有事务外形 | 资产生成、固定收益、锁定/引用/状态校验缺失 |
| 任务 | 数据广、执行不可靠 | 446 定义、分页、选项奖励、部分组合条件已有实现 | 前置/上限/目标/周期绕过；若干类别只做宽泛事件匹配 |
| 远征 | 部分 | 63 远征、基础要求、成本、快照、重放 serial 和回收流程较完整 | 前置链、三类大成功、装备改修/特大发/鬼怒、专用经验式不完整 |
| 普通地图 | 数据近似 | Formula 33 的总体结构、确定种子、选择分支接口可复用 | prose 运行时解释、191 条无精确概率回退加 1 条 M 点回退、5-6 缺失、血条/多阶段硬编码 |
| 活动地图 | 仅协议/拓扑脚手架 | 061 区域、3 图和难度接口能驱动本地状态机 | 图名为 `Event Operation E-*`，各难度血条仅 1—3、奖励统一 useitem 57，多数普通/首领编成是单舰 1501，掉落为睦月/如月/吹雪；不能视为 2026 夏活实装数据，且 `sources.kcnav` 只是一条未附原始快照的字符串 |
| 普通昼战 | 明显简化 | 软上限、装甲随机区间、基础阶段结构存在 | 属性、阵型、顺序、目标、命中、伤害保护、rank 全有关键差异 |
| 夜战 | 明显简化 | 基本双击/CI 分类、夜航母骨架存在 | 激活率、照明弹/夜侦、潜艇/陆基、特殊攻击和 night-to-day 错误 |
| 航空战 | 明显简化 | 制空、Stage 1—3、触接/AACI 字段与熟练度存储存在 | 损耗/防空/触接/AACI 公式和候选规则不还原，`kouku2` 缺失 |
| 陆航/支援 | 占位到简化 | 接口与基础 payload 存在 | 基地波次、航程/部署、机种容量、支援命中/伤害、喷气缺失 |
| 联合舰队战 | 协议骨架、数据不可用 | 主/护卫数组和部分端点已注册 | 正常数据无敌联合；目标策略/阶段/数组归属不完整 |
| 演习 | 离线模拟 | 03:00/15:00 JST period key 思路正确；战斗和结算接口存在 | 对手不是实服玩家；战斗继承核心公式差异，匹配类型端点占位 |
| 资源/运营 | 部分 | 基础材料/useitem 分表，部分消费前检查存在 | soft/hard cap、读时结算原子性、奖励容量和免费消费问题 |
| 客户端资产 | 索引完整、版本闭包不完整 | 63,434 项存在且长度一致；映射 fallback 较丰富 | 最新 master 超出旧缓存；10 个玩家装备无卡图，9 个舰船未服务 |

## 8. 版本漂移

| 日期/功能 | 缓存协议状态 | 当前代码/数据状态 | 判定 |
|---|---|---|---|
| 2026-05-29：婚舰上限 188、5-6 | 核心 `main.js` 早于更新，缓存不应被要求原生展示新 UI | 经验仍停 185；普通图只到 5-5 | 对“最新玩法”是 P1 漂移；不是旧缓存协议缺陷。参考 [May 29 update](https://en.kancollewiki.net/Game_Updates/2026/May_29th) |
| 2026-06-26：Hangar Expansion | 缓存早于功能 | useitem master 105 已进入 `expedition-data.ts`，但没有槽位扩张状态、消费或 API | 明确版本漂移，应按玩法 profile 隐藏或整体升级。参考 [Hangar Expansion](https://en.kancollewiki.net/Hangar_Expansion) |
| 2026-07-08：夏活首段 | 缓存核心早约半年，只有增量资源和本地 event patch | 手工加入的 1 活动 3 图只是合成脚手架；新装备 No.577 `61cm Quadruple (Oxygen) Torpedo Mount Model 5 Kai 3` 又不在 `generated-data.ts`，只有 SB2U-2 等部分新 master | 混合版本；不能称完整当前活动或当前 master。参考 [July 8 update](https://en.kancollewiki.net/Game_Updates/2026/July_8th) |
| 2026-06/07 master 更新 | 缓存资源最晚 2026-01-28 | 舰船/装备/任务/改修数据更新到 6—7 月 | 造成 9 舰、10 装备和改造链资源漂移 |

建议引入一个不可变 `gameplayProfile`，至少包含 `clientVersion`、`rulesDate`、`masterSnapshot`、`assetSnapshot` 和 `eventId`。服务启动时验证五者闭包，不允许当前这种“旧客户端 + 新 master + 局部活动”的隐式组合。

## 9. 无法直接判定的项目

以下项目不是遗漏，而是证据不足时刻意不下确定结论：

| 项目 | 为什么不能直接判漏洞 | 已完成的检查 | 需要什么证据 |
|---|---|---|---|
| 建造/开发真实概率 | 官服池和权重不公开且会随秘书舰/HQ/日期变化 | 确认 exact 样本与 nearest-3 插值边界 | 同版本原始大样本、上下文维度和置信区间；至少两个独立统计源 |
| 带路隐藏权重 | 部分节点只公开条件或定性概率 | 统计 191 条“无公开精确概率”回退和 1 条 M 点回退，并检查 Formula 33 实现 | 同版本实服路线原始样本或客户端/服务器证据 |
| 夜战 CI、触接、掉落精确率 | 公开资料包含测量与版本差异 | 已确认当前公式结构/输入项明显不全 | 固定版本的大样本、置信区间和更新日期；不能只复制一个社区常数 |
| 当前活动动态掉落/削甲/友军 | 活动会分阶段开放和热更新 | 确认本地只有首段 3 图、友军设置无状态 | 活动每次维护后的 API/公告/样本快照 |
| 浏览器母港加载根因 | 症状可重复，但没有逐请求响应状态、promise/渲染栈 | 确认五个初始 API及图集/立绘/BGM完成，无 JS error | 保留 network HAR、服务请求日志、动画/音频 promise trace，并在普通 Chrome 交叉验证 |
| 446 个任务的逐条语义 | 定义多且部分为限时，公开翻译并非机器可执行规范 | 检查通用解释器、前置、周期、奖励、事件匹配类别并动态复现 405 | 每条任务的版本化官服文本/API 状态、关键负例和消费前后存档 |

这些条目应在代码或数据中明确标为 `community-estimate`、`statistical` 或 `unverified`，不能使用无标识的默认常量。

## 10. 测试覆盖评价

基线执行结果为 39 个测试文件、437 项测试通过，`npm run typecheck` 通过。端点直接字符串引用率很高，但“被测试”通常只意味着有 handler、字段或当前行为断言：

- `api_port/airCorpsCondRecoveryWithTimer`、`api_req_air_corps/supply`、友军/OSS 设置、六个最终占位和 `open_exslot` 没有直接端点测试。
- 大多数写入口没有系统覆盖缺参、重复/负数/浮点/超大 ID、库存 0/差 1、锁定/编成/入渠/远征、乱序和 replay。
- 没有统一的四项不变量测试：资源守恒、实例唯一所有权、引用完整性、失败原子性/幂等性。
- 战斗测试大量使用当前实现生成期望值，缺少由公开公式或真实协议抓包独立产生的 oracle。
- 没有真实浏览器从空存档到母港的 CI，因此 PROTO-01 在 437 项全部通过时仍然存在。

建议的测试层次：

1. `invariants/`：对所有写入口做 property/fuzz，操作前后计算资产总账和引用图。
2. `protocol-fixtures/`：保存去隐私化的请求、响应和客户端消费字段，严格比较数组位置、`null`/空数组/省略字段。
3. `formula-vectors/`：每条公开公式有来源、日期、边界向量和取整步骤。
4. `statistics/`：随机机制只验证区间、独立性和分布，不用单次固定结果冒充官服率。
5. `browser/`：空账号→母港→各菜单→普通/联合出击→结算的最小烟测。

## 11. 按风险排序的修复路线

### 阶段 0：先让存档可信

- 为每个写端点建立统一参数 schema：整数、正数、去重、存在性、状态与 master 白名单。
- 引入资产 ledger/ownership 层；舰船、装备、陆航、deck、dock、preset 使用同一事务移动引用。
- 所有材料/物品消费先检查，扣除与业务变更在同一事务；失败保持字节级不变。
- 校验 token 和 POST，给初始化、领取、结算增加 replay key/已完成状态。
- 未知 schema 只读拒绝并备份，绝不 DROP。完成后为 ST-01—ST-05、Q-01、DB-01 建回归。

### 阶段 1：替换结算地基

- 补齐版本化舰船属性成长和完整经验表。
- 实现条件式 overkill、随机擦弹、完整 rank 决策表和正确资源 soft/hard cap。
- 将 `getSave()` 拆为显式单事务 settlement 与纯读取。
- 以真实 master `api_broken`、正确近代化和入渠公式替代通用近似。

### 阶段 2：按端点重构战斗引擎

- 让 `BattleEndpointMode` 的目标策略、敌联合、陆航和阶段序列全部驱动执行，而非只读取 `phaseSequence`。
- 攻击先生成 intent，再同时结算雷击；区分主/护卫/敌主/敌护卫的数组。
- 实装正确阵型、交战形态、炮击顺序、航母/ASW/夜战/陆基公式。
- 分离 Stage 1、Prop、Fixed、AACI、触接、Stage 3；再加入陆航波次、支援、喷气、友军和特殊攻击。

### 阶段 3：运营与成长

- 修复任务可见性、并行上限、目标匹配、JST 05:00 周期和原子领取。
- 补全改修表/成功率，不截断列表；所有缺失配方有证据状态。
- 远征按类型实现大成功、大发改修/特大发/鬼怒和专用任务公式；修正前置图。
- 实装 `open_exslot`、开渠、陆航扩建/维护/疲劳和演习匹配状态。

### 阶段 4：数据与版本治理

- 固定源 commit 和原始快照哈希；每条规则标注 exact/statistical/fallback。
- 生成时把带路 prose 编译成类型 AST，未解析条件使构建失败。
- `gameplayProfile` 强制客户端、master、资产、玩法日期、活动为一致版本。
- 每次更新输出 endpoint、master/asset 闭包、地图/任务/配方差异报告。

只有阶段 0 完成后，统计战斗和掉率才有意义；否则任何长时间模拟都会被资产生成和悬空引用污染。

## 12. 审查方法与可复核命令

执行过的只读/隔离检查包括：

```sh
git rev-parse HEAD
shasum -a 256 cache/cached.json cache/kcs2/version.json cache/kcs2/js/main.js \
  src/server/client-patches.ts src/master/*generated*
npm test
npm run typecheck
```

缓存检查遍历 `cached.json` 的每个 URL，将 URL decode 后映射到 `cache/`，比较 `stat.size` 与索引 `length`。客户端端点提取只隔离求值：

- `main.js` 字节 0—首个 `,!function` 之前的字符串数组旋转器；
- 文件末部 `function _0x2e70` 解码器和 `_0x1369` 字符串数组；
- 对解码后的 14,049 字符串使用完整 API 路径正则，得到 138 项。

没有运行 UMD 主体、游戏循环或其他混淆业务代码。服务端端点则静态提取 literal `register()` 和数组循环注册，并按 Map 后写覆盖计算最终 handler。

收尾复验于 2026-07-11 在同一基线执行：

| 检查 | 结果 |
|---|---|
| `npm test` | 退出码 0；39 个测试文件、437 项测试全部通过 |
| `npm run typecheck` | 退出码 0；`tsc --noEmit` 无诊断 |
| 工作树 | 审查开始前无改动；收尾时 `git ls-files --modified` 为空，唯一未跟踪文件为本报告 |
| 格式/占位检查 | `git diff --check` 通过；本报告无尾随空格和未完成占位标记 |

因此审查前后没有业务代码、数据库 schema、生成数据或测试改动；测试结果也未被审查文档影响。

## 附录 A：138 个客户端端点矩阵

状态说明：

- “已接入”只表示最终 Map 中存在非占位 handler；其数值还原度见主发现矩阵。
- “有限/常量”表示响应字段固定或无持久状态，例如空恢复数组、`api_repair_flag=0` 或开渠假成功。
- “占位”统一返回 `api_disabled=1`、`api_message="Local placeholder"`。
- “缺失”进入 unknown handler，返回 API 404。
- “直接测试文件数”只统计 `tests/**/*.test.ts` 中对完整端点字符串的直接引用；通用 helper 或间接覆盖不计，因此它是可追溯性指标，不是代码覆盖率。
- 读取类响应由 `handlers.ts:116-191` 和 `serializers.ts` 生成 member/master payload；战斗类响应由 `battle.ts` 生成阶段数组；其余写入口的响应字段位于对应 `handlers.ts` 注册块。有限/占位/缺失端点的实际字段已在状态列明确列出。

| 客户端端点 | 最终服务端响应结论 | 直接测试文件数 |
|---|---:|---:|
| `api_dmm_payment/paycheck` | 已接入：`api_check_value` | 2 |
| `api_get_member/basic` | 已接入：member basic | 1 |
| `api_get_member/chart_additional_info` | 已接入：图鉴附加信息 | 1 |
| `api_get_member/deck` | 已接入：deck array | 1 |
| `api_get_member/furniture` | 已接入：furniture array | 1 |
| `api_get_member/kdock` | 已接入：build dock array | 1 |
| `api_get_member/mapinfo` | 已接入：map/air-base arrays | 1 |
| `api_get_member/material` | 已接入：material array | 2 |
| `api_get_member/mission` | 已接入：mission list/limit time | 2 |
| `api_get_member/ndock` | 已接入：repair dock array | 1 |
| `api_get_member/payitem` | 已接入：pending payitems | 1 |
| `api_get_member/picture_book` | 已接入：`api_list` | 1 |
| `api_get_member/practice` | 已接入：practice rivals | 1 |
| `api_get_member/preset_deck` | 已接入：preset payload | 1 |
| `api_get_member/preset_slot` | 已接入：preset payload | 1 |
| `api_get_member/questlist` | 已接入：quest page | 2 |
| `api_get_member/record` | 已接入：record payload | 1 |
| `api_get_member/require_info` | 已接入：require_info aggregate | 2 |
| `api_get_member/ship2` | 已接入：ship array | 1 |
| `api_get_member/ship3` | 已接入：ship/deck/slot | 1 |
| `api_get_member/ship_deck` | 已接入：ship/deck | 2 |
| `api_get_member/slot_item` | 已接入：slotitem array | 1 |
| `api_get_member/sortie_conditions` | 有限/常量：两个条件数组均空 | 1 |
| `api_get_member/unsetslot` | 已接入：unset slot map | 1 |
| `api_get_member/useitem` | 已接入：useitem array | 3 |
| `api_port/airCorpsCondRecoveryWithTimer` | 有限/常量：`api_recovery=[]` | 0 |
| `api_port/port` | 已接入：port aggregate | 3 |
| `api_req_air_corps/change_deployment_base` | 占位：disabled/message | 0 |
| `api_req_air_corps/change_name` | 占位：disabled/message | 0 |
| `api_req_air_corps/cond_recovery` | 占位：disabled/message | 0 |
| `api_req_air_corps/expand_base` | 占位：disabled/message | 0 |
| `api_req_air_corps/expand_maintenance_level` | 占位：disabled/message | 0 |
| `api_req_air_corps/set_action` | 已接入：air-base/material | 1 |
| `api_req_air_corps/set_plane` | 已接入：air-base/material | 1 |
| `api_req_air_corps/supply` | 已接入但受 ST-02/GRW-10 影响 | 0 |
| `api_req_battle_midnight/battle` | 已接入：night battle payload | 1 |
| `api_req_battle_midnight/sp_midnight` | 已接入：night battle payload | 1 |
| `api_req_combined_battle/airbattle` | 已接入：combined air payload | 1 |
| `api_req_combined_battle/battle` | 已接入：combined battle payload | 1 |
| `api_req_combined_battle/battle_water` | 已接入：combined battle payload | 2 |
| `api_req_combined_battle/battleresult` | 已接入：result payload | 1 |
| `api_req_combined_battle/each_battle` | 已接入：combined battle payload | 2 |
| `api_req_combined_battle/each_battle_water` | 已接入：combined battle payload | 1 |
| `api_req_combined_battle/ec_battle` | 已接入：enemy-combined payload | 2 |
| `api_req_combined_battle/ec_midnight_battle` | 已接入：combined night payload | 1 |
| `api_req_combined_battle/ec_night_to_day` | 已接入但 night phase 未执行 | 1 |
| `api_req_combined_battle/goback_port` | 已接入：port aggregate | 1 |
| `api_req_combined_battle/ld_airbattle` | 已接入：combined LBAS air payload | 1 |
| `api_req_combined_battle/ld_shooting` | 已接入：combined LBAS battle payload | 1 |
| `api_req_combined_battle/midnight_battle` | 已接入：combined night payload | 1 |
| `api_req_combined_battle/sp_midnight` | 已接入：combined night payload | 1 |
| `api_req_furniture/buy` | 已接入：furniture state | 1 |
| `api_req_furniture/change` | 已接入：furniture state | 1 |
| `api_req_furniture/music_list` | 已接入：BGM master list | 1 |
| `api_req_furniture/music_play` | 有限：仅回当前家具币 | 1 |
| `api_req_furniture/radio_play` | 有限/常量：`api_id=0` | 1 |
| `api_req_furniture/set_portbgm` | 已接入：`api_p_bgm_id` | 1 |
| `api_req_hensei/change` | 已接入：deck payload | 1 |
| `api_req_hensei/combined` | 已接入：`api_combined_flag` | 1 |
| `api_req_hensei/lock` | 已接入：`api_locked` | 1 |
| `api_req_hensei/preset_delete` | 已接入：empty success | 1 |
| `api_req_hensei/preset_expand` | 已接入：`api_max_num` | 1 |
| `api_req_hensei/preset_lock` | 已接入：empty success | 1 |
| `api_req_hensei/preset_order_change` | 已接入：empty success | 1 |
| `api_req_hensei/preset_register` | 已接入：preset deck | 1 |
| `api_req_hensei/preset_select` | 已接入：deck payload | 1 |
| `api_req_hokyu/charge` | 已接入但受 ST-02 影响 | 1 |
| `api_req_init/firstship` | 已接入但可重放/未知 master | 1 |
| `api_req_init/nickname` | 已接入：basic payload | 1 |
| `api_req_kaisou/can_preset_slot_select` | 已接入：可选状态 | 1 |
| `api_req_kaisou/lock` | 已接入：`api_locked` | 1 |
| `api_req_kaisou/marriage` | 已接入：ship payload | 1 |
| `api_req_kaisou/open_exslot` | 缺失：API 404 | 0 |
| `api_req_kaisou/powerup` | 已接入但近代化公式错误 | 1 |
| `api_req_kaisou/preset_slot_delete` | 已接入：empty success | 1 |
| `api_req_kaisou/preset_slot_expand` | 已接入：`api_max_num` | 1 |
| `api_req_kaisou/preset_slot_register` | 已接入：preset slot | 1 |
| `api_req_kaisou/preset_slot_select` | 已接入：ship/slot/material | 1 |
| `api_req_kaisou/preset_slot_update_exslot_flag` | 已接入：empty success | 1 |
| `api_req_kaisou/preset_slot_update_lock` | 已接入：empty success | 1 |
| `api_req_kaisou/preset_slot_update_name` | 已接入：empty success | 1 |
| `api_req_kaisou/remodeling` | 已接入：after ship | 3 |
| `api_req_kaisou/slot_deprive` | 已接入但所有权约束不完整 | 1 |
| `api_req_kaisou/slot_exchange_index` | 已接入：ship/material | 1 |
| `api_req_kaisou/slotset` | 已接入但所有权约束不完整 | 1 |
| `api_req_kaisou/slotset_ex` | 已接入但所有权约束不完整 | 1 |
| `api_req_kaisou/unsetslot_all` | 已接入：ship payload | 1 |
| `api_req_kousyou/createitem` | 已接入：create result/material | 1 |
| `api_req_kousyou/createship` | 已接入：dock/material | 1 |
| `api_req_kousyou/createship_speedchange` | 已接入：dock | 1 |
| `api_req_kousyou/destroyitem2` | 已接入但存在资产生成 | 1 |
| `api_req_kousyou/destroyship` | 已接入但存在资产/引用问题 | 1 |
| `api_req_kousyou/getship` | 已接入：ship/dock/slotitem | 1 |
| `api_req_kousyou/open_new_dock` | 有限/常量：成功但不落库 | 1 |
| `api_req_kousyou/remodel_slot` | 已接入：改修结果/材料 | 1 |
| `api_req_kousyou/remodel_slotlist` | 已接入：官服三槽；候选顺序/成功率待校准 | 1 |
| `api_req_kousyou/remodel_slotlist_detail` | 已接入：detail payload | 1 |
| `api_req_map/anchorage_repair` | 有限/常量：`api_repair_flag=0` | 1 |
| `api_req_map/next` | 已接入：map node | 1 |
| `api_req_map/select_eventmap_rank` | 已接入：event map state | 1 |
| `api_req_map/start` | 已接入：map node | 1 |
| `api_req_map/start_air_base` | 已接入：air-base array | 1 |
| `api_req_member/get_event_selected_reward` | 有限/常量：`api_items=[]` | 1 |
| `api_req_member/get_incentive` | 有限/常量：`api_items=[]` | 1 |
| `api_req_member/get_practice_enemyinfo` | 已接入：enemy info | 1 |
| `api_req_member/itemuse` | 已接入：材料/奖励/警告 | 1 |
| `api_req_member/itemuse_cond` | 有限/常量：`api_caution_flag=0` | 1 |
| `api_req_member/payitemuse` | 已接入：`api_caution_flag` | 1 |
| `api_req_member/set_flagship_position` | 已接入：position | 1 |
| `api_req_member/set_friendly_request` | 有限/常量：empty object，无状态 | 0 |
| `api_req_member/set_option_setting` | 已接入：option state | 1 |
| `api_req_member/set_oss_condition` | 有限/常量：empty object，无状态 | 0 |
| `api_req_member/update_tutorial_progress` | 已接入：basic payload | 1 |
| `api_req_member/updatecomment` | 已接入：basic payload | 1 |
| `api_req_member/updatedeckname` | 已接入：deck payload | 1 |
| `api_req_mission/result` | 已接入：expedition result | 2 |
| `api_req_mission/return_instruction` | 已接入：mission state | 2 |
| `api_req_mission/start` | 已接入：complete time | 2 |
| `api_req_nyukyo/open_new_dock` | 有限/常量：成功但不落库 | 1 |
| `api_req_nyukyo/speedchange` | 已接入：dock | 1 |
| `api_req_nyukyo/start` | 已接入：dock/material | 1 |
| `api_req_practice/battle` | 已接入：practice battle payload | 1 |
| `api_req_practice/battle_result` | 已接入：result payload | 1 |
| `api_req_practice/change_matching_kind` | 占位：disabled/message | 0 |
| `api_req_practice/midnight_battle` | 已接入：practice night payload | 1 |
| `api_req_quest/clearitemget` | 已接入但受 Q-01 影响 | 2 |
| `api_req_quest/start` | 已接入但受 Q-01 影响 | 2 |
| `api_req_quest/stop` | 已接入：quest state | 2 |
| `api_req_ranking/mxltvkpyuklh` | 已接入：ranking payload | 1 |
| `api_req_sortie/airbattle` | 已接入：air battle payload | 1 |
| `api_req_sortie/battle` | 已接入：sortie battle payload | 1 |
| `api_req_sortie/battleresult` | 已接入：result payload | 1 |
| `api_req_sortie/goback_port` | 已接入：port aggregate | 1 |
| `api_req_sortie/ld_airbattle` | 已接入：LBAS air payload | 2 |
| `api_req_sortie/ld_shooting` | 已接入：LBAS battle payload | 1 |
| `api_req_sortie/night_to_day` | 已接入但 night phase 未执行 | 1 |
| `api_start2/getData` | 已接入：master aggregate | 4 |
| `api_start2/get_option_setting` | 已接入：option payload | 2 |

## 附录 B：数值函数、内联表与生成数据审查清单

此表用于证明审查范围不只限于发现条目。结论“可复用”表示结构或部分公开常量接近，不代表整文件已被官服验证。

| 文件/数据 | 审查的函数或数值表 | 结论 | 对应发现 |
|---|---|---|---|
| `kcsapi/aircraft-proficiency.ts` | 内部熟练度阈值、可见等级、制空奖励、初始熟练、战后增减 | 可见阈值/制空奖励有公开公式外形；按名称判断初始满熟练、每战固定 +1/+2、按损失比例最多扣 20 是启发式，未覆盖机种独立增长率和重置分布 | BTL-07、BTL-10、TEST-01 |
| `kcsapi/arsenal.ts` | 建造/开发分布、失败率、最近邻距离、建造时间、初始装备 | exact 行只是社区统计快照；nearest-3 混合不是官服机制；build time/loadout 依赖生成 master | GRW-11、DATA-02 |
| `kcsapi/battle-formulas.ts` | 制空、软上限、阵型、联合修正、交战、损伤状态、夜战、CI、ASW、命中、暴击、伤害 | 制空阈值、软上限、基础交战/损伤状态有可复用结构；阵型表不完整，命中/暴击/CI/Stage 2/伤害保护有确定差异 | BTL-03—BTL-09 |
| `kcsapi/battle/aaci.ts` | AACI 1—18 常量、通用配装 selector | 部分 pattern 常量存在，但选择器只生成 5/7/8，缺舰种/装备专属与候选顺序 | BTL-07 |
| `kcsapi/battle/data/endpoint-modes.ts` | 14 个主要昼战/联合端点阶段、target policy、陆航、敌联合标记 | 表的意图较完整，但 runtime 只实质消费 phase sequence，且 `night` 不执行 | BTL-01、BTL-02 |
| `kcsapi/battle.ts` | 所有阶段、目标、顺序、伤害、rank、掉落、陆航、支援、属性成长 | 协议骨架广，数值与阶段仍是项目中最大 P1 集群 | BTL-01—BTL-10、MAP-02 |
| `kcsapi/combined-fleet.ts` | 联合舰队类型/舰种限制、阵型规范化 | 基础编成检查可复用；4 舰阵型边界、战斗端点和敌联合仍不还原 | BTL-02、BTL-08 |
| `kcsapi/handlers.ts` / `envelope.ts` | 137 个最终 handler、参数默认值、HTTP/API error、JSON/`svdata` 包装 | 响应包装可复用；大量缺参会落入有业务含义的默认 ID，方法/token 未校验，有限/未知端点见附录 A | ST-05、PROTO-02—PROTO-04 |
| `kcsapi/equipment-rules.ts` | 普通/扩展槽适装、装备类型/舰种/舰级规则 | 适装数据路径较好，但函数只验证目标适装，不验证实例所有权和来源 | ST-03、PROTO-02 |
| `kcsapi/expedition.ts` | 舰队条件、油弹成本、大成功、收益、大发、经验、战损 | 基础要求/成本/1.5 倍收益结构存在；高级加成、任务专用式和大成功类型过度统一 | GRW-09 |
| `kcsapi/experience.ts` | 舰 Lv1—185、婚舰、提督 Lv1—120、API 经验数组 | 舰船 1—185 表大体可用但缺 186—188；提督 20+ 分段式明显错误 | GRW-01、GRW-02 |
| `kcsapi/improvement.ts` | 当日/二号舰可用性、材料、确保、成功率、转换、三槽列表 | 消费/目标实例框架和三槽数量可复用；候选替换顺序未有 fixture，成功率表错误，数据源明确少 40 master | GRW-05、DATA-02 |
| `kcsapi/practice.ts` | 03/15 JST period、对手生成、舰/提督经验、rank 倍率 | period 与提督经验离散表接近公开资料；对手为合成，舰经验受 185 cap 和战斗错误影响 | GRW-01、GRW-12、BTL-06 |
| `kcsapi/quests.ts` | 可见性、周期、组合条件、事件匹配、进度旗标 | 通用 AST 思路可复用；前置恒忽略、周期错误、若干类别/目标宽匹配 | Q-01、GRW-08 |
| `kcsapi/repair.ts` | 油/钢、时间、舰种倍率 | 油/钢和倍率分类接近公开公式；Lv12+ 时间分段缺失 | GRW-03 |
| `kcsapi/serializers.ts` | basic、ship、deck、dock、air-base、port/require_info 的位置数组与空值 | 单元测试覆盖较多；单一浏览器环境观察到加载停滞，尚未定位字段，所以 `null`/空数组/省略字段未全部动态确认 | PROTO-01、PROTO-04 |
| `kcsapi/supply.ts` | 补给种类、每战 20% 油弹、夜战弹药 | 大体结构接近；夜战取整仍需官服向量，且 store 的库存/事务错误使正确成本也无法守恒 | ST-02 |
| `state/store.ts` | 婚舰 HP/运、材料、入渠/建造/远征/任务/地图结算、近代化、改造、解体、预设、迁移 | 婚舰 HP 档位、运 +3—6、85% 补给等有公开依据；状态守恒、迁移、近代化、资源 cap 等存在最高风险问题 | ST-01—ST-07、DB-01、GRW-04、GRW-07、GRW-10 |
| `state/decks.ts` | 6 槽归一化、ID 数值化/截断 | 固定 6 槽与 `-1` 填充符合当前协议外形；函数本身不验实例存在/重复，正常 store 路径另做去重，但删除路径可留下悬空 ID | ST-04、TEST-01 |
| `master/data.ts` | 35 张普通图 master、BGM/fallback cell、任务并行 9,999、船位 740 | 船位 740 与 2026-05-29 更新一致；并行任务 9,999 绕过玩法上限，普通图停在 5-5 且 fallback cell 只是骨架 | Q-01、MAP-03、DATA-01 |
| `master/ship-speed.ts` | 5/10/15/20 四档、涡轮/锅炉、仅大和级例外 | 档位编码可复用；将多类速力组压成通用阶梯，无法表达大量舰级/改造例外 | MAP-01 |
| `master/enemy-classification.ts` | 潜艇舰种与 20 个陆基 master ID | 已列陆基会正确避开雷击；固定 ID 集没有版本/来源元数据，新敌若未补表会被当 surface | BTL-09、DATA-01 |
| `master/map-progress.ts` | EO 列表、奖章、多阶段血条 | 仅少量硬编码；无法支撑最新普通图和活动 | MAP-03 |
| `master/routing.ts` / generated | Formula 33、速度、类型计数、1,529 带路规则 | Formula 33 外形可复用；类型系数不完整，运行时 prose、191 条无精确概率回退和 1 条 M 点回退不可称精确 | MAP-01 |
| `master/sortie-data.ts` / generated | 敌编成、阵型、基础经验、掉落权重、fallback enemy | 社区统计能提供普通图近似；0 敌联合、时效/容量/活动维度不足 | MAP-02 |
| `master/event-data.ts` / generated | 活动 061、难度、奖励、支援远征、掉落 | 仅为三图协议/拓扑脚手架；血条、奖励、敌编成和掉落均为明显合成值，不是 2026 夏活实装数据 | MAP-03、DATA-01 |
| `master/expedition-data.ts` / generator | 63 master、要求、奖励、前置、reset | master 和规则源有记录；默认“上一行前置”是生成器推断 | GRW-09、DATA-02 |
| `master/quest-data.generated.ts` | 446 任务、前置、奖励、条件 | 数据面很广；运行时忽略前置，逐条翻译/消费未有独立 oracle | Q-01、GRW-08、DATA-02 |
| `master/catalog.ts` / `generated-data.ts` | 资源驱动 master、缺失 master fallback、改造链裁剪 | 能避免直接引用完全无图舰，但会输出通用占位属性和跨版本裁剪 | DATA-01 |
| `master/furniture.ts` / `shop-data.ts` | 家具价格、默认家具、商店/付费道具 | 未发现独立 P0/P1 公式；依赖 master/本地购买模式，缺少官服商店版本 fixture | PROTO-04、TEST-01 |
| `resources/manifest.ts` | 资产索引、语音 hash 表、装备/家具/BGM/map fallback | 索引存在性和长度全通过；fallback 能降低旧缓存崩溃率，但也可能遮蔽 master/资产漂移，必须与闭包报告并用 | DATA-01 |
| `server/app.ts` / `bootstrap.ts` / `client-patches.ts` | 路由、方法/token 边界、1200×720 启动页、特殊改造画面常量、两个精确客户端补丁 | 启动与补丁结构可复用；所有 KCS API 接受任意方法且不验 token，浏览器启动仅在单一环境观察到停滞 | ST-05、PROTO-01、TEST-01 |
| `server/client-patches.ts` | slotset 回写、活动海域 ID 两处精确字符串补丁 | 对当前 hash 可重复；任何客户端变更会因唯一匹配失败而拒绝启动，属于可接受的 fail-fast，但需每版本重审 | DATA-01、TEST-01 |
| 全部 generated JSON/TS | 时间、源 URL、数量、交叉结果 | 生成物已冻结 hash，但原始输入未冻结，证据等级没有逐行进入产物 | DATA-02 |

归组说明：`battle/types.ts`、`state/types.ts`、`resources/types.ts` 只定义结构；`improvement-data.ts`、`quest-data.ts`、`routing-data.ts` 只装载上表已审生成物；`cli.ts`、`server/launcher.ts` 和 debug 面板不含独立官服数值规则。`master/shipgraph-offsets.ts` 仅调整立绘位置，属本轮明确排除的美术表现质量。它们均已纳入文件枚举，但没有人为制造独立发现编号。

### 生成源清单

- 建造/开发：`kcwiki/kancolle-data@master`、`api.kcwiki.moe/start2`、`db.kcwiki.cn`。
- 改修：`fleet.diablohu.com/arsenal/` 与 `KC3Kai/master/src/data/akashi.json`。
- 带路：`kcwiki/kancolle-data/master/map/edge.json`、KC3 节点数据、中文 Wiki API。
- 出击/掉落：kcwiki drop DB、start2、enemy/enemyEquipment/ship 的 `master` 快照。
- 活动：本地 `cache/kcs2/resources/map/061` 与 KCNav。
- 远征：start2 与 Nishisonic SuccessCheck；前置关系由生成器补推。
- 通用 master：`kcwiki/kancolle-data` 的 equipment/ship 原始数据与 jsDelivr start2。
- 任务：`https://kcwikizh.github.io/kcwiki-quest-data/data.json`。
- 商店：`https://api.kcwiki.moe/start2`。

这些来源适合构建离线近似，但在固定 commit、原始响应与统计时间窗之前，不满足可重复的“官服基线”要求。
