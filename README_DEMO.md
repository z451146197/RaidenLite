# RaidenLite · 第一关 Demo

Cocos Creator **3.8.8** / TypeScript / 750 × 1334 竖版射击。直接在原工程内修复，保留项目、场景、脚本及原素材 UUID。

## 打开与操作

1. 在 Cocos Creator 3.8.8 打开本项目。
2. 等待资源导入，双击 `assets/Game.scene`。场景树中应有 Background、Gameplay、GameManager 和 UI。
3. 点击顶部预览。自动开始第一关，自动射击。

- 鼠标按住拖动或单指拖动；也可用 WASD / 方向键。
- 点底部“武器”或按 Q，轮换已解锁的 N / S / L。
- 点“BOMB”或按空格使用炸弹。
- GAME OVER / LEVEL CLEAR 页面点“重新出击”。
- 画面按完整 750 × 1334 等比显示；手机长屏和桌面宽屏余量留边。

## 场景已经落地

```text
Game
└─ Canvas（Camera / 全画面裁剪）
   ├─ Camera
   ├─ Background
   │  ├─ GroundA / GroundB
   │  └─ CloudA / CloudB
   ├─ Gameplay（拖动响应区）
   │  ├─ EnemyLayer
   │  ├─ BossLayer
   │  ├─ ItemLayer
   │  ├─ BulletLayer
   │  ├─ EnemyBulletLayer
   │  └─ Player
   │     ├─ __PlayerArt
   │     └─ HitPointView
   ├─ GameManager
   └─ UI
      ├─ Score / Weapon / Stage
      ├─ WeaponButton / BombButton
      ├─ Warning / BossHP / Announcement
      ├─ BombFlash
      ├─ GameOver
      └─ LevelClear
```

52 个真实节点已序列化。背景、玩家、美术引用、文字、按钮、警告与结算面板均可在编辑器中查看和调整；警告、Boss 血量和结算面板默认 inactive。

GameManager 显式引用玩家、各战斗层、UI、预制体和美术 SpriteFrame；不再由 PlayerController 临时挂到 Canvas。只有敌机波次、子弹、道具、Boss 等战斗对象动态生成。Bullet / Enemy 预制体也带有 Sprite 和行为脚本。

主视觉使用 Sprite，文字使用 Label。Canvas 的矩形 Mask 用于裁剪滚动背景和场外敌机，不承担美术绘制。

## 玩法规则

- 玩家伤害判定是中心 **8px 半径圆**，与飞机显示尺寸分离；拾取范围更大。
- N 初始单发，随共享 Power Lv.1～5 增加到 5 发。
- S 按 Power 发射 3 / 5 / 7 / 9 / 11 方向散射。
- L 自动追踪，提升单体伤害，弹数与伤害随共享 Power 增长。
- P 提升 Power，MAX 后短暂提高射速。
- **S / L 只解锁，绝不自动覆盖当前武器。** 每次切换沿用同一 Power。
- B 增加炸弹库存；使用后清除普通和重型敌弹、范围伤害，并提供 2.2 秒保护与闪烁提示。
- 小型橙色普通弹可被玩家子弹抵消；大型红色 Heavy 弹不能抵消。
- 触摸跟踪单一触点，按钮触摸不移动飞机；退到后台清除输入状态。

## 第一关时间轴

| 时间 | 事件 |
| --- | --- |
| 1～9 秒 | 普通编队、斜线编队 |
| 13 秒 | P 运输机 |
| 17～22 秒 | 可射击编队 |
| 28 秒 | S 运输机 |
| 32～41 秒 | 交叉、正弦、精英敌机 |
| 45 秒 | P 运输机、Heavy 弹教学 |
| 49～53 秒 | V 字与交叉编队 |
| 56 秒 | L 运输机 |
| 60 秒 | 正弦编队 |
| 64 秒 | B 运输机 |
| 67 秒 | 最后一组普通编队 |
| 70 秒 | WARNING、清场 |
| 73 秒 | Boss 入场 |
| Boss 被击毁 | LEVEL CLEAR、分数、重新出击 |

表中时间是运输机出现时间，击毁后掉落道具，拾取时间取决于操作。WARNING 清场会保留未击毁运输机的补给掉落。

## 素材检查

18 张原始 PNG 已逐像素检查尺寸和 alpha 通道。原图未重新生成；新增 `ui_white.png`、`hit_point.png` 两张 16 × 16 的程序化 UI 基础纹理。

| 素材 | 原始尺寸 | 处理 / 检查结果 |
| --- | --- | --- |
| player | 105 × 210 | 约 51.8% 全透明；保持比例；中心点独立 |
| enemy_normal | 112 × 205 | 约 52% 全透明；按比例显示并旋转 180° |
| enemy_fast | 94 × 205 | 约 66.7% 全透明；按比例显示并旋转 180° |
| enemy_elite | 120 × 215 | 约 59.4% 全透明；按比例显示并旋转 180° |
| transport | 115 × 205 | 约 62.8% 全透明；按比例显示并旋转 180° |
| boss | 280 × 260 | 约 47.3% 全透明；旋转 180°、保持比例 |
| P / S / L / B | 80～85 × 105 | 有透明区域；限制在 62 × 70 显示框内等比缩放 |
| 玩家与敌方子弹 | 16～42 × 34～64 | 发光边缘以半透明像素为主，不能按“无全透明像素”判失败 |
| background_level1 | 750 × 1334 | 不透明；双面板交替镜像滚动 |
| cloud_overlay | 750 × 1080 | 半透明；低不透明度独立滚动 |
| warning | 275 × 80 | 有 alpha；当前警告使用清晰的文字面板 |

**已知美术问题：** 若干原始飞机 PNG 的抠图留下暗色半透明底、细边线，部分机身深色区域也被过度透明化。背景细节偏模糊。当前已修正方向和比例，但这些问题需要后续精修源图；本次未将其宣称为最终美术。

## 验证与复现

本机验证日期：2026-09-10。

- Creator **3.8.8 Web Mobile 实际构建成功**。
- 使用 Creator 自带 TypeScript 和真实引擎类型声明执行 `tsc --noEmit -p tsconfig.json`，项目脚本无错误。
- `skipLibCheck` 仅跳过引擎自身 d.ts 的第三方声明缺失检查，不跳过项目 TypeScript。
- `node tools/check-project.cjs`：场景和预制体对象索引、父子关系、资源 UUID、脚本 UUID、管理器引用均通过。
- Playwright + 本机 Edge：750 × 1334、390 × 844 手机模拟、1280 × 800 桌面。
- 实际输入验证：鼠标拖动、键盘移动、武器按钮、Q 切换、Bomb 按钮、死亡重开、手机触摸拖动和触摸切换。
- 引擎内受控测试：共享 Power、仅解锁武器、普通弹抵消 / 重弹保留、机翼擦弹与中心命中、Bomb 伤害 / 清弹 / 保护、激光偏轴追踪。
- 自动化按 1/60 秒推进真实引擎时间轴，测试期间对玩家启用保护并自动追踪补给，收集到 P / S / P / L / B；经过 WARNING 与 Boss，使用射击击毁 Boss 后成功结算并重开。**此项是功能闭环验证，不是无辅助人工通关或难度平衡验收。**
- 浏览器没有游戏脚本异常或缺失游戏资源；测试服务器的默认 favicon 请求 404 与游戏无关。

构建配置：`tools/build-preview.json`。Windows 命令示例：

```powershell
& 'C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe' --project 'G:/RaidenLite' --build 'configPath=G:/RaidenLite/tools/build-preview.json'
node tools/check-project.cjs
node 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/resources/3d/engine/node_modules/typescript/lib/tsc.js' --noEmit -p tsconfig.json
```

Creator 安装位置不同时替换命令中的安装路径。构建产物在 `build/web-mobile`，应通过 HTTP 服务器访问，不能直接以 file 协议打开。命令参数依据 [Cocos Creator 3.8 命令行发布文档](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-in-command-line.html)。

尚未验证：微信开发者工具及微信真机、不同手机性能、无辅助玩家通关难度。没有新增微信 AppID、发布或上传游戏。
