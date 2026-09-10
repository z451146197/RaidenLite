# 2 线接力 — Mission 01 Environment / Scene / Assets

> 本文件给新的 2 线对话使用。旧聊天可以丢失；以仓库最新 main、Issue、本文件和设计简报为准。

## 1. 你的职责

2 线现在是 **Mission 01 环境 / 场景 / 素材单写者**。

核心目标：把当前“能跑的程序化背景原型”推进成可玩的六段海岸基地环境，同时保持与剧情节奏、GOLIATH 伏笔和 Gameplay 可读性一致。

### 默认独占写入权

2 线在活跃期间优先拥有：

- `assets/scripts/background/StarField.ts` 或后续拆出的 BackgroundController / EnvironmentController
- Mission 01 背景模块、跑道、道路、港区、后勤、海岸、基地设施素材
- 与环境接入直接相关的 `.scene/.prefab/.meta`
- 环境层级、云层/parallax、地面破坏视觉、GOLIATH 地面平台的环境部分

---

## 2. 新对话第一步

按顺序读：

1. `/AGENT_START_HERE.md`
2. `docs/HANDOFF_INDEX.md`
3. `docs/COLLABORATION_RULES.md`
4. `docs/MISSION01_DESIGN_BRIEF.md`
5. 本文件
6. 最新 main 的：
   - `StarField.ts`
   - `Mission01Timeline.ts`
   - `Mission01Sequences.ts`
   - 与 background/resources/art 相关目录
   - `Game.scene` 仅在确实需要场景接线时读取

随后检查对应 Issue 和最新 main，不要按旧聊天假设素材仍然缺失/仍然相同。

---

## 3. 分支规则

不要继续：

`assets/mission01-environment-v1`

它已经落后主线，只作历史参考。

**从最新 `main` 新建：**

`assets/mission01-environment-v2`

如果已有新的同名活跃分支，先 compare；不要 force 覆盖。

---

## 4. 当前任务优先级

### P0 — 六段 Mission 01 环境真正落地

保持以下六段叙事环境：

1. `BG01` 起飞基地 / 跑道与机库
2. `BG02` 海岸撤离走廊
3. `BG03` 港区防御带
4. `BG04` 撤离后勤区
5. `BG05` 基地崩溃 / 被己方防御系统清除
6. `BG06` GOLIATH 战区 / 平台区

它们需要看起来属于**同一座海岸军事基地**，而不是六张互不相干的图。

### P0 — 继续模块化，不回到整图 AI 方案

锁定原则：

- Base：水 / 海岸 / 地面大色块
- Ground：跑道 / 道路 / 码头 / 平台
- Props：机库 / 雷达 / 防空设施 / 车辆 / 集装箱 / 油罐 / 工业结构
- FX：云 / 烟 / 火 / 警示灯 / 局部破坏
- Boss Ground Foreshadow：GOLIATH 平台/阴影/灯光，但 **GOLIATH 机体本身是独立 Node/Sprite**

AI 若使用，只用于单个简单组件/纹理探索，不允许让 AI 决定整个关卡几何。

### P0 — Gameplay 可读性

环境不能抢走弹幕和敌机可读性：

- 中央主战斗通道必须清晰。
- 高对比细节尽量靠边或用于剧情锚点。
- 不在背景中烘焙 HUD、文字、玩家飞机、僚机、敌机。
- 不把 GOLIATH 机体直接画死在最终背景中。
- 竖屏 750×1334 目标下，避免细节缩小后变成噪点。

### P1 — 环境状态与 Director 对齐

2 线可以让背景表现消费 Director/Sequence，但**不能另建自己的 Mission 秒表**。

允许：

- 根据 Director 当前阶段切背景段
- 根据 `SCROLL` / Sequence 调整滚动速度
- 根据剧情状态打开烟、火、灯、破坏层

禁止：

- `elapsed += dt` 然后自己在 30/52/98/146 秒触发剧情
- 在 StarField 里复制 Mission01Timeline

### P1 — GOLIATH 地面伏笔

环境负责“基地里有个巨型设施/平台”的空间叙事，但交接原则是：

- GOLIATH 从开场起就是独立 Sprite/Node（可暂时视觉上处于地面/背景层）。
- 环境只提供平台、阴影承接区、灯、烟、结构。
- Boss 前启动时，由 3 线 GOLIATH Sequence /表现层完成升空、阴影变化、层级切换。

---

## 5. 素材规则

### 已有素材

- 不要因为“打不开/导入异常”就重建 `.meta` UUID。
- 不要随意覆盖 AURORA / VIPER / FALCON / GOLIATH 已有外观文件。
- VIPER 曾发现 PNG IDAT CRC 损坏；3 线正在 `fix/wingman-viper-png-integrity` 负责修复。**2 线不要另行重导或重建它的 meta。**

### 新素材

- 优先静态顶视/俯视素材；动画依靠程序组合。
- 风格：写实/半写实军武、现实原型 + 近未来升级；避免卡通、霓虹、塑料玩具感。
- 透明 PNG 必须能被标准解码器严格读取。
- 若主线已有 `tools/check-png-integrity.cjs`，提交前必须运行。

---

## 6. 明确禁改区

除非 Issue 明确授权，不要修改：

- `GameManager.ts`
- Player/Enemy/Bullet/Power/Bomb Gameplay 核心
- Mission 01 剧情顺序/秒点
- Wingman Combat Core
- GOLIATH 战斗 AI / Boss HP /死亡状态机
- CI workflow 架构

需要这些改动时，把需求写成 Issue/PR 接线说明给 1/3 线。

---

## 7. 验收标准

至少：

```bash
node tools/check-project.cjs
node tools/check-mission01.cjs
```

若 PNG integrity 工具已进入 main：

```bash
node tools/check-png-integrity.cjs
```

并至少完成一次 Cocos/Web Mobile build。

视觉验收：

- 六段环境能被肉眼区分。
- 仍像同一海岸基地连续飞过。
- BG01 有起飞空间，BG05 有“基地正在被清除”的可读变化，BG06 有明显 Boss 平台/战区语义。
- 中央战斗通道不被高频细节淹没。
- GOLIATH 机体没有烘焙进背景。
- 没有额外的独立关卡计时逻辑。

---

## 8. 完成后怎么交接

PR/Issue 最后写：

- DONE
- BRANCH / PR / COMMIT
- 六段里完成了哪些
- 新增/修改了哪些资源与 `.meta`
- 是否碰了 `.scene/.prefab`
- VALIDATED
- KNOWN RISKS
- NEXT

如果聊天再次到上限，先把最新进度写进本文件或 Issue，再结束。
