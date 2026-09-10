import { _decorator, Color, Component, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { MISSION01_DIRECTOR } from './game/Mission01Director';
import { MISSION01_SEQUENCES } from './game/Mission01Timeline';

const { ccclass } = _decorator;

function smoothstep(value: number) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}

/**
 * AURORA 的纯表现层。
 *
 * 剧情时间只读取 Mission01Director；本组件不再维护 elapsed，也不复制任何秒点。
 * 地面 / 滑跑 / 离地 / 巡航全部由静态机体 + 阴影 + 尾焰 + 轻微缩放完成。
 */
@ccclass('PlayerFlightPresentation')
export class PlayerFlightPresentation extends Component {
    private shadowNode: Node | null = null;
    private shadowOpacity: UIOpacity | null = null;
    private thrusterNode: Node | null = null;
    private thrusterOpacity: UIOpacity | null = null;
    private artNode: Node | null = null;

    start() {
        this.artNode = this.node.getChildByName('__PlayerArt');
        this.buildShadow();
        this.buildThruster();
        this.applyFlightState();
    }

    update() {
        this.applyFlightState();
    }

    private buildShadow() {
        const parent = this.node.parent;
        if (!parent) return;

        const shadow = new Node('__FlightShadow');
        shadow.layer = this.node.layer;
        parent.addChild(shadow);
        shadow.addComponent(UITransform).setContentSize(110, 190);
        const graphics = shadow.addComponent(Graphics);
        graphics.fillColor = new Color(4, 9, 12, 118);
        graphics.ellipse(0, 0, 39, 76);
        graphics.fill();
        this.shadowOpacity = shadow.addComponent(UIOpacity);
        shadow.setSiblingIndex(this.node.getSiblingIndex());
        this.shadowNode = shadow;
    }

    private buildThruster() {
        const thruster = new Node('__ThrusterFx');
        thruster.layer = this.node.layer;
        this.node.addChild(thruster);
        thruster.setPosition(0, -92, 0);
        thruster.addComponent(UITransform).setContentSize(54, 105);

        const graphics = thruster.addComponent(Graphics);
        graphics.fillColor = new Color(100, 205, 255, 205);
        graphics.moveTo(-15, 25);
        graphics.lineTo(15, 25);
        graphics.lineTo(0, -48);
        graphics.close();
        graphics.fill();
        graphics.fillColor = new Color(225, 248, 255, 235);
        graphics.moveTo(-7, 22);
        graphics.lineTo(7, 22);
        graphics.lineTo(0, -28);
        graphics.close();
        graphics.fill();

        this.thrusterOpacity = thruster.addComponent(UIOpacity);
        thruster.setSiblingIndex(0);
        this.thrusterNode = thruster;
    }

    private applyFlightState() {
        const time = MISSION01_DIRECTOR.time;
        const formation = smoothstep(MISSION01_DIRECTOR.progress('FORMATION'));
        const lift = smoothstep(MISSION01_DIRECTOR.progress('TAKEOFF'));
        const formationStart = MISSION01_SEQUENCES.FORMATION.start;
        const takeoffStart = MISSION01_SEQUENCES.TAKEOFF.start;
        const airborne = time >= MISSION01_SEQUENCES.TAKEOFF.end;

        let shadowScale = 1;
        let shadowAlpha = 118;
        let shadowOffsetX = 8;
        let shadowOffsetY = -18;
        let artScale = 1;
        let thrusterStrength = 0.20;

        if (time >= formationStart && time < takeoffStart) {
            thrusterStrength = 0.35 + formation * 0.50;
            shadowOffsetY -= formation * 5;
        } else if (time >= takeoffStart && !airborne) {
            thrusterStrength = 0.85 + lift * 0.15;
            shadowScale = 1 - lift * 0.65;
            shadowAlpha = 118 - lift * 104;
            shadowOffsetX = 8 + lift * 18;
            shadowOffsetY = -23 - lift * 34;
            artScale = 1 + lift * 0.07;
        } else if (airborne) {
            shadowScale = 0.35;
            shadowAlpha = 14;
            shadowOffsetX = 26;
            shadowOffsetY = -57;
            artScale = 1.07;
            thrusterStrength = 1;
        }

        if (this.shadowNode && this.shadowOpacity) {
            const p = this.node.position;
            this.shadowNode.setPosition(p.x + shadowOffsetX, p.y + shadowOffsetY, p.z);
            this.shadowNode.setScale(shadowScale, shadowScale, 1);
            this.shadowOpacity.opacity = Math.round(shadowAlpha);
        }

        if (this.artNode) {
            this.artNode.setScale(artScale, artScale, 1);
        }

        if (this.thrusterNode && this.thrusterOpacity) {
            const pulse = time >= formationStart ? 0.94 + Math.sin(time * 18) * 0.06 : 1;
            this.thrusterNode.setScale(
                0.78 + thrusterStrength * 0.22,
                (0.46 + thrusterStrength * 0.70) * pulse,
                1,
            );
            this.thrusterOpacity.opacity = Math.round(70 + thrusterStrength * 175);
        }
    }

    onDestroy() {
        this.shadowNode?.destroy();
        this.shadowNode = null;
    }
}
