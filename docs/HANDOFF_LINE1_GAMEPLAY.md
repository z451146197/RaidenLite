# 1 线接力 — Gameplay / Mission 01 Runtime Integration

> 本文件给新的 1 线对话使用。不要依赖旧聊天继续；以仓库最新 main、Issue 和本文件为准。

## 1. 你的职责

1 线现在是 **Gameplay 单写者 / Runtime Integration 负责人**。

你的核心目标不是重写游戏，而是把已经进入/即将进入主线的 Mission 01 Director/Actor State/Combat Core，正确接入现有 Gameplay，让剧情状态真正驱动玩家、敌机、僚机、波次、Boss 入口和 UI。

### 默认独占写入权

1 线在活跃期间拥有：

- `assets/scripts/game/GameManager.ts`
- 玩家控制 / 自动射击相关 Gameplay 接线
- Enemy / Bullet / Collision / Power / Bomb 运行时逻辑
- 僚机 fire order 落到现有 Bullet/伤害/计分链的最终接线

其他工作线默认不应并行改 `GameManager.ts`。

---

## 2. 新对话第一步

按以下顺序读：

1. `/AGENT_START_HERE.md`
2. `docs/HANDOFF_INDEX.md`
3. `docs/COLLABORATION_RULES.md`
4. `docs/MISSION01_DESIGN_BRIEF.md`
5. 本文件
6. 最新 main 的：
   - `Mission01Director.ts`
   - `Mission01ActorState.ts`
   - `Mission01Timeline.ts`
   - `Mission01Sequences.ts`
   - `GameManager.ts`
   - `Mission01Wingmen.ts`
   - `PlayerFlightPresentation.ts`
   - `Bullet.ts`
   - `Enemy.ts`

然后检查相关 Issue/PR 是否已有新的 Core 合入。

---

## 3. 分支规则

不要继续这些旧分支：

- `feature/mission01-runtime`
- `feature/mission01-director-integration`
- `feature/mission01-runtime-integration-v2`

它们只作历史参考。

**从最新 `main` 新建：**

`feature/mission01-gameplay-runtime-v2`

若该名称已存在且是活跃新分支，先比较后继续；若已陈旧，另建同义新分支，不要 force 覆盖。

---

## 4. 当前任务优先级

### P0 — Director 成为唯一 Mission 01 Runtime 时间源

把 Gameplay 从“自己维护关卡 elapsed/事件游标”迁移到 Director 事件/状态消费。

必须满足：

- `GameManager` 不再维护第二套 Mission 01 秒表。
- WAVE / ELITE / WARNING / BOSS / STORY / CONTROL / SCROLL 等剧情事件由 Director 分发后消费。
- 暂停、掉帧、回前台时不能因为多套 timer 造成剧情/战斗漂移。
- 不要在 `GameManager` 里重新硬编码 98s / 108s / 146s 等剧情秒点。

旧 `feature/mission01-director-integration` 可以参考思路，但**不能直接整体 merge**；以最新 main 重新做最小补丁。

### P0 — 僚机真正参与战斗

如果 `feature/mission01-wingman-combat-core` 已合入 main：

- 使用其 fire order / targeting policy。
- VIPER / FALCON 的机位由 `Mission01Wingmen` 或等价 pose provider 提供。
- Gameplay 负责把 fire order 变成现有 `Bullet`。
- 僚机弹必须走现有玩家友军弹的碰撞 / 敌机伤害 / Boss 伤害 / 对 NORMAL 敌弹抵消 / 对 HEAVY 不抵消的规则。
- 不做 `WingmanBulletSystem`、`WingmanDamageSystem` 等第二套战斗系统。
- 僚机伤害是辅助火力，不应替玩家快速清屏；以 Combat Core profile 为准。

如果 Combat Core 尚未合入：先完成 Director Runtime Integration，保留薄接口，不复制 Core 代码到 Gameplay。

### P1 — Actor State → 真实行为

重点保证：

- AURORA 在 `PLAYER_CONTROL` 前不可正常操控/自动开火。
- FALCON `INTERCEPT` 阶段会真实攻击，并体现较积极的威胁优先级。
- FALCON 进入 `DAMAGED` 后立即失去正常战斗能力；之后由表现层负责烟、坠落、爆炸。
- VIPER 在 Boss 入场附近受损撤退后停止开火并离场，但不死亡。
- Boss 战开始后 AURORA 单机作战。

### P1 — 保持现有 Gameplay 规则统一

不要借 Runtime Integration 顺手重写：

- Player hit radius 规则
- NORMAL / HEAVY 定义
- Power / Bomb 核心规则
- Score / Drop 链
- Enemy 基础运动系统

除非接线暴露确定 bug，否则保持最小改动。

---

## 5. 明确禁改区

除非 Issue 明确授权，不要主动修改：

- `Mission01Timeline.ts` 的剧情顺序/秒点
- 大规模背景 / StarField 架构
- `.scene/.prefab/.meta`
- GOLIATH 死亡演出核心
- GitHub Actions / CI 架构

若需要这些修改，在 Issue 留接口要求，让 2/3 线处理。

---

## 6. 验收标准

最低：

```bash
node tools/check-project.cjs
node tools/check-mission01.cjs
node tools/check-mission01-director-core.cjs
```

若主线已有 Combat Core 检查，再加：

```bash
node tools/check-mission01-wingman-combat-core.cjs
```

并完成至少一次 Web Mobile/Cocos build。

运行逻辑验收：

- 只有一个 Mission 01 剧情时间源。
- 00:24 左右（实际以 Timeline 为准）才开放控制。
- 波次来自 Timeline/Director，而不是 GameManager 独立秒表。
- VIPER/FALCON 能打中敌人。
- FALCON 受损后不再正常开火。
- VIPER 撤退后不再存在战斗输出。
- Boss 入口不会被 GameManager 自己的旧计时重复触发。

---

## 7. 完成后怎么交接

PR 描述/Issue 最后一条更新必须包含：

- DONE
- BRANCH / PR / COMMIT
- GameManager 是否成为唯一 Gameplay 事件消费者
- 删除/停用的旧计时字段
- 僚机 fire order 如何进入 Bullet 链
- VALIDATED
- KNOWN RISKS
- NEXT

若 1 线聊天再次到上限，把最新接力点补到本文件末尾再结束，不要只留在聊天里。
