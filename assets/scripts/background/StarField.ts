import { _decorator, Color, Component, Graphics, Node, Sprite, UITransform } from 'cc';
const { ccclass } = _decorator;

const VIEW_WIDTH = 750;
const PANEL_HEIGHT = 1334;
const GROUND_SCROLL_SPEED = 34;
const CLOUD_SCROLL_SPEED = 57;
const PROCEDURAL_PANEL_COUNT = 3;

/**
 * 第一关程序化背景。
 *
 * 不再依赖一张 AI 生成的长背景，而是把基地拆成三个确定性模块：
 * 1. 起飞坪 / 机库
 * 2. 主跑道 / 维修区
 * 3. 基地边界 / 海岸
 *
 * 这样关卡构图、可读性和滚动节奏都由代码控制；场景内原有 Ground Sprite
 * 会被禁用，但资源仍保留，便于随时回滚。云层继续使用原有图片做视差。
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

    start() {
        this.buildAirbase();
        this.clouds = this.node.children.filter((n) => n.name.startsWith('Cloud'));
    }

    /**
     * 关卡演出只需要控制一个速度倍率，不直接操纵每个背景节点。
     * transitionSeconds > 0 时使用 smoothstep 平滑过渡，适合滑跑、离地和 Boss 前减速。
     */
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

    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.updateSpeedTransition(dt);

        // 云层保留最低漂移速度，避免起飞前背景完全静止；地面倍率则直接体现加速感。
        const cloudScale = 0.65 + this.speedScale * 0.35;
        this.scroll(this.ground, PANEL_HEIGHT, GROUND_SCROLL_SPEED * this.speedScale * dt);
        this.scroll(this.clouds, 1080, CLOUD_SCROLL_SPEED * cloudScale * dt);
    }

    private updateSpeedTransition(dt: number) {
        if (this.speedTransitionDuration <= 0) {
            return;
        }
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
            this.drawPanel(graphics, i);
        }
    }

    private drawPanel(g: Graphics, index: number) {
        if (index === 0) {
            this.drawLaunchApron(g);
        } else if (index === 1) {
            this.drawMainRunway(g);
        } else {
            this.drawCoastalExit(g);
        }
    }

    // ---------- 模块 1：起飞坪 ----------

    private drawLaunchApron(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(23, 38, 45));

        // 大块混凝土机坪，刻意降低对比度，避免抢走弹幕可读性。
        this.fillRect(g, -345, -667, 690, 1334, this.color(48, 61, 65));
        this.drawConcreteGrid(g, -345, -667, 690, 1334, 118, 96);

        // 起飞槽：下半段较宽，到上半段收束成主跑道。
        this.fillRect(g, -205, -667, 410, 505, this.color(39, 49, 53));
        this.fillRect(g, -164, -162, 328, 829, this.color(31, 40, 44));
        this.fillRect(g, -176, -162, 12, 829, this.color(65, 75, 76));
        this.fillRect(g, 164, -162, 12, 829, this.color(65, 75, 76));

        // 发射平台框线与导流箭头（无文字）。
        this.strokeRect(g, -154, -585, 308, 275, 4, this.color(128, 139, 132, 150));
        this.drawChevron(g, 0, -350, 72, this.color(181, 168, 100, 170));
        this.drawChevron(g, 0, -250, 58, this.color(181, 168, 100, 145));

        // 主跑道中心虚线。
        this.drawRunwayMarks(g, -115, 660, 105);
        this.drawRunwayLights(g, -164, 164, -120, 650, 92);

        // 左右机库只占边缘，不侵入中央战斗通道。
        this.drawHangar(g, -303, -500, 128, 192);
        this.drawHangar(g, 175, -490, 128, 188);
        this.drawHangar(g, -303, -205, 126, 170);
        this.drawHangar(g, 177, -205, 126, 170);

        // 维护坪、油料罐和安全隔离区。
        this.drawServiceBay(g, -306, 94, 122, 250, true);
        this.drawServiceBay(g, 184, 115, 122, 238, false);
        this.drawTankCluster(g, -293, 465, 2);
        this.drawTankCluster(g, 244, 478, 2);

        // 边缘灯与低对比警戒条。
        this.drawPerimeter(g, -348, 348, -650, 650);
    }

    // ---------- 模块 2：主跑道 ----------

    private drawMainRunway(g: Graphics) {
        this.fillRect(g, -375, -667, 750, 1334, this.color(25, 42, 47));
        this.fillRect(g, -345, -667, 690, 1334, this.color(53, 66, 67));
        this.drawConcreteGrid(g, -345, -667, 690, 1334, 138, 112);

        // 中央跑道保持大面积干净，给玩家、敌机和弹幕留视觉空间。
        this.fillRect(g, -166, -667, 332, 1334, this.color(30, 39, 42));
        this.fillRect(g, -178, -667, 12, 1334, this.color(66, 76, 77));
        this.fillRect(g, 166, -667, 12, 1334, this.color(66, 76, 77));
        this.drawRunwayMarks(g, -650, 660, 116);
        this.drawRunwayLights(g, -166, 166, -650, 650, 92);

        // 两次横向滑行道交叉，让滚动过程中有节奏变化。
        this.drawTaxiCrossing(g, -315);
        this.drawTaxiCrossing(g, 330);

        // 两侧模块化维护设施。
        this.drawServiceBay(g, -321, -555, 132, 250, false);
        this.drawServiceBay(g, 189, -555, 132, 250, true);
        this.drawHangar(g, -321, -130, 132, 205);
        this.drawHangar(g, 189, -130, 132, 205);
        this.drawTankCluster(g, -286, 410, 3);
        this.drawServiceBay(g, 195, 405, 118, 205, false);

        this.drawPerimeter(g, -348, 348, -650, 650);
    }

    // ---------- 模块 3：基地边界 -> 海岸 ----------

    private drawCoastalExit(g: Graphics) {
        // 下部仍是基地，上部逐渐进入海面；始终保持纯俯视，没有“地平线”。
        this.fillRect(g, -375, -667, 750, 1334, this.color(22, 39, 44));
        this.fillRect(g, -345, -667, 690, 790, this.color(50, 64, 65));
        this.drawConcreteGrid(g, -345, -667, 690, 790, 132, 108);

        // 海岸与海面。
        this.fillRect(g, -375, 123, 750, 544, this.color(20, 54, 65));
        this.fillRect(g, -375, 136, 750, 12, this.color(66, 82, 80));
        for (let y = 185; y < 650; y += 72) {
            const offset = ((y / 72) % 2) * 48;
            for (let x = -350 + offset; x < 350; x += 150) {
                this.strokeLine(g, x, y, x + 72, y + 9, 2, this.color(72, 113, 122, 80));
            }
        }

        // 跑道在海岸前结束，形成“真正离开基地”的视觉节点。
        this.fillRect(g, -166, -667, 332, 720, this.color(30, 39, 42));
        this.fillRect(g, -178, -667, 12, 720, this.color(66, 76, 77));
        this.fillRect(g, 166, -667, 12, 720, this.color(66, 76, 77));
        this.drawRunwayMarks(g, -650, 20, 112);
        this.drawRunwayLights(g, -166, 166, -650, 30, 90);

        // 跑道端部阈值条纹。
        for (let x = -145; x <= 105; x += 50) {
            this.fillRect(g, x, 18, 28, 74, this.color(156, 164, 153, 150));
        }

        // 两侧防波堤 / 防御平台，仅作为边缘识别物。
        this.fillRect(g, -345, 62, 128, 92, this.color(57, 73, 73));
        this.fillRect(g, 217, 62, 128, 92, this.color(57, 73, 73));
        this.drawBeacon(g, -281, 108);
        this.drawBeacon(g, 281, 108);

        // 海岸前最后一组服务设施。
        this.drawServiceBay(g, -318, -390, 128, 210, true);
        this.drawTankCluster(g, 247, -365, 2);
        this.drawPerimeter(g, -348, 348, -650, 90);
    }

    // ---------- 可复用背景模块 ----------

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
        // 阴影让设施从地面分离，但整体仍保持低对比。
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
