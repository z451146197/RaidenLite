# AGENT START HERE — RaidenLite

任何新的 ChatGPT / Codex / Agent 对话，在开始修改仓库前，必须先完成以下读取顺序：

1. `docs/HANDOFF_INDEX.md` — 当前三线分工、分支状态、集成顺序与接力入口。
2. `docs/COLLABORATION_RULES.md` — Git / Cocos 并行开发纪律。
3. `docs/MISSION01_DESIGN_BRIEF.md` — Mission 01 已锁定的剧情、玩法与演出设计。
4. **Mission 01 当前生产包（必须读）：**
   - `docs/MISSION01_SCRIPT.md` — 第一关 v1 完整制作脚本与演出顺序。
   - `docs/MISSION01_WAVE_TABLE.md` — 可直接给程序/关卡执行的波次与事件表。
   - `docs/MISSION01_ASSET_LIST.md` — 第一关 v1 素材优先级与程序演出替代清单。
5. 按自己的工作线读取：
   - 1 线：`docs/HANDOFF_LINE1_GAMEPLAY.md` + Issue #5
   - 2 线：`docs/HANDOFF_LINE2_ENVIRONMENT.md` + Issue #6
   - 3 线：`docs/HANDOFF_LINE3_ORCHESTRATION.md` + Issue #7
6. 最后读取最新 `main` HEAD、自己的任务 Issue、目标文件当前版本，再开始编码。

## 当前任务 Issue

- **1 线 / Gameplay Runtime Integration**：#5
- **2 线 / Environment / Scene / Assets**：#6
- **3 线 / Director / Wingman Combat / GOLIATH / CI**：#7

如果 Issue 已关闭，先检查它的最终 `NEXT` 和是否创建了后继 Issue，再继续；不要因为编号旧就回退到聊天记忆。

## 生产包优先级

`MISSION01_SCRIPT.md`、`MISSION01_WAVE_TABLE.md`、`MISSION01_ASSET_LIST.md` 是当前制作执行资料；`MISSION01_DESIGN_BRIEF.md` 是更高层设计基线。若精确秒数、敌人数或素材清单发生试玩调整，以最新 main 中已更新的生产包与对应 Issue/PR 为准，但不得随意破坏设计简报中标记为 LOCKED 的叙事/玩法顺序。

## 绝对规则

- **不要根据旧聊天记忆直接改代码。仓库当前状态优先。**
- **不要从长期落后的旧 feature/assets 分支继续开发。** 新任务默认从最新 `main` 建新分支，除非对应 handoff 明确指定正在工作的分支。
- **不要同时抢写高冲突文件。** `GameManager.ts`、`Mission01Timeline.ts`、`*.scene`、`*.prefab`、`*.meta` 默认单写者。
- **不要用重建 `.meta` / UUID 的方式解决资源问题。**
- **不要把“CI 绿”自动等同于素材正确或演出正确。** 静态检查、Cocos build、必要的视觉/交互验证各自解决不同问题。
- 一旦发现自己的任务会跨入另一条线的“独占写入区”，先停在接口/新增文件层，通过 Issue/PR 留清楚接线要求，不要直接大改对方负责文件。

本文件只提供入口；详细状态与任务以 `docs/HANDOFF_INDEX.md`、Mission 01 生产包、各线 handoff 和对应 Issue 为准。
