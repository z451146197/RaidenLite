import { _decorator, Color, Component, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { MISSION01_TIMELINE, Mission01StoryCue } from './game/Mission01Timeline';

const { ccclass } = _decorator;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
}

function storyTime(cue: Mission01StoryCue, fallback: number) {
    const event = MISSION01_TIMELINE.find((item) => item.kind === 'STORY' && item.cue === cue);
    return event?.time ?? fallback;
}

/**
 * AURORA 的 V1 飞行演出层。
 *
 * 不切换机体帧：地面/滑跑/离地/巡航全部由阴影、尾焰、轻微缩放和既有背景速度共同完成。
 * 本组件只负责视觉，不改变玩家碰撞盒、输入或武器逻辑。
 */
@ccclass('PlayerFlightPresentation')
export class PlayerFlightPresentation extends Component {
    private elapsed = 0;
    private shadowNode: Node | null = null;
    private shadowOpacity: UIOpacity | null = null;
    private thrusterNode: Node | null = null;
    private thrusterOpacity: UIOpacity | null = null;
    private artNode: Node | null = null;

    private readonly formationTime = storyTime('FORMATION_RUNWAY', 6);
    private readonly takeoffTime = storyTime('TAKEOFF', 14);
    private readonly controlTime = storyTime('PLAYER_CONTROL', 24);

    start() {
        this.artNode = this.node.getChildByName('__PlayerArt');
        this.buildShadow();
        this.buildThruster();
        this.applyFlightState(0);
    }

    update(dt: number) {
        this.elapsed += Math.min(dt, 1 / 20);
        this.applyFlightState(this.elapsed);
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

        // 插到玩家节点之前，保证阴影永远在机体下方。
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

    private applyFlightState(time: number) {
        let shadowScale = 1;
        let shadowAlpha = 118;
        let shadowOffsetX = 8;
        let shadowOffsetY = -18;
        let artScale = 1;
        let thrusterStrength = 0.20;

        if (time >= this.formationTime && time < this.takeoffTime) {
            const rollout = smoothstep((time - this.formationTime) / Math.max(0.1, this.takeoffTime - this.formationTime));
            thrusterStrength = 0.35 + rollout * 0.50;
            shadowOffsetY -= rollout * 5;
        } else if (time >= this.takeoffTime && time < this.controlTime) {
            const lift = smoothstep((time - this.takeoffTime) / Math.max(0.1, this.controlTime - this.takeoffTime));
            thrusterStrength = 0.85 + lift * 0.15;
            shadowScale = 1 - lift * 0.65;
            shadowAlpha = 118 - lift * 104;
            shadowOffsetX = 8 + lift * 18;
            shadowOffsetY = -23 - lift * 34;
            artScale = 1 + lift * 0.07;
        } else if (time >= this.controlTime) {
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
            const pulse = time >= this.formationTime ? 0.94 + Math.sin(time * 18) * 0.06 : 1;
            this.thrusterNode.setScale(0.78 + thrusterStrength * 0.22, (0.46 + thrusterStrength * 0.70) * pulse, 1);
            this.thrusterOpacity.opacity = Math.round(70 + thrusterStrength * 175);
        }
    }

    onDestroy() {
        this.shadowNode?.destroy();
        this.shadowNode = null;
    }
}
