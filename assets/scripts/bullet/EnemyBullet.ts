import { _decorator, Color, Component, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

export type EnemyBulletKind = 'NORMAL' | 'HEAVY' | 'SPECIAL';

@ccclass('EnemyBullet')
export class EnemyBullet extends Component {
    public dead = false;
    public kind: EnemyBulletKind = 'NORMAL';
    public radius = 8;
    public interceptable = true;

    private vx = 0;
    private vy = -360;
    private glowNode: Node | null = null;
    private glowOpacity: UIOpacity | null = null;
    private glowTransform: UITransform | null = null;

    public setup(kind: EnemyBulletKind, vx: number, vy: number) {
        this.kind = kind;
        this.vx = vx;
        this.vy = vy;
        this.radius = kind === 'NORMAL' ? 8 : kind === 'HEAVY' ? 14 : 17;
        this.interceptable = kind === 'NORMAL';
        this.draw();
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        if (this.dead) return;
        const pos = this.node.position;
        this.node.setPosition(pos.x + this.vx * deltaTime, pos.y + this.vy * deltaTime, 0);
        if (this.glowOpacity) {
            const baseOpacity = this.kind === 'HEAVY' ? 110 : this.kind === 'SPECIAL' ? 95 : 60;
            const flicker = baseOpacity * (0.85 + 0.15 * Math.sin(performance.now() * 0.012));
            this.glowOpacity.opacity = flicker;
        }
        const next = this.node.position;
        if (next.y < -760 || next.y > 760 || next.x < -430 || next.x > 430) this.destroySelf();
    }

    public destroySelf() {
        if (this.dead) return;
        this.dead = true;
        this.node.destroy();
    }

    private draw() {
        let transform = this.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);
        transform.setContentSize(this.radius * 2, this.radius * 2);

        const path = this.kind === 'NORMAL' ? 'art/bullet_enemy_normal' : 'art/bullet_enemy_heavy';
        const size = this.kind === 'NORMAL' ? 24 : 42;
        applyArtSprite(this.node, path, size, this.kind === 'NORMAL' ? 38 : 42, '__EnemyBulletArt', 255);

        // Heavy 弹加发光底圈，强化辨识度；普通弹只给一点外晕。
        if (this.kind !== 'NORMAL') {
            this.glowNode = new Node('__Glow');
            this.glowNode.layer = this.node.layer;
            this.glowNode.setSiblingIndex(0);
            this.node.addChild(this.glowNode);
            this.glowTransform = this.glowNode.addComponent(UITransform);
            this.glowNode.addComponent(Sprite).color = this.kind === 'HEAVY'
                ? new Color(255, 90, 90, 255) : new Color(255, 180, 120, 255);
            this.glowOpacity = this.glowNode.addComponent(UIOpacity);
            this.glowOpacity.opacity = this.kind === 'HEAVY' ? 110 : 95;
            const glowSize = this.kind === 'HEAVY' ? 52 : 60;
            this.glowTransform.setContentSize(glowSize, glowSize);
            applyArtSprite(this.glowNode, 'art/ui_white', glowSize, glowSize, '__GlowArt', 255);
        }
    }
}
