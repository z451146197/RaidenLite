import { _decorator, Color, Component, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { auroraFlightState } from './game/Mission01ActorState';
import { MISSION01_DIRECTOR } from './game/Mission01Director';

const { ccclass } = _decorator;

function smoothstep(value: number) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
}

/**
 * AURORA 的纯表现层。
 *
 * 不理解 Timeline 秒点，只消费 Director 派生的 AuroraFlightState。
 * 后续加入镜头、音效或地勤灯时，可与本组件共享 READY/ROLLING/LIFTING/AIRBORNE 语义。
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
        const state = auroraFlightState(MISSION01_DIRECTOR);
        const progress = smoothstep(state.progress);

        let shadowScale = 1;
        let shadowAlpha = 118;
        let shadowOffsetX = 8;
        let shadowOffsetY = -18;
        let artScale = 1;
        let thrusterStrength = 0.20;

        if (state.phase === 'ROLLING') {
            thrusterStrength = 0.35 + progress * 0.50;
            shadowOffsetY -= progress * 5;
        } else if (state.phase === 'LIFTING') {
            thrusterStrength = 0.85 + progress * 0.15;
            shadowScale = 1 - progress * 0.65;
            shadowAlpha = 118 - progress * 104;
            shadowOffsetX = 8 + progress * 18;
            shadowOffsetY = -23 - progress * 34;
            artScale = 1 + progress * 0.07;
        } else if (state.phase === 'AIRBORNE') {
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
            const pulse = state.phase === 'READY' ? 1 : 0.94 + Math.sin(MISSION01_DIRECTOR.time * 18) * 0.06;
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
