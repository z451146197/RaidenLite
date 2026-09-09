import { _decorator, Color, Component, isValid, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

export type PlayerBulletStyle = 'NORMAL' | 'SPREAD' | 'LASER';

@ccclass('Bullet')
export class Bullet extends Component {
    public speed = 950;
    public damage = 1;
    public halfWidth = 6;
    public halfHeight = 16;
    public dead = false;

    private vx = 0;
    private vy = 950;
    private style: PlayerBulletStyle = 'NORMAL';
    private homingTarget: Node | null = null;
    private haloNode: Node | null = null;
    private haloOpacity: UIOpacity | null = null;

    public setup(angleDeg: number, damage: number, style: PlayerBulletStyle, target: Node | null = null) {
        this.damage = damage;
        this.style = style;
        this.homingTarget = target;
        this.speed = style === 'LASER' ? 1050 : 950;

        const angle = angleDeg * Math.PI / 180;
        this.vx = Math.sin(angle) * this.speed;
        this.vy = Math.cos(angle) * this.speed;
        this.ensureView();
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        if (this.dead) return;

        if (this.style === 'LASER' && this.homingTarget && isValid(this.homingTarget, true)) {
            const pos = this.node.position;
            const targetPos = this.homingTarget.position;
            const dx = targetPos.x - pos.x;
            const dy = targetPos.y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 1) {
                const desiredX = dx / distance * this.speed;
                const desiredY = dy / distance * this.speed;
                const steer = Math.min(1, deltaTime * 7.5);
                this.vx += (desiredX - this.vx) * steer;
                this.vy += (desiredY - this.vy) * steer;
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
                this.vx = this.vx / currentSpeed * this.speed;
                this.vy = this.vy / currentSpeed * this.speed;
            }
        }

        this.node.angle = -Math.atan2(this.vx, this.vy) * 180 / Math.PI;
        const pos = this.node.position;
        this.node.setPosition(pos.x + this.vx * deltaTime, pos.y + this.vy * deltaTime, 0);
        if (this.haloOpacity) {
            const baseOpacity = this.style === 'LASER' ? 150 : 90;
            this.haloOpacity.opacity = baseOpacity * (0.85 + 0.15 * Math.sin(performance.now() * 0.018));
        }
        const next = this.node.position;
        if (next.y > 760 || next.y < -760 || next.x < -430 || next.x > 430) this.destroySelf();
    }

    public destroySelf() {
        if (this.dead) return;
        this.dead = true;
        this.node.destroy();
    }

    private ensureView() {
        let transform = this.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);

        this.halfWidth = this.style === 'LASER' ? 5 : 6;
        this.halfHeight = this.style === 'LASER' ? 22 : 16;
        transform.setContentSize(this.halfWidth * 2, this.halfHeight * 2);

        const path = this.style === 'LASER'
            ? 'art/bullet_laser'
            : this.style === 'SPREAD'
                ? 'art/bullet_spread'
                : 'art/bullet_player';
        const width = this.style === 'LASER' ? 14 : 14;
        const height = this.style === 'LASER' ? 58 : 44;
        applyArtSprite(this.node, path, width, height, '__BulletArt', 255);

        // 子弹外圈微光，强化发射感。
        this.haloNode = new Node('__Halo');
        this.haloNode.layer = this.node.layer;
        this.haloNode.setSiblingIndex(0);
        this.node.addChild(this.haloNode);
        const haloTransform = this.haloNode.addComponent(UITransform);
        const haloSize = this.style === 'LASER' ? 24 : 20;
        haloTransform.setContentSize(haloSize, haloSize);
        const haloSprite = this.haloNode.addComponent(Sprite);
        haloSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        haloSprite.trim = false;
        haloSprite.color = this.style === 'LASER'
            ? new Color(170, 235, 255, 255)
            : this.style === 'SPREAD'
                ? new Color(255, 200, 120, 255)
                : new Color(180, 220, 255, 255);
        this.haloOpacity = this.haloNode.addComponent(UIOpacity);
        this.haloOpacity.opacity = this.style === 'LASER' ? 150 : 90;
        applyArtSprite(this.haloNode, 'art/ui_white', haloSize, haloSize, '__HaloArt', 255);
    }
}
