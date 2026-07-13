# 舰队 Collection 本地服务端审查整改报告

日期：2026-07-13  
基线审查：[2026-07-10-kancolle-parity-audit.md](./2026-07-10-kancolle-parity-audit.md)

## 1. 闭环口径

本轮把基线审查的 41 个发现逐项关闭。这里的“关闭”分为两类：

- **实装并回归**：有足够协议、公开公式或状态守恒证据，按该证据实现，并以 fixture、公式向量、事务不变量或统计测试固定行为。
- **显式边界并失败关闭**：官服隐藏概率、当前活动数据或旧缓存客户端无法支持的玩法，不再用占位成功、最近邻伪公式或静默回退冒充实现；由版本化 gameplay profile、证据清单和明确错误隔离。

默认运行配置是 `cache-6.2.3.1-community-2026-07-12`。它明确记录客户端、master、资产和规则日期的混合边界；5-6 规则测试和合成活动协议必须显式选择对应 profile，默认客户端不会看到无法渲染或无生产数据支持的内容。

## 2. 逐项闭环矩阵

| ID | 处置 | 主要实现 | 回归证据 |
|---|---|---|---|
| ST-01 | 实装 | 解体前严格解析、去重并验证实例；无效或混合输入原子失败，只按实际 master 结算 | `state-integrity.test.ts`、`state.test.ts` |
| ST-02 | 实装 | 舰队、舰载机、陆航和预设消费统一先验库存检查，扣除与状态变化同事务 | `supply.test.ts`、`land-base.test.ts`、`state-transactions.test.ts` |
| ST-03 | 实装 | 统一装备 ownership/move 语义，普通槽、扩展槽、库存和陆航互斥；删除拒绝悬空引用 | `state-integrity.test.ts`、`api.test.ts` |
| ST-04 | 实装 | 舰船删除集中校验锁定、编成、入渠、远征、出击与预设引用 | `state-integrity.test.ts`、`state.test.ts` |
| ST-05 | 实装 | `/kcsapi` 仅接受 POST；强制当前会话 token、请求 schema、初始化状态和 master 白名单；初始舰不可重放 | `request-boundary-server.test.ts`、`request-validation.test.ts`、`server.test.ts` |
| ST-06 | 实装 | `getSave()` 改为纯快照；`settle(now)` 在一个总事务中显式完成所有到期结算 | `state-transactions.test.ts`、`state.test.ts` |
| ST-07 | 实装 | 战斗、远征、改修及其任务事件在同一事务提交；加入每个 crash point 的故障注入 | `state-transactions.test.ts` |
| DB-01 | 实装 | 未知未来 schema 只读检查后拒绝启动且不改文件；支持版本使用显式迁移与备份 | `state.test.ts` |
| PROTO-01 | 实装 | 定位为标题语音回调未触发导致的客户端启动死锁；保留语音/BGM并加入 2.5 秒幂等超时，同时补齐母港消费字段 | `client-patches.test.ts`；浏览器完成“标题页→母港→补给”实机链路 |
| PROTO-02 | 实装 | `open_exslot` 实现物品消费与舰船更新；服务最终 handler 与审查附录 138 个端点集合严格相等 | `api-surface.test.ts`、`api.test.ts` |
| PROTO-03 | 实装 | 六个占位写入口、演习匹配和两个开渠均持久化并校验消费；删除影子占位注册 | `api.test.ts`、`land-base.test.ts`、`limited-endpoints.test.ts` |
| PROTO-04 | 实装/边界化 | 12 个有限端点建立可执行契约；精确固定 `null`/数组/对象/省略语义，写入口持久化，离线禁用项明确标识 | `limited-endpoints.test.ts`、`limited-endpoints.ts` |
| Q-01 | 实装 | 任务可见性、前置、并行上限、周期、目标匹配、选项奖励与一次性领取统一进入状态机 | `quest-api.test.ts`、`quest-engine.test.ts`、`quest-period.test.ts` |
| BTL-01 | 实装 | endpoint mode 真正驱动夜转昼与第二航空阶段，阶段执行和序列化使用同一记录 | `battle-night-to-day.test.ts`、`battle-endpoint-modes.test.ts` |
| BTL-02 | 实装 | 敌主力/护卫分离建模，全阶段分别选目标、结算与序列化；生成数据保留联合维度 | `battle-combined-phases.test.ts`、`sortie-data.test.ts` |
| BTL-03 | 实装 | 擦弹改为 HP 比例分布；损管/女神独立模块；轰沉与结算使用战斗上下文而非永久 1 HP | `battle-damage.test.ts`、`battle-damage-control.test.ts`、`battle-sinking-settlement.test.ts` |
| BTL-04 | 实装 | 回避、对潜、索敌按 master 上下限和等级成长，删除“等级等于回避”和舰种猜测 | `ship-stat-growth.test.ts`、`ship-stat-serialization.test.ts`、`battle-stat-growth.test.ts` |
| BTL-05 | 实装 | 雷击先生成双方 immutable intents 后同时应用；交战形态进入开闭幕雷击；目标类型显式过滤 | `battle-torpedo.test.ts` |
| BTL-06 | 实装 | S/A/B/C/D/E 完整判定，纳入旗舰、击沉数和双方损伤比例；经验、掉落、任务与地图结算共用 rank | `battle-result.test.ts`、`battle.test.ts` |
| BTL-07 | 实装 | 航空阶段拆分制空、Stage 1/2、触接、AACI 候选与熟练度；固定 seed 与统计边界分离 | `battle-aaci.test.ts`、`aircraft-proficiency.test.ts`、`battle-formulas.test.ts` |
| BTL-08 | 实装 | 第一轮按射程且同射程随机，第二轮按位置；先锋阵与联合边界补全；航母炮击使用分项取整公式 | `battle.test.ts`、`battle-formulas.test.ts`、`combined-fleet.test.ts` |
| BTL-09 | 实装 | 夜战目标按 surface/submarine/installation 分类；CI、夜战装备、对潜擦弹和陆基火力分别处理 | `battle-night-targets.test.ts`、`battle-formulas.test.ts` |
| BTL-10 | 实装/边界化 | 陆航按基地和波次、航程校验、三类支援、命中 miss、熟练度均拆为模块；喷气、友军、特殊攻击、烟幕、气球、适重炮因缺证据显式禁用且不得落入普通阶段 | `land-base.test.ts`、`expedition-support.test.ts`、`aircraft-proficiency.test.ts`、`battle-capabilities.test.ts` |
| GRW-01 | 实装 | 婚舰上限与累计经验补到 Lv188 | `experience.test.ts` |
| GRW-02 | 实装 | 提督 Lv1—120 使用完整离散累计表，不再用分段近似 | `experience.test.ts` |
| GRW-03 | 实装 | 入渠时间采用 Lv11/12 分段基数、舰种倍率、损失 HP 与 30 秒常数 | `repair.test.ts` |
| GRW-04 | 实装 | 近代化各属性独立判定成功/失败并按对应公式取整，支持海防舰特殊属性和上限 | `api.test.ts`、`state.test.ts` |
| GRW-05 | 实装/边界化 | 明石/改成功率逐星修正，三槽按曜日/二号舰稳定选择；缺源 recipe 从可用 master 隐藏并保留 evidence | `improvement.test.ts`、`improvement-data-generation.test.mjs` |
| GRW-06 | 实装 | 舰船和装备解体按各自 `api_broken` 结算，并与 ST-01 共用原子校验 | `state-integrity.test.ts`、`api.test.ts` |
| GRW-07 | 实装 | 自然恢复 soft cap、主资源 350,000 hard cap、次级 3,000 cap 和允许越界奖励分离 | `state.test.ts`、`api.test.ts` |
| GRW-08 | 实装 | 所有任务周期以 JST 05:00 业务日计算，周周期固定周一，覆盖月/季/跨年 | `quest-period.test.ts` |
| GRW-09 | 实装 | 远征大成功、大发/改修/特大发/鬼怒、专用奖励、显式前置和月常“成功后才计次”进入数据驱动引擎 | `expedition-engine.test.ts`、`expedition-state.test.ts`、`expedition-api.test.ts` |
| GRW-10 | 实装 | 陆航机种容量、ownership、部署成本/等待、补给不足与航程统一校验 | `land-base.test.ts`、`state-integrity.test.ts` |
| GRW-11 | 边界化 | 删除最近邻三配方插值；只有带样本数和证据的统计配方可抽取，未收录配方明确拒绝 | `arsenal.test.ts` |
| GRW-12 | 边界化 | 演习定义为固定 seed 的离线模拟，保留 03:00/15:00 JST 批次与本地结算，不宣称官服匹配 | `practice.test.ts`、`gameplay-profile.test.ts` |
| MAP-01 | 实装/边界化 | 带路条件生成时编译为类型化 AST；未知术语抛错而非静默 false；规则标注 exact/statistical/fallback；速力按版本化组和舰级例外 | `routing.test.ts`、`routing-data.test.ts`、`ship-speed.test.ts` |
| MAP-02 | 实装/边界化 | 编成保留节点、难度、HQ、阵型和联合维度；掉落检查 rank、容量、持有限制并保留社区统计证据 | `sortie-data.test.ts`、`battle-result.test.ts` |
| MAP-03 | 实装/版本化 | 普通图与活动进度由 schema 驱动；5-6 完整实现 TP、R/N/Z 阶段、奖励、月重置与 5-5 前置；旧客户端默认隐藏 5-6；合成活动包默认拒绝、仅测试显式启用 | `map-progress.test.ts`、`event-data.test.ts`、`debug-events.test.ts` |
| DATA-01 | 实装/版本化 | 启动时建立 master—资源—改造目标—玩家实例闭包；舰船按 profile 裁剪；已知装备即使缺少专属卡图也保留 master，并使用同类型缓存图，只有真正未知的玩家实例才拒绝 | `resource-manifest.test.ts`、`gameplay-profile.test.ts` |
| DATA-02 | 实装 | 九类生成物使用冻结原始响应、commit/revision、SHA-256、HTTP、license、参数和逐行 evidence；CI 离线逐字节重建 | `verify-generated-data.mjs`、`.github/workflows/ci.yml` |
| TEST-01 | 实装 | 测试按协议 fixture、公开公式向量、状态/事务不变量和统计边界拆分；旧的自洽错误 oracle 已替换 | `tests/` 全套回归与 CI |

## 3. 关键架构结果

1. **状态层**：外部读取纯化，所有写入口经过 schema 校验和事务；ownership、引用完整性、资源上限与 crash rollback 成为集中不变量。
2. **协议层**：缓存客户端的 138 端点成为可执行闭包，未知端点仍记录脱敏日志并失败；有限端点不再散落成无注释常量。
3. **战斗层**：阶段编排、目标分类、伤害、雷击、航空、支援、陆航、胜败与结算拆为可独立测试的模块；证据不足的高级机制有统一 capability manifest。
4. **数据层**：生成器默认严格离线，`--refresh` 才允许网络；原始快照、源锁、生成器输入和最终生成物形成完整哈希链。
5. **版本层**：旧缓存客户端、2026 社区规则、5-6 与合成活动不再混成一个“最新”世界；所有越界能力必须显式选择 profile。

## 4. 最终验证

- `npm run typecheck`
- `npm test`
- `npm run verify:data`
- `git diff --check`
- 浏览器端到端：新临时存档完成泊地选择、标题页、GAME START、母港渲染并进入补给界面；初始 API、母港资源和后续交互均成功，unknown API 日志为空。

精确的官服隐藏概率、真实玩家演习池以及未发布的生产活动数据仍不可能从本仓库缓存推导。它们现在是可查询、可测试、默认关闭的证据边界，而不是静默伪实现。
