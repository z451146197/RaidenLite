import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

@ccclass('Boss')
export class Boss extends Component {
    public maxHp = 160;
    public hp = 160;
    public scoreValue = 2000;
    public halfWidth = 118;
    public halfHeight = 68;
    public dead = false;
    public entered = false;
    private age = 0;
    private hitFlashTimer = 0;
    private hitFlashDuration = 0.1;

    onLoad() {
        let transform = this.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);
        transform.setContentSize(this.halfWidth * 2, this.halfHeight * 2);

        const art = applyArtSprite(this.node, 'art/boss', 285, 250, '__BossArt', 255);
        art.angle = 180;
    }

    public flashHit() {
        this.hitFlashTimer = this.hitFlashDuration;
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        if (this.dead) return;
        this.age += deltaTime;
        const pos = this.node.position;
        if (!this.entered) {
            const nextY = pos.y - 125 * deltaTime;
            this.node.setPosition(pos.x, nextY, 0);
            if (nextY <= 465) {
                this.entered = true;
                this.node.setPosition(0, 465, 0);
            }
            return;
        }
        this.node.setPosition(Math.sin(this.age * 0.85) * 205, 465 + Math.sin(this.age * 1.7) * 18, 0);
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
            const t = Math.max(0, this.hitFlashTimer / this.hitFlashDuration);
            const k = 1 - t;
            const sprite = this.node.getChildByName('__BossArt')?.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(
                    255,
                    Math.round(255 - 60 * k),
                    Math.round(255 - 60 * k),
                    255,
                );
            }
        }
    }

    public takeDamage(damage: number): boolean {
        if (this.dead) return false;
        this.hp -= damage;
        if (this.hp > 0) return false;
        this.hp = 0;
        this.dead = true;
        this.node.destroy();
        return true;
    }
}
