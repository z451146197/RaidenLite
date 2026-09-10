# Mission 01 Wave Table

> 用途：把 `MISSION01_SCRIPT.md` 拆成可直接给关卡与程序执行的波次 / 事件表。
>
> 原则：**事件顺序锁定，秒数与数量可试玩调整。** 本表中的时间是 v1 建议值，不应为了机械对齐秒数破坏节奏。

| 时间 | ID | 敌人 / 事件 | 数量 / 状态 | 行为 | 主要目的 |
|---|---|---|---|---|---|
| 00:00 | EVT_OPENING | 基地警报 / 黑场淡入 | — | UI 隐藏；海岸基地、跑道、三机与远处 GOLIATH 入画 | 建立紧急状态与场景 |
| 00:06 | EVT_LINEUP | AURORA / VIPER / FALCON | 3 | 三机进入跑道编队 | 建立三机关系 |
| 00:14 | EVT_TAKEOFF | 三机起飞 | 3 | 跑道加速、尾焰增强、阴影分离、轻震 | 起飞演出 |
| 00:24 | EVT_PLAYER_CONTROL | 玩家接管 | — | HUD 淡入，AURORA 开始自动射击，开放拖动 | 正式进入玩法 |
| 00:30 | W01 | 基础无人机 | 4–6 | 慢速、1 HP、不射击、宽幅进入 | 让玩家先爽；僚机真实参战 |
| 00:40 | W02 | AEGIS 无人截击机 | 约 5 | V 字编队进入 | 敌我识别反转 |
| 00:52 | W03_NORMAL | 截击机 | 低数量 | 发射少量橙黄色 NORMAL，刻意穿过玩家正面火力 | 教学 NORMAL 可抵消 |
| 01:04 | EVT_POWER_UP | POWER UP | — | 自动能量累计完成；AURORA 火力明显增强 | 教学局内成长 |
| 01:05 | W03B_POWER_SHOWCASE | 脆弱敌机群 | 一小波 | 密集但低血量 | 立即证明 POWER 变强 |
| 01:15 | W04_HEAVY_INTRO | 精英截击机 | 1 | 先发 NORMAL，再发首枚红色 HEAVY | 教学 HEAVY 不可抵消 |
| 01:27 | W05_DODGE | 截击机 + 精英火力 | 小规模 | NORMAL 形成可打穿弹墙，中间穿 1–2 枚 HEAVY | 第一次真正走位 |
| 01:38 | EVT_FALCON_LOCK | 高速无人机 + 精英 | 2 高速 + 1 精英 | 从不同方向进入后集中锁定 FALCON | 展示 AEGIS 协同作战 |
| 01:48 | EVT_FALCON_DAMAGED | FALCON 受损 | — | 右翼小爆炸、冒烟、减速、轻微失控 | 剧情升级；不中断玩家战斗 |
| 01:57 | EVT_FALCON_KILL | HEAVY 追击 | 1 关键弹 | FALCON 下滑，HEAVY 可视追击并命中 | FALCON 阵亡 |
| 02:03 | W06_RELIEF | 少量残敌 | 少量 | 战斗压力降低，AURORA + VIPER 清场 | 情绪缓冲 |
| 02:03 | EVT_BASE_PURGE | 基地遭清除 | — | 烟柱、火灾、防空设施互击、机库爆炸 | 第二个剧情落点 |
| 02:13 | EVT_BOSS_CLEAR | 停止普通敌人生成 | — | 屏幕逐渐清净 | 制造 Boss 前空白 |
| 02:13 | EVT_GOLIATH_START | GOLIATH 地面状态 | 1 | 基地平台 / 机库开启，Boss 从背景启动 | 回收开场伏笔 |
| 02:21 | EVT_WARNING | WARNING | — | 压暗画面、低频警报、巨大阴影先入场 | Boss 登场预告 |
| 02:26 | EVT_VIPER_HIT | VIPER 受损 | — | GOLIATH 远程火力扫中；VIPER 冒烟 | 逼迫撤退 |
| 02:26+ | EVT_VIPER_EXIT | VIPER 撤退 | — | 向左下实际飞出屏幕，不瞬间隐藏 | 明确其存活 |
| 02:26+ | BOSS_P1 | GOLIATH Phase 1 | 100%→65% | 缓慢横移，大量 NORMAL，偶尔小无人机 | 让玩家靠火力正面开路 |
| P2 | BOSS_P2 | GOLIATH Phase 2 | 65%→30% | NORMAL 封路 + 2–3 枚 HEAVY，移动略加快 | 综合 NORMAL / HEAVY 规则 |
| P3 | BOSS_P3 | GOLIATH Phase 3 | 30%→0 | 受损烟火，更强火力；未用 Bomb 时强化 UI 提示 | Bomb 教学与终局压力 |
| HP=0 | EVT_GOLIATH_DEATH | Boss 死亡序列 | 约 2.2 秒 | 左翼→右翼武器区→尾部→内部闪光→中央大爆炸 | 第一关最终爽点 |
| END | EVT_ORBIT_TRACE | 信号追踪 | — | LOCAL / REGIONAL 无信号，ORBIT ACTIVE | 抛出第二关 / 后续悬念 |
| END | EVT_COMPLETE | MISSION COMPLETE | — | 切黑，进入首次 Hangar | 结束 Mission 01 |

## 剧情控制事件规则

`EVT_FALCON_LOCK → EVT_FALCON_KILL` 不能被玩家高火力提前破坏。围攻 FALCON 的关键单位需要采用剧情保护、替代生成或等价机制，确保 FALCON 必定按照脚本经历“被锁定 → 受损 → HEAVY 追击 → 阵亡”。

VIPER 的撤退同样是可视事件：中弹、冒烟、飞离屏幕。禁止只播放无线电后直接隐藏节点。

## Boss 阶段推进

Boss 以 HP 阈值推进为主：`100%→65%→30%→0`。每阶段可设置最低停留时间，防止玩家火力过高导致演出和台词被瞬间跳过。具体最低秒数属于试玩参数，不在本表锁死。

## 调参允许范围

允许调整：W01–W06 敌人具体数量、单波进入间隔、弹速、POWER 的精确充能量、Boss HP、Boss 阶段时长。必须保留：NORMAL 在 HEAVY 前出现、FALCON 事件完整发生、VIPER 在 Boss 前撤退、GOLIATH 死亡后才进入 ORBIT 信号追踪。
