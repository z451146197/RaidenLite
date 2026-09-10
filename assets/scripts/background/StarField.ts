import { _decorator, Color, Component, Graphics, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';
import {
    DEFAULT_MISSION01_ENVIRONMENT_STATE,
    MISSION01_ENVIRONMENT_STAGES,
    Mission01EnvironmentPresentationState,
    normalizeMission01EnvironmentState,
} from './Mission01EnvironmentState';

const { ccclass } = _decorator;

const VIEW_WIDTH = 750;
const PANEL_HEIGHT = 1334;
const GROUND_SCROLL_SPEED = 34;
const CLOUD_SCROLL_SPEED = 57;
const PROCEDURAL_PANEL_COUNT = MISSION01_ENVIRONMENT_STAGES.length;
const GOLIATH_BASE_Y = 110;

/**
 * Mission 01 连续程序化背景。
 *
 * 六段固定空间顺序：
 * BG01 起飞基地 / 跑道与机库
 * BG02 海岸撤离走廊
 * BG03 港区防御带
 * BG04 撤离后勤区
 * BG05 基地崩溃 / 被己方防御系统清除
 * BG06 GOLIATH 战区 / 平台区
 *
 * 2 线负责空间与视觉表现，不维护 Mission 剧情秒表。滚动倍率、基地清除强度、
 * GOLIATH 准备进度等都由 Director / Sequence 的单一时间源转换后显式传入。
 */
@ccclass('StarField')
export class StarField extends Component {
    private ground: Node[] = [];
    private clouds: Node[] = [];

    private speedScale = 1;
    private speedFrom = 1;
    private speedTarget = 1;
    private speedTransitionElapsed = 0;
    private speedTransitionDuration = 0;

    // 只用于灯光 / 推进器 / 震颤的连续视觉相位，不参与任何 Mission cue 判定。
    private visualPhase = 0;
    private presentationState: Mission01EnvironmentPresentationState = {
        ...DEFAULT_MISSION01_ENVIRONMENT_STATE,
    };

    private goliathGroundNode: Node | null = null;
    private goliathArtNode: Node | null = null;
    private goliathShadowNode: Node | null = null;
    private goliathShadowOpacity: UIOpacity | null = null;
    private goliathThrusterOpacity: UIOpacity | null = null;

    start() {
        this.buildAirbase();
        this.clouds = this.node.children.filter((n) => n.name.startsWith('Cloud'));
        this.updateGoliathPresentation();
    }

    /** Mission Timeline 只控制倍率，不直接操作每个背景节点。 */
    public setScrollSpeedScale(scale: number, transitionSeconds = 0) {
        const next = Math.max(0, Math.min(3, scale));
        if (transitionSeconds <= 0) {
            this.speedScale = next;
            this.speedFrom = next;
            this.speedTarget = next;
            this.speedTransitionElapsed = 0;
            this.speedTransitionDuration = 0;
            return;
        }
        this.speedFrom = this.speedScale;
        this.speedTarget = next;
        this.speedTransitionElapsed = 0;
        this.speedTransitionDuration = Math.max(0.05, transitionSeconds);
    }

    public getScrollSpeedScale(): number {
        return this.speedScale;
    }

    /**
     * Director / Sequence 的适配层可以只传本次改变的字段。
     * StarField 保存的是表现状态，不累计 Mission 时间，也不根据秒数自行切剧情。
     */
    public setEnvironmentPresentationState(
        next: Partial<Mission01EnvironmentPresentationState>,
    ) {
        const previousPurge = this.presentationState.purgeIntensity;
        this.presentationState = normalizeMission01EnvironmentState({
            ...this.presentationState,
            ...next,
        });
        this.updateGoliathPresentation();

        if (Math.abs(previousPurge - this.presentationState.purgeIntensity) >= 0.01) {
            this.redrawBasePurgePanel();
        }
    }

    public getEnvironmentPresentationState(): Readonly<Mission01EnvironmentPresentationState> {
        return this.presentationState;
    }

    public getGroundPanels(): readonly Node[] {
        return this.ground;
    }

    public getGoliathGroundNode(): Node | null {
        return this.goliathGroundNode;
    }

    /**
     * Boss 生成时把同一个 __BossArt Sprite 节点从 GroundF 迁移到 Boss 节点。
     * 逻辑碰撞宿主可以切换，但玩家看到的机体 Sprite 没有换图/换节点。
     */
    public handoffGoliathVisualTo(target: Node): boolean {
        const source = this.goliathGroundNode;
        const art = this.goliathArtNode ?? source?.getChildByName('__BossArt') ?? null;
        if (!source || !art) return false;

        const world = source.worldPosition.clone();
        target.setWorldPosition(world);

        art.removeFromParent();
        target.addChild(art);
        art.setPosition(0, 0, 0);
        art.angle = 180;

        this.goliathShadowNode?.destroy();
        source.destroy();
        this.goliathGroundNode = null;
        this.goliathArtNode = null;
        this.goliathShadowNode = null;
        this.goliathShadowOpacity = null;
        this.goliathThrusterOpacity = null;
        return true;
    }

    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.visualPhase += dt;
        this.updateSpeedTransition(dt);
        this.updateGoliathPresentation();

        // 云层保留最低漂移速度；地面倍率直接体现滑跑、巡航与 Boss 前减速。
        const cloudScale = 0.65 + this.speedScale * 0.35;
        this.scroll(this.ground, PANEL_HEIGHT, GROUND_SCROLL_SPEED * this.speedScale * dt);
        this.scroll(this.clouds, 1080, CLOUD_SCROLL_SPEED * cloudScale * dt);
    }

    private updateSpeedTransition(dt: number) {
        if (this.speedTransitionDuration <= 0) return;
        this.speedTransitionElapsed = Math.min(
            this.speedTransitionDuration,
            this.speedTransitionElapsed + dt,
        );
        const t = this.speedTransitionElapsed / this.speedTransitionDuration;
        const eased = t * t * (3 - 2 * t);
        this.speedScale = this.speedFrom + (this.speedTarget - this.speedFrom) * eased;
        if (this.speedTransitionElapsed >= this.speedTransitionDuration) {
            this.speedScale = this.speedTarget;
            this.speedTransitionDuration = 0;
        }
    }

    private updateGoliathPresentation() {
        if (!this.goliathGroundNode) return;

        const raw = this.presentationState.goliathPrepareProgress;
        const t = raw * raw * (3 - 2 * raw);

        if (raw <= 0) {
            this.goliathGroundNode.setPosition(0, GOLIATH_BASE_Y, 0);
            this.goliathArtNode?.setScale(0.90, 0.90, 1);
            this.goliathShadowNode?.setScale(1, 1, 1);
            if (this.goliathShadowOpacity) this.goliathShadowOpacity.opacity = 118;
            if (this.goliathThrusterOpacity) this.goliathThrusterOpacity.opacity = 0;
            return;
        }

        const rumble = Math.min(1, raw * 5);
        const jitterX = Math.sin(this.visualPhase * 42) * 2.2 * rumble * (1 - t * 0.55);
        const lift = 118 * t;

        this.goliathGroundNode.setPosition(jitterX, GOLIATH_BASE_Y + lift, 0);
        this.goliathArtNode?.setScale(0.90 + t * 0.12, 0.90 + t * 0.12, 1);

        if (this.goliathShadowNode) {
            this.goliathShadowNode.setScale(1 - t * 0.58, 1 - t * 0.58, 1);
        }
        if (this.goliathShadowOpacity) {
            this.goliathShadowOpacity.opacity = Math.round(118 * (1 - t * 0.82));
        }
        if (this.goliathThrusterOpacity) {
            const pulse = 0.82 + Math.sin(this.visualPhase * 23) * 0.18;
            this.goliathThrusterOpacity.opacity = Math.round((55 + t * 190) * pulse);
        }
    }

    private buildAirbase() {
        const existingGround = this.node.children
            .filter((n) => n.name.startsWith('Ground'))
            .sort((a, b) => a.name.localeCompare(b.name));

        while (existingGround.length < PROCEDURAL_PANEL_COUNT) {
            const definition = MISSION01_ENVIRONMENT_STAGES[existingGround.length];
            const panel = new Node(definition.panelName);
            panel.layer = this.node.layer;
            this.node.addChild(panel);
            panel.addComponent(UITransform).setContentSize(VIEW_WIDTH, PANEL_HEIGHT);
            existingGround.push(panel);
        }

        this.ground = existingGround.slice(0, PROCEDURAL_PANEL_COUNT);

        for (let i = 0; i < this.ground.length; i += 1) {
            const panel = this.ground[i];
            panel.name = MISSION01_ENVIRONMENT_STAGES[i].panelName;
            panel.setPosition(0, i * PANEL_HEIGHT, 0);

            const transform = panel.getComponent(UITransform) ?? panel.addComponent(UITransform);
            transform.setContentSize(VIEW_WIDTH, PANEL_HEIGHT);

            const oldSprite = panel.getComponent(Sprite);
            if (oldSprite) oldSprite.enabled = false;

            const graphics = panel.getComponent(Graphics) ?? panel.addComponent(Graphics);
            graphics.clear();
            this.drawPanel(graphics, i, panel);
        }
    }

    private drawPanel(g: Graphics, index: number, panel: Node) {
        switch (index) {
            case 0:
                this.drawLaunchApron(g);
                break;
            case 1:
                this.drawCoastalExit(g);
                break;
            case 2:
                this.drawHarborDefense(g);
                break;
            case 3:
                this.drawLogisticsZone(g);
                break;
            case 4:
                this.drawBasePurgeZone(g, this.presentationState.purgeIntensity);
                break;
            default:
                this.drawGoliathZone(g);
                this.buildGroundedGoliath(panel);
                break;
        }
    }

    // ---------- BG01：起飞基地 / 跑道与机库 ----------

    private drawLaunchApron(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(23, 38, 45));
        this.fillRect(g, -345, -667, 690, 1334, this.color(48, 61, 65));
        this.drawConcreteGrid(g, -345, -667, 690, 1334, 118, 96);

        this.fillRect(g, -205, -667, 410, 505, this.color(39, 49, 53));
        this.fillRect(g, -164, -162, 328, 829, this.color(31, 40, 44));
        this.fillRect(g, -176, -162, 12, 829, this.color(65, 75, 76));
        this.fillRect(g, 164, -162, 12, 829, this.color(65, 75, 76));

        this.strokeRect(g, -154, -585, 308, 275, 4, this.color(128, 139, 132, 150));
        this.drawChevron(g, 0, -350, 72, this.color(181, 168, 100, 170));
        this.drawChevron(g, 0, -250, 58, this.color(181, 168, 100, 145));
        this.drawRunwayMarks(g, -115, 660, 105);
        this.drawRunwayLights(g, -164, 164, -120, 650, 92);

        // 对称机库 / 维护区沿边缘布置，参考海岸空军基地的秩序感，中央跑道不塞高频细节。
        this.drawHangar(g, -303, -500, 128, 192);
        this.drawHangar(g, 175, -490, 128, 188);
        this.drawHangar(g, -303, -205, 126, 170);
        this.drawHangar(g, 177, -205, 126, 170);
        this.drawServiceBay(g, -306, 94, 122, 250, true);
        this.drawServiceBay(g, 184, 115, 122, 238, false);
        this.drawTankCluster(g, -293, 465, 2);
        this.drawTankCluster(g, 244, 478, 2);
        this.drawPerimeter(g, -348, 348, -650, 650);
    }

    // ---------- BG02：海岸撤离走廊 ----------

    private drawCoastalExit(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(22, 39, 44));
        this.fillRect(g, -345, -667, 690, 790, this.color(50, 64, 65));
        this.drawConcreteGrid(g, -345, -667, 690, 790, 132, 108);
        this.drawWater(g, 123, 544);

        // 跑道逐步退出，留下清晰的沿海飞行走廊。
        this.fillRect(g, -166, -667, 332, 720, this.color(30, 39, 42));
        this.fillRect(g, -178, -667, 12, 720, this.color(66, 76, 77));
        this.fillRect(g, 166, -667, 12, 720, this.color(66, 76, 77));
        this.drawRunwayMarks(g, -650, 20, 112);
        this.drawRunwayLights(g, -166, 166, -650, 30, 90);
        for (let x = -145; x <= 105; x += 50) {
            this.fillRect(g, x, 18, 28, 74, this.color(156, 164, 153, 150));
        }

        this.fillRect(g, -345, 62, 128, 92, this.color(57, 73, 73));
        this.fillRect(g, 217, 62, 128, 92, this.color(57, 73, 73));
        this.drawBeacon(g, -281, 108);
        this.drawBeacon(g, 281, 108);
        this.drawServiceBay(g, -318, -390, 128, 210, true);
        this.drawTankCluster(g, 247, -365, 2);
        this.drawPerimeter(g, -348, 348, -650, 90);
    }

    // ---------- BG03：港区防御带 ----------

    private drawHarborDefense(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(18, 49, 60));
        this.drawWaterTexture(g, -650, 650);

        // 左右防波堤，中间留下宽阔纵向战斗水道。
        this.fillRect(g, -360, -667, 145, 1334, this.color(48, 63, 65));
        this.fillRect(g, 215, -667, 145, 1334, this.color(48, 63, 65));
        this.drawConcreteGrid(g, -360, -667, 145, 1334, 112, 96);
        this.drawConcreteGrid(g, 215, -667, 145, 1334, 112, 96);

        for (const y of [-500, -145, 225, 520]) {
            this.drawDefensePad(g, -286, y);
            this.drawDefensePad(g, 286, y + 45);
        }

        // 两组短码头伸向中央，但不封死弹幕视线。
        this.fillRect(g, -215, -330, 92, 64, this.color(57, 72, 73));
        this.fillRect(g, 123, 80, 92, 64, this.color(57, 72, 73));
        this.drawBeacon(g, -205, 585);
        this.drawBeacon(g, 205, -560);
    }

    // ---------- BG04：撤离后勤区 ----------

    private drawLogisticsZone(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(19, 49, 58));
        this.drawWaterTexture(g, -650, 650);

        // 中央后勤岛与沿海车道；中间仍然保持低细节战斗通道。
        this.fillRect(g, -310, -667, 620, 1334, this.color(49, 61, 62));
        this.drawConcreteGrid(g, -310, -667, 620, 1334, 124, 108);
        this.fillRect(g, -128, -667, 256, 1334, this.color(38, 48, 50));
        this.strokeLine(g, -140, -650, -140, 650, 3, this.color(159, 143, 75, 100));
        this.strokeLine(g, 140, -650, 140, 650, 3, this.color(159, 143, 75, 100));

        this.drawServiceBay(g, -286, -520, 122, 230, false);
        this.drawHangar(g, 168, -505, 118, 195);
        this.drawTankCluster(g, -247, -110, 2);
        this.drawServiceBay(g, 168, -90, 118, 235, true);
        this.drawHangar(g, -286, 315, 120, 180);
        this.drawServiceBay(g, 170, 330, 116, 205, false);
    }

    // ---------- BG05：基地崩溃 / 己方防御清除 ----------

    private drawBasePurgeZone(g: Graphics, purgeIntensity: number) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(24, 40, 44));
        this.fillRect(g, -345, -667, 690, 1334, this.color(49, 61, 62));
        this.drawConcreteGrid(g, -345, -667, 690, 1334, 138, 112);

        // 保留一条熟悉的基地道路/跑道轴线，确保视觉上仍是 BG01 的同一座基地。
        this.fillRect(g, -150, -667, 300, 1334, this.color(32, 42, 45));
        this.strokeLine(g, -162, -650, -162, 650, 3, this.color(72, 80, 78, 105));
        this.strokeLine(g, 162, -650, 162, 650, 3, this.color(72, 80, 78, 105));
        this.drawRunwayMarks(g, -650, 650, 132);

        this.drawHangar(g, -318, -520, 132, 215);
        this.drawServiceBay(g, 188, -530, 130, 225, true);
        this.drawDefensePad(g, -272, -120);
        this.drawDefensePad(g, 272, -90);
        this.drawServiceBay(g, -318, 265, 130, 230, false);
        this.drawHangar(g, 188, 285, 130, 205);
        this.drawTankCluster(g, -280, 545, 2);

        // 破坏只发生在边缘设施，中央弹幕区始终保持清晰。
        if (purgeIntensity >= 0.15) {
            this.drawBlastScar(g, -250, -370, 32);
            this.drawBlastScar(g, 252, 355, 28);
        }
        if (purgeIntensity >= 0.40) {
            this.drawBlastScar(g, 286, -140, 44);
            this.drawDamageGlow(g, -282, 300, 34, purgeIntensity);
        }
        if (purgeIntensity >= 0.65) {
            this.drawBlastScar(g, -270, 70, 48);
            this.drawDamageGlow(g, 265, -470, 38, purgeIntensity);
        }
        if (purgeIntensity >= 0.85) {
            this.drawBlastScar(g, 250, 535, 36);
            this.drawDamageGlow(g, -245, -520, 44, purgeIntensity);
        }
    }

    private redrawBasePurgePanel() {
        const panel = this.ground[4];
        if (!panel) return;
        const graphics = panel.getComponent(Graphics);
        if (!graphics) return;
        graphics.clear();
        this.drawBasePurgeZone(graphics, this.presentationState.purgeIntensity);
    }

    // ---------- BG06：GOLIATH 战区 / 平台区 ----------

    private drawGoliathZone(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(17, 45, 55));
        this.drawWaterTexture(g, -650, 650);

        // 巨型升降平台，GOLIATH 本体是独立 Sprite，不烘焙进 Graphics。
        this.fillRect(g, -325, -667, 650, 1334, this.color(44, 55, 57));
        this.drawConcreteGrid(g, -325, -667, 650, 1334, 130, 116);
        this.fillRect(g, -185, -190, 370, 600, this.color(32, 42, 45));
        this.strokeRect(g, -202, -210, 404, 640, 5, this.color(116, 126, 119, 125));
        this.strokeRect(g, -157, -75, 314, 385, 3, this.color(177, 153, 75, 130));
        this.drawChevron(g, 0, -120, 68, this.color(181, 156, 76, 130));
        this.drawChevron(g, 0, 355, 52, this.color(181, 156, 76, 95));

        // 两侧已经遭到攻击的维护区，中央 Boss 舞台保持干净。
        this.drawServiceBay(g, -300, -515, 96, 205, true);
        this.drawServiceBay(g, 204, -505, 96, 205, false);
        this.drawHangar(g, -300, 360, 100, 175);
        this.drawHangar(g, 200, 365, 100, 170);
        this.drawBlastScar(g, -255, -210, 36);
        this.drawBlastScar(g, 254, 260, 43);
    }

    private buildGroundedGoliath(panel: Node) {
        panel.getChildByName('__GoliathGround')?.destroy();
        panel.getChildByName('__GoliathShadow')?.destroy();

        const shadow = new Node('__GoliathShadow');
        shadow.layer = panel.layer;
        panel.addChild(shadow);
        shadow.setPosition(0, GOLIATH_BASE_Y - 34, 0);
        shadow.addComponent(UITransform).setContentSize(250, 150);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = this.color(3, 8, 11, 118);
        sg.ellipse(0, 0, 108, 58);
        sg.fill();
        this.goliathShadowOpacity = shadow.addComponent(UIOpacity);
        this.goliathShadowNode = shadow;

        const host = new Node('__GoliathGround');
        host.layer = panel.layer;
        panel.addChild(host);
        host.setPosition(0, GOLIATH_BASE_Y, 0);
        host.addComponent(UITransform).setContentSize(285, 250);
        this.goliathGroundNode = host;

        const art = applyArtSprite(host, 'art/boss', 285, 250, '__BossArt', 255);
        art.angle = 180;
        art.setScale(0.90, 0.90, 1);
        this.goliathArtNode = art;

        const thruster = new Node('__GoliathThruster');
        thruster.layer = panel.layer;
        host.addChild(thruster);
        thruster.setPosition(0, 103, 0);
        thruster.addComponent(UITransform).setContentSize(130, 58);
        const tg = thruster.addComponent(Graphics);
        tg.fillColor = this.color(255, 147, 74, 230);
        tg.circle(-42, 0, 13);
        tg.circle(42, 0, 13);
        tg.fill();
        this.goliathThrusterOpacity = thruster.addComponent(UIOpacity);
        this.goliathThrusterOpacity.opacity = 0;
    }

    // ---------- 可复用背景模块 ----------

    private drawWater(g: Graphics, y: number, height: number) {
        this.fillRect(g, -375, y, 750, height, this.color(20, 54, 65));
        this.fillRect(g, -375, y + 13, 750, 12, this.color(66, 82, 80));
        this.drawWaterTexture(g, y + 55, y + height - 20);
    }

    private drawWaterTexture(g: Graphics, minY: number, maxY: number) {
        for (let y = minY; y < maxY; y += 72) {
            const offset = (Math.floor(y / 72) & 1) * 48;
            for (let x = -350 + offset; x < 350; x += 150) {
                this.strokeLine(g, x, y, x + 72, y + 9, 2, this.color(72, 113, 122, 70));
            }
        }
    }

    private drawDefensePad(g: Graphics, x: number, y: number) {
        this.fillRect(g, x - 54, y - 54, 108, 108, this.color(61, 74, 74));
        this.strokeRect(g, x - 45, y - 45, 90, 90, 2, this.color(126, 132, 117, 95));
        g.fillColor = this.color(38, 50, 53);
        g.circle(x, y, 25);
        g.fill();
        g.fillColor = this.color(129, 74, 61, 150);
        g.circle(x, y, 7);
        g.fill();
    }

    private drawBlastScar(g: Graphics, x: number, y: number, radius: number) {
        g.fillColor = this.color(22, 28, 29, 160);
        g.circle(x, y, radius);
        g.fill();
        g.strokeColor = this.color(100, 67, 49, 90);
        g.lineWidth = 3;
        g.circle(x, y, radius + 7);
        g.stroke();
    }

    private drawDamageGlow(g: Graphics, x: number, y: number, radius: number, intensity: number) {
        const alpha = Math.round(55 + Math.max(0, Math.min(1, intensity)) * 80);
        g.fillColor = this.color(150, 65, 38, alpha);
        g.circle(x, y, radius);
        g.fill();
        g.fillColor = this.color(235, 118, 52, Math.round(alpha * 0.65));
        g.circle(x, y, radius * 0.42);
        g.fill();
    }

    private drawConcreteGrid(g: Graphics, x: number, y: number, width: number, height: number, cellW: number, cellH: number) {
        const c = this.color(87, 99, 97, 42);
        for (let gx = x + cellW; gx < x + width; gx += cellW) {
            this.strokeLine(g, gx, y, gx, y + height, 1, c);
        }
        for (let gy = y + cellH; gy < y + height; gy += cellH) {
            this.strokeLine(g, x, gy, x + width, gy, 1, c);
        }
    }

    private drawRunwayMarks(g: Graphics, minY: number, maxY: number, step: number) {
        const mark = this.color(174, 181, 170, 125);
        for (let y = minY; y < maxY; y += step) {
            this.fillRect(g, -4, y, 8, 48, mark);
        }
    }

    private drawRunwayLights(g: Graphics, leftX: number, rightX: number, minY: number, maxY: number, step: number) {
        for (let y = minY; y <= maxY; y += step) {
            this.fillRect(g, leftX - 3, y, 6, 10, this.color(190, 170, 93, 145));
            this.fillRect(g, rightX - 3, y, 6, 10, this.color(190, 170, 93, 145));
        }
    }

    private drawTaxiCrossing(g: Graphics, y: number) {
        this.fillRect(g, -345, y - 54, 690, 108, this.color(43, 54, 56));
        this.strokeLine(g, -345, y, -180, y, 3, this.color(176, 160, 83, 130));
        this.strokeLine(g, 180, y, 345, y, 3, this.color(176, 160, 83, 130));
    }

    private drawHangar(g: Graphics, x: number, y: number, width: number, height: number) {
        this.fillRect(g, x + 8, y - 9, width, height, this.color(11, 22, 25, 90));
        this.fillRect(g, x, y, width, height, this.color(66, 78, 78));
        this.fillRect(g, x + 10, y + 14, width - 20, height - 28, this.color(58, 70, 71));
        this.fillRect(g, x + 18, y + height - 32, width - 36, 9, this.color(100, 110, 105, 85));
        this.fillRect(g, x + 18, y + 18, width - 36, 8, this.color(25, 39, 42, 150));
    }

    private drawServiceBay(g: Graphics, x: number, y: number, width: number, height: number, mirror: boolean) {
        this.fillRect(g, x, y, width, height, this.color(55, 69, 69));
        this.strokeRect(g, x + 7, y + 7, width - 14, height - 14, 2, this.color(131, 135, 113, 85));

        const stripe = this.color(173, 151, 72, 95);
        const startX = mirror ? x + width - 22 : x + 12;
        for (let i = 0; i < 4; i += 1) {
            const sx = mirror ? startX - i * 20 : startX + i * 20;
            this.fillRect(g, sx, y + 18, 8, height - 36, stripe);
        }

        this.fillRect(g, x + 18, y + height * 0.60, width - 36, 24, this.color(35, 49, 51));
        this.fillRect(g, x + 18, y + height * 0.30, width - 36, 18, this.color(35, 49, 51));
    }

    private drawTankCluster(g: Graphics, centerX: number, centerY: number, count: number) {
        const radius = 24;
        for (let i = 0; i < count; i += 1) {
            const y = centerY + i * 64;
            g.fillColor = this.color(84, 96, 94);
            g.circle(centerX, y, radius);
            g.fill();
            g.strokeColor = this.color(125, 134, 126, 115);
            g.lineWidth = 2;
            g.circle(centerX, y, radius - 6);
            g.stroke();
        }
    }

    private drawPerimeter(g: Graphics, leftX: number, rightX: number, minY: number, maxY: number) {
        this.strokeLine(g, leftX, minY, leftX, maxY, 3, this.color(89, 105, 102, 120));
        this.strokeLine(g, rightX, minY, rightX, maxY, 3, this.color(89, 105, 102, 120));
        for (let y = minY + 18; y < maxY; y += 84) {
            this.fillRect(g, leftX - 3, y, 6, 9, this.color(153, 70, 56, 120));
            this.fillRect(g, rightX - 3, y, 6, 9, this.color(153, 70, 56, 120));
        }
    }

    private drawChevron(g: Graphics, centerX: number, centerY: number, size: number, color: Color) {
        this.strokeLine(g, centerX - size, centerY - size * 0.28, centerX, centerY + size * 0.32, 6, color);
        this.strokeLine(g, centerX, centerY + size * 0.32, centerX + size, centerY - size * 0.28, 6, color);
    }

    private drawBeacon(g: Graphics, x: number, y: number) {
        g.fillColor = this.color(64, 77, 76);
        g.circle(x, y, 22);
        g.fill();
        g.fillColor = this.color(179, 76, 57, 155);
        g.circle(x, y, 6);
        g.fill();
    }

    private fillRect(g: Graphics, x: number, y: number, width: number, height: number, color: Color) {
        g.fillColor = color;
        g.rect(x, y, width, height);
        g.fill();
    }

    private strokeRect(g: Graphics, x: number, y: number, width: number, height: number, lineWidth: number, color: Color) {
        g.strokeColor = color;
        g.lineWidth = lineWidth;
        g.rect(x, y, width, height);
        g.stroke();
    }

    private strokeLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: Color) {
        g.strokeColor = color;
        g.lineWidth = lineWidth;
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
    }

    private color(r: number, g: number, b: number, a = 255) {
        return new Color(r, g, b, a);
    }

    private scroll(panels: Node[], height: number, distance: number) {
        if (panels.length === 0) return;
        for (const panel of panels) {
            let y = panel.position.y - distance;
            if (y <= -667 - height / 2) y += height * panels.length;
            panel.setPosition(0, y, 0);
        }
    }
}
