import { _decorator, Color, Component, Graphics, Node, Sprite, UITransform } from 'cc';
import { Mission01GoliathSequence } from '../Mission01GoliathSequence';

const { ccclass } = _decorator;

const VIEW_WIDTH = 750;
const PANEL_HEIGHT = 1334;
const GROUND_SCROLL_SPEED = 34;
const CLOUD_SCROLL_SPEED = 57;
const PROCEDURAL_PANEL_COUNT = 6;

/**
 * Mission 01 连续背景控制器。
 *
 * 职责只保留三件事：六段空间结构、背景滚动、滚动速度过渡。
 * GOLIATH 的剧情时钟和升空动画已经移到 Mission01GoliathSequence；正式环境素材落库后，
 * 只替换 GroundA-F 的视觉实现，不需要碰关卡事件或 Boss Sequence。
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
    private goliathSequence: Mission01GoliathSequence | null = null;

    start() {
        this.buildAirbase();
        this.clouds = this.node.children.filter((n) => n.name.startsWith('Cloud'));
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

    public getGroundPanels(): readonly Node[] {
        return this.ground;
    }

    public getGoliathGroundNode(): Node | null {
        return this.goliathSequence?.node ?? null;
    }

    /** Boss 逻辑宿主变化，但玩家看到的是 GroundF 上同一个 __BossArt Sprite。 */
    public handoffGoliathVisualTo(target: Node): boolean {
        const handedOff = this.goliathSequence?.handoffVisualTo(target) ?? false;
        if (handedOff) this.goliathSequence = null;
        return handedOff;
    }

    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.updateSpeedTransition(dt);

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

    private buildAirbase() {
        const existingGround = this.node.children
            .filter((n) => n.name.startsWith('Ground'))
            .sort((a, b) => a.name.localeCompare(b.name));

        while (existingGround.length < PROCEDURAL_PANEL_COUNT) {
            const suffix = String.fromCharCode(65 + existingGround.length);
            const panel = new Node(`Ground${suffix}`);
            panel.layer = this.node.layer;
            this.node.addChild(panel);
            panel.addComponent(UITransform).setContentSize(VIEW_WIDTH, PANEL_HEIGHT);
            existingGround.push(panel);
        }

        this.ground = existingGround.slice(0, PROCEDURAL_PANEL_COUNT);

        for (let i = 0; i < this.ground.length; i += 1) {
            const panel = this.ground[i];
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
                this.drawMainRunway(g);
                break;
            case 2:
                this.drawCoastalExit(g);
                break;
            case 3:
                this.drawHarborDefense(g);
                break;
            case 4:
                this.drawLogisticsZone(g);
                break;
            default:
                this.drawGoliathZone(g);
                this.buildGroundedGoliath(panel);
                break;
        }
    }

    // ---------- 0：起飞坪 ----------

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

    // ---------- 1：主跑道 ----------

    private drawMainRunway(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(25, 42, 47));
        this.fillRect(g, -345, -667, 690, 1334, this.color(53, 66, 67));
        this.drawConcreteGrid(g, -345, -667, 690, 1334, 138, 112);

        this.fillRect(g, -166, -667, 332, 1334, this.color(30, 39, 42));
        this.fillRect(g, -178, -667, 12, 1334, this.color(66, 76, 77));
        this.fillRect(g, 166, -667, 12, 1334, this.color(66, 76, 77));
        this.drawRunwayMarks(g, -650, 660, 116);
        this.drawRunwayLights(g, -166, 166, -650, 650, 92);
        this.drawTaxiCrossing(g, -315);
        this.drawTaxiCrossing(g, 330);

        this.drawServiceBay(g, -321, -555, 132, 250, false);
        this.drawServiceBay(g, 189, -555, 132, 250, true);
        this.drawHangar(g, -321, -130, 132, 205);
        this.drawHangar(g, 189, -130, 132, 205);
        this.drawTankCluster(g, -286, 410, 3);
        this.drawServiceBay(g, 195, 405, 118, 205, false);
        this.drawPerimeter(g, -348, 348, -650, 650);
    }

    // ---------- 2：基地边界 -> 海岸 ----------

    private drawCoastalExit(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(22, 39, 44));
        this.fillRect(g, -345, -667, 690, 790, this.color(50, 64, 65));
        this.drawConcreteGrid(g, -345, -667, 690, 790, 132, 108);
        this.drawWater(g, 123, 544);

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

    // ---------- 3：港区防御带 ----------

    private drawHarborDefense(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(18, 49, 60));
        this.drawWaterTexture(g, -650, 650);

        this.fillRect(g, -360, -667, 145, 1334, this.color(48, 63, 65));
        this.fillRect(g, 215, -667, 145, 1334, this.color(48, 63, 65));
        this.drawConcreteGrid(g, -360, -667, 145, 1334, 112, 96);
        this.drawConcreteGrid(g, 215, -667, 145, 1334, 112, 96);

        for (const y of [-500, -145, 225, 520]) {
            this.drawDefensePad(g, -286, y);
            this.drawDefensePad(g, 286, y + 45);
        }

        this.fillRect(g, -215, -330, 92, 64, this.color(57, 72, 73));
        this.fillRect(g, 123, 80, 92, 64, this.color(57, 72, 73));
        this.drawBeacon(g, -205, 585);
        this.drawBeacon(g, 205, -560);
    }

    // ---------- 4：撤离后勤区 / 基地受损 ----------

    private drawLogisticsZone(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(19, 49, 58));
        this.drawWaterTexture(g, -650, 650);

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

        this.drawBlastScar(g, -226, 125, 42);
        this.drawBlastScar(g, 232, 215, 34);
        this.drawBlastScar(g, -252, 555, 28);
    }

    // ---------- 5：GOLIATH 战区 ----------

    private drawGoliathZone(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(17, 45, 55));
        this.drawWaterTexture(g, -650, 650);

        this.fillRect(g, -325, -667, 650, 1334, this.color(44, 55, 57));
        this.drawConcreteGrid(g, -325, -667, 650, 1334, 130, 116);
        this.fillRect(g, -185, -190, 370, 600, this.color(32, 42, 45));
        this.strokeRect(g, -202, -210, 404, 640, 5, this.color(116, 126, 119, 125));
        this.strokeRect(g, -157, -75, 314, 385, 3, this.color(177, 153, 75, 130));
        this.drawChevron(g, 0, -120, 68, this.color(181, 156, 76, 130));
        this.drawChevron(g, 0, 355, 52, this.color(181, 156, 76, 95));

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

        const host = new Node('__GoliathGround');
        host.layer = panel.layer;
        panel.addChild(host);
        const sequence = host.addComponent(Mission01GoliathSequence);
        sequence.initialize();
        this.goliathSequence = sequence;
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
