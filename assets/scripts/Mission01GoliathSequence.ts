import { _decorator, Color, Component, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { goliathState } from './game/Mission01ActorState';
import { applyArtSprite } from './game/ArtUtil';
import { MISSION01_DIRECTOR } from './game/Mission01Director';

const { ccclass } = _decorator;

const GOLIATH_BASE_Y = 110;

/**
 * GOLIATH 从“地面设施”转为“战斗 Boss”的独立演出 Sequence。
 *
 * 不读取 Timeline cue；只消费 GROUNDED/LIFTING/ENGAGED 演员状态。
 * StarField 只负责 GroundF 宿主，Boss 逻辑只负责战斗，两边都不拥有这段演出时间。
 */
@ccclass('Mission01GoliathSequence')
export class Mission01GoliathSequence extends Component {
    private artNode: Node | null = null;
    private shadowNode: Node | null = null;
    private shadowOpacity: UIOpacity | null = null;
    private thrusterOpacity: UIOpacity | null = null;
    private initialized = false;
    private handedOff = false;

    public initialize() {
        if (this.initialized) return;
        this.initialized = true;

        const panel = this.node.parent;
        if (!panel) return;

        this.node.name = '__GoliathGround';
        this.node.setPosition(0, GOLIATH_BASE_Y, 0);
        const hostTransform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        hostTransform.setContentSize(285, 250);

        const shadow = new Node('__GoliathShadow');
        shadow.layer = panel.layer;
        panel.addChild(shadow);
        shadow.setPosition(0, GOLIATH_BASE_Y - 34, 0);
        shadow.addComponent(UITransform).setContentSize(250, 150);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(3, 8, 11, 118);
        sg.ellipse(0, 0, 108, 58);
        sg.fill();
        this.shadowOpacity = shadow.addComponent(UIOpacity);
        shadow.setSiblingIndex(this.node.getSiblingIndex());
        this.shadowNode = shadow;

        const art = applyArtSprite(this.node, 'art/boss', 285, 250, '__BossArt', 255);
        art.angle = 180;
        art.setScale(0.90, 0.90, 1);
        this.artNode = art;

        const thruster = new Node('__GoliathThruster');
        thruster.layer = this.node.layer;
        this.node.addChild(thruster);
        thruster.setPosition(0, 103, 0);
        thruster.addComponent(UITransform).setContentSize(130, 58);
        const tg = thruster.addComponent(Graphics);
        tg.fillColor = new Color(255, 147, 74, 230);
        tg.circle(-42, 0, 13);
        tg.circle(42, 0, 13);
        tg.fill();
        this.thrusterOpacity = thruster.addComponent(UIOpacity);
        this.thrusterOpacity.opacity = 0;
    }

    update() {
        if (!this.initialized || this.handedOff) return;
        const state = goliathState(MISSION01_DIRECTOR);
        if (state.phase === 'GROUNDED') return;

        const t = state.progress * state.progress * (3 - 2 * state.progress);
        const rumble = Math.min(1, state.elapsed / 1.6);
        const jitterX = Math.sin(MISSION01_DIRECTOR.time * 42) * 2.2 * rumble * (1 - t * 0.55);
        const lift = 118 * t;

        this.node.setPosition(jitterX, GOLIATH_BASE_Y + lift, 0);
        this.artNode?.setScale(0.90 + t * 0.12, 0.90 + t * 0.12, 1);

        if (this.shadowNode) {
            this.shadowNode.setScale(1 - t * 0.58, 1 - t * 0.58, 1);
        }
        if (this.shadowOpacity) {
            this.shadowOpacity.opacity = Math.round(118 * (1 - t * 0.82));
        }
        if (this.thrusterOpacity) {
            const pulse = 0.82 + Math.sin(MISSION01_DIRECTOR.time * 23) * 0.18;
            this.thrusterOpacity.opacity = Math.round((55 + t * 190) * pulse);
        }
    }

    /** 把玩家已经看见的同一个 Boss Sprite 从 GroundF 迁到 BossLayer。 */
    public handoffVisualTo(target: Node): boolean {
        if (this.handedOff) return false;
        const art = this.artNode ?? this.node.getChildByName('__BossArt');
        if (!art) return false;

        this.handedOff = true;
        const world = this.node.worldPosition.clone();
        target.setWorldPosition(world);

        art.removeFromParent();
        target.addChild(art);
        art.setPosition(0, 0, 0);
        art.angle = 180;

        this.shadowNode?.destroy();
        this.shadowNode = null;
        this.artNode = null;
        this.node.destroy();
        return true;
    }
}
