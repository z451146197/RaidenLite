# 3 线接力 — Director / Boss / CI / Integration Gate

> 本文件是当前对话线自己的持久化接力记录。新的 3 线对话必须先读仓库，不依赖旧聊天。

## 1. 3 线职责

3 线当前承担：

- Mission 01 Director / Actor State / Sequence / Port 架构
- Wingman Combat Core 的纯逻辑层与验证
- GOLIATH 场景→Gameplay 交接与 Boss 演出 Core
- CI、静态门禁、资源完整性门禁
- 跨 1/2 线 PR 的架构审查与最终集成门禁

### 当前明确不做

- 1 线活跃期间不直接抢写 `GameManager.ts`
- 2 线活跃期间不大改 StarField / 环境场景
- 不从旧的完整 integration 分支继续堆功能

`feature/mission01-runtime-integration-v2` 已明确 **PARKED**，不要继续。

---

## 2. 新 3 线对话启动顺序

读取：

1. `/AGENT_START_HERE.md`
2. `docs/HANDOFF_INDEX.md`
3. `docs/COLLABORATION_RULES.md`
4. `docs/MISSION01_DESIGN_BRIEF.md`
5. 本文件
6. 最新 main 与以下活动分支/PR/Issue：
   - `fix/wingman-viper-png-integrity`
   - `feature/mission01-wingman-combat-core`
   - 对应 test CI 分支（只看验证，不合并）
7. 再检查 1/2 线是否已有新 PR，避免抢文件。

---

## 3. 当前已完成的架构基础

Director Core 已进入 main，关键 merge commit：

`1dcd636fc10c30197b9956ea6b19fa5da4df5635`

核心原则：

- `MISSION01_DIRECTOR` 是唯一剧情时间源。
- Timeline 决定“何时发生”。
- Actor State / Sequence 决定“演员/阶段现在是什么状态”。
- Runtime Controller / Gameplay Port 决定“如何执行”。
- 不允许 StarField / Wingman / GameManager 分别维护自己的剧情秒表。

---

## 4. 当前 P0：VIPER PNG 完整性修复

已确认仓库中的 `wingman_viper.png` 存在真实 PNG 数据损坏：

- IHDR / palette / transparency / IEND 可解析。
- IDAT chunk CRC 错误。
- Cocos Creator / libspng 首次导入会出现：`pngload: libspng read error`。
- 过去主线某次 build 在第二次重试后成功，但成功产物仍可能携带原损坏 PNG，因此“CI 绿”不能证明该资源健康。

活动分支：

`fix/wingman-viper-png-integrity`

已做：

- 对可恢复的 320×400 VIPER 图像做无设计改动的重新编码。
- **不改 `.meta`、不改 UUID。**
- 修复提交锚点：`9df24258409b0b8d4a0e195cef7b86914576891f`。
- 新增纯 Node PNG chunk/CRC 检查器，目标路径：`tools/check-png-integrity.cjs`。

新 3 线的第一任务：

1. 检查最新 main 是否已包含该修复。
2. 若未包含，完成严格 PNG 检查 + Cocos Web Mobile build。
3. 验证修复后不再出现 `wingman_viper.png → libspng read error`。
4. PR 合入 main。
5. 将 `node tools/check-png-integrity.cjs` 加入主线快速验证步骤，避免未来坏 PNG 被重试掩盖。

---

## 5. 当前 P0：Wingman Combat Core

活动分支：

`feature/mission01-wingman-combat-core`

目标结构：

```text
Actor State
   ↓
Wingman Combat Scheduler
   ↓
Targeting Policy
   ↓
Fire Order
   ↓
Gameplay Port
   ↓
1 线现有 Bullet / Collision / Score / Drop
```

已完成方向：

- 射击调度使用 Director 时间/确定性 slot，不维护第二套 `dt` 剧情时钟。
- VIPER / FALCON 各有 support-fire profile。
- FALCON `INTERCEPT` 提高攻击积极度。
- `DAMAGED / WITHDRAWING / WITHDRAWN / DESTROYED` 等状态没有正常射击 profile。
- 纯 Targeting Policy 支持 `NEAREST_AHEAD` 与 `PRIORITY_THREAT`。
- `PRIORITY_THREAT` 优先 HEAVY 威胁，再考虑高价值目标。
- Combat Core 只发 fire order，不直接操作 Enemy/Bullet/GameManager。

验证脚本：

`tools/check-mission01-wingman-combat-core.cjs`

隔离 CI 分支：

`test/mission01-wingman-combat-core-ci`

**该 test 分支包含临时 workflow/组合验证，不允许整体合入 main。**

新 3 线任务：

1. 先完成 VIPER PNG 修复。
2. 在“健康 PNG + 最终 Combat Core”组合上完成静态 + Cocos build。
3. 只把 `feature/mission01-wingman-combat-core` 的纯 Core/检查文件通过 PR 合入 main。
4. 不在该 PR 接 `GameManager.ts`；最终接线交 1 线。

---

## 6. P1：GOLIATH 演出 Core

历史分支 `feature/goliath-death-sequence` 已与 main 分叉，只供参考，**不要直接 merge**。

GOLIATH 锁定原则：

- 机体从开场就是独立 Sprite/Node，不烘焙进环境背景。
- 地面状态 → 平台启动 → 升空 → 阴影缩小/淡出 → 轻微 scale → layer handoff → Boss AI。
- 2 线提供平台/环境承接；3 线负责 GOLIATH Sequence/表现协议；1 线只在必要时消费 BOSS 入口事件。
- Boss HP=0 后不能立即 destroy。
- 使用多个爆炸挂点 stagger：局部爆炸 → 烟火 → 中央大爆炸 → 隐藏机体/碎片/清场。
- V1 不做额外逐帧 Boss 动画，继续程序演出原则。

建议从最新 main 建新的 Boss 分支，而不是复活旧分叉，例如：

`feature/mission01-goliath-sequence-v2`

优先新增独立脚本/Sequence/Core；若最终需要 GameManager 小接线，先让 1 线合并或通过独立 integration PR 协调。

---

## 7. 3 线的验证职责

每个相关 PR 最低审查：

```bash
node tools/check-project.cjs
node tools/check-mission01.cjs
node tools/check-mission01-director-core.cjs
```

Combat Core 进入主线后再加：

```bash
node tools/check-mission01-wingman-combat-core.cjs
```

PNG 门禁进入主线后再加：

```bash
node tools/check-png-integrity.cjs
```

同时检查：

- Cocos Web Mobile build 是否真正成功。
- build 日志中是否存在被 fallback/retry 掩盖的 importer 错误。
- `.scene/.prefab/.meta` UUID 是否被异常重建。
- 是否重新出现第二套 Mission 01 elapsed/timer。
- GOLIATH 是否仍保持单一实体交接。

---

## 8. 跨线合并门禁

### 审 1 线

- `GameManager.ts` 是否只消费 Director 事件，而非再维护剧情时间轴。
- Wingman fire order 是否进入现有友军 Bullet 链。
- 是否无第二套 Wingman damage/score/drop 系统。

### 审 2 线

- 六段环境是否连续、可读、中央战斗通道清楚。
- 是否无整关 AI 背景回退。
- 是否把 GOLIATH 错误烘焙进背景。
- PNG/UUID/scene 引用是否健康。

### 最终集成

不要用“大一统重写”解决冲突。优先小 PR、清晰依赖顺序、每次合并后让其他工作线重新以最新 main 为基线。

---

## 9. 3 线再次换对话前

必须更新本文件或对应 Issue 的：

- DONE
- 当前 active branch / PR
- 最新成功/失败 CI run
- 当前阻塞点
- 下一步准确动作

不要让新的 3 线再次通过猜测恢复上下文。
