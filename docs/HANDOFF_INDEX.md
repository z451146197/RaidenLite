# RaidenLite 三线接力总表

> 目标：让 1 / 2 / 3 线在聊天上下文丢失、对话到达上限或更换 Agent 后，仍能只依赖仓库无缝接力。
>
> 本文件记录“当前工作分工与接力协议”。设计原则以 `MISSION01_DESIGN_BRIEF.md` 为准，Git/Cocos纪律以 `COLLABORATION_RULES.md` 为准。

## 0. 新对话启动顺序（必须）

新对话开始工作前按顺序读取：

1. `/AGENT_START_HERE.md`
2. `docs/HANDOFF_INDEX.md`（本文件）
3. `docs/COLLABORATION_RULES.md`
4. `docs/MISSION01_DESIGN_BRIEF.md`
5. 自己工作线的 handoff 文件
6. 最新 `main` HEAD、目标 Issue、目标文件现状

**仓库事实优先级：最新 main / PR / Issue > handoff 中的历史 SHA > 旧聊天记忆。**

### 当前任务 Issue

- **1 线：Issue #5** — Mission 01 Gameplay Runtime Integration v2
- **2 线：Issue #6** — Mission 01 Environment / Scene / Assets v2
- **3 线：Issue #7** — Director / Wingman Combat Core / GOLIATH / CI gate

Issue 关闭时，先读其最终交接中的 `NEXT` 并寻找后继 Issue；不要重新依赖旧聊天。

---

## 1. 当前共享基线（接力快照）

接力文件创建时的 `main`：`ad7423bbd48601a0efadf011a0c3c3c2eed01bd5`。

已进入主线的重要基础：

- Mission 01 设计简报与并行纪律已在 `docs/`。
- Mission 01 Director Core 已通过 PR 合入主线；关键 merge commit：`1dcd636fc10c30197b9956ea6b19fa5da4df5635`。
- 主线 Web Mobile Preview #16 在该快照附近成功完成并部署。
- 三线持久化接力文档通过 PR #4 合入；接力文档 merge commit：`b391de419887bd8f51ff229f8b6c1220ffcfae74`。

**注意：上面的 SHA 只是接力锚点，不是要求新对话停留在该提交。开工时必须重新读取最新 `main`。**

---

## 2. 三线职责锁定

| 工作线 | 当前主责 | 默认独占写入区 | 不应主动抢写 |
|---|---|---|---|
| 1 线 | Gameplay / Mission 01 运行时集成 | `GameManager.ts`、玩家/敌人/子弹/碰撞/Power/Bomb Gameplay 接线 | 背景素材、场景大改、Boss 演出核心、CI 架构 |
| 2 线 | 环境 / 场景 / 素材 | `StarField.ts` / 背景模块、环境资源、必要的 `.scene/.prefab/.meta` 集成 | `GameManager.ts`、Timeline 秒点、Boss 战斗逻辑 |
| 3 线 | Director 架构 / Boss 演出 / CI / 验证 / 合并门禁 | Director/Actor State/Ports、GOLIATH Sequence、检查脚本、CI | 1 线活跃期间直接改 `GameManager.ts`；2 线活跃期间抢写环境场景 |

跨线需求优先通过“新增接口/新增文件/Issue 接线说明”交接，而不是直接越界改高冲突文件。

---

## 3. 当前分支状态与处理规则

### 1 线旧分支

- `feature/mission01-runtime`：已落后主线，**只作历史参考，不继续开发**。
- `feature/mission01-director-integration`：包含早期完整集成尝试，但已经与主线分叉，**只作参考，不直接合并**。
- `feature/mission01-runtime-integration-v2`：3 线曾创建但尚未进入实际施工，现明确 **PARKED**，避免与新 1 线争抢 `GameManager.ts`。

新 1 线默认从最新 `main` 新建 `feature/mission01-gameplay-runtime-v2`（或同义新分支）。

### 2 线旧分支

- `assets/mission01-environment-v1`：已落后主线，**只作参考，不在其上继续开发**。

新 2 线默认从最新 `main` 新建 `assets/mission01-environment-v2`。

### 3 线当前活动/待处理分支

- `feature/mission01-wingman-combat-core`：僚机射击调度 + 瞄准策略 Core，尚未进入主线时由 3 线负责验证与合并。
- `fix/wingman-viper-png-integrity`：修复 VIPER PNG IDAT CRC，同时加入 PNG 完整性门禁；由 3 线完成验证、PR、合并。
- `test/mission01-wingman-combat-core-ci`：**纯隔离验证分支，不得直接合入 main**。
- `feature/goliath-death-sequence`：历史分叉实现，仅供 3 线参考；不要直接把旧分支整体合入最新主线。

---

## 4. 近期集成顺序

为降低冲突，近期建议按以下顺序推进：

1. **3 线**：先收尾 VIPER PNG 完整性修复与 PNG CRC 门禁。
2. **3 线**：验证并合入 Wingman Combat Core（纯 Core，不直接接 `GameManager`）。
3. **1 线**：从最新 main 做 Director → Gameplay Runtime Integration，并把 Wingman Combat Core 接入现有 Bullet/碰撞/计分链。
4. **2 线**：并行做 Mission 01 六段环境 V2；只要不抢 `GameManager.ts`，可与 1/3 线并行。
5. **3 线**：在不改 1 线高冲突文件的前提下继续 GOLIATH 场景→Gameplay 交接、Boss 死亡演出 Core 与验证。
6. 最后由 3 线做跨线集成审查：时间单源、UUID、场景引用、Cocos build、Mission 01 结构检查。

若主线状态发生变化，以最新 PR / Issue 为准，不机械执行旧顺序。

---

## 5. 关键技术不变量

所有工作线都必须保护以下不变量：

- Mission 01 **只有一个剧情时间源**：`MISSION01_DIRECTOR` / Director Core。
- 不允许在 Wingman、StarField、GameManager 等组件里重新维护另一套关卡 `elapsed`/事件游标。
- Timeline 决定“何时发生”，Actor State / Sequence 决定“处于什么阶段”，各 Controller / Gameplay 负责“如何表现/执行”。
- VIPER / FALCON 必须真实参与战斗，但伤害、碰撞、计分、掉落应复用主 Gameplay 链，不建立独立战斗规则。
- GOLIATH 从一开始就是独立 Sprite/Node；不能烘焙进背景后再突然换成另一只 Boss。
- V1 动画原则：**能程序做的动画，不新增美术帧**。
- Mission 01 环境坚持“模块化素材 + Cocos 组合”，不回到“一张 AI 图直接生成整关”的旧方案。
- 任何已有 `.meta` UUID 都不能为了解决冲突/资源问题随意重建。

---

## 6. 每条线完成一次任务后的仓库交接格式

PR 或 Issue 最后必须写清：

- **DONE**：本轮完成什么。
- **BRANCH / PR / COMMIT**：准确引用。
- **FILES TOUCHED**：尤其注明是否碰高冲突文件。
- **VALIDATED**：跑过哪些 Node 检查、Cocos build、视觉/交互验证。
- **KNOWN RISKS**：当前已知问题。
- **NEXT**：下一位 Agent 第一件应该做什么。

如果任务改变了分工、主线状态或关键分支，请同步更新对应 `HANDOFF_LINE*.md` 的“最新接力点”，而不是让关键信息只存在聊天里。

---

## 7. 新 Agent 的默认行为

如果用户只说“继续 1 线 / 继续 2 线 / 继续 3 线”：

1. 不要求用户复述旧聊天。
2. 先按本文件启动顺序读取仓库。
3. 检查最新 main 与对应 Issue/分支。
4. 若旧分支已经落后或职责已迁移，按 handoff 新建分支。
5. 直接继续当前任务，并在有实质进展后汇报。
