import { _decorator, Color, Component, Sprite, UIOpacity, UITransform } from 'cc';
import { EnemyBulletKind } from '../bullet/EnemyBullet';
import { ItemKind } from '../item/PowerItem';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

export type EnemyMovePattern = 'STRAIGHT' | 'DIAGONAL_LEFT' | 'DIAGONAL_RIGHT' | 'SINE';

export interface EnemySetup {
    pattern?: EnemyMovePattern;
    speed?: number;
    hp?: number;
    score?: number;
    canShoot?: boolean;
    bulletKind?: EnemyBulletKind;
    shootInterval?: number;
    dropKind?: ItemKind | null;
    elite?: boolean;
}

@ccclass('Enemy')
export class Enemy extends Component {
    public speed = 220;
    public hp = 1;
    public scoreValue = 100;
    public halfWidth = 32;
    public halfHeight = 32;
    public dead = false;
    public canShoot = false;
    public bulletKind: EnemyBulletKind = 'NORMAL';
    public shootInterval = 1.8;
    public dropKind: ItemKind | null = null;
    public elite = false;

    private pattern: EnemyMovePattern = 'STRAIGHT';
    private age = 0;
    private baseX = 0;
    private shootTimer = 1.1;
    private hitFlashTimer = 0;
    private hitFlashDuration = 0.08;
    private baseColor = new Color(255, 255, 255, 255);

    public setup(config: EnemySetup) {
        this.pattern = config.pattern ?? 'STRAIGHT';
        this.speed = config.speed ?? 220;
        this.hp = config.hp ?? 1;
        this.scoreValue = config.score ?? 100;
        this.canShoot = config.canShoot ?? false;
        this.bulletKind = config.bulletKind ?? 'NORMAL';
        this.shootInterval = config.shootInterval ?? 1.8;
        this.dropKind = config.dropKind ?? null;
        this.elite = config.elite ?? false;
        this.baseX = this.node.position.x;
        this.shootTimer = 0.75 + Math.random() * 0.55;
        this.draw();
    }

    public flashHit() {
        this.hitFlashTimer = this.hitFlashDuration;
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        if (this.dead) return;
        this.age += deltaTime;
        const pos = this.node.position;
        let x = pos.x;
        const y = pos.y - this.speed * deltaTime;
        if (this.pattern === 'DIAGONAL_LEFT') x -= 115 * deltaTime;
        else if (this.pattern === 'DIAGONAL_RIGHT') x += 115 * deltaTime;
        else if (this.pattern === 'SINE') x = this.baseX + Math.sin(this.age * 2.8) * 95;
        this.node.setPosition(x, y, 0);
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
            const t = Math.max(0, this.hitFlashTimer / this.hitFlashDuration);
            const sprite = this.node.getChildByName('__EnemyArt')?.getComponent(Sprite);
            if (sprite) {
                const k = 1 - t;
                sprite.color = new Color(
                    255,
                    Math.round(255 - 80 * k),
                    Math.round(255 - 80 * k),
                    255,
                );
            }
        }
        if (y < -760 || x < -450 || x > 450) this.destroySelf();
    }

    public tickShoot(deltaTime: number): boolean {
        if (!this.canShoot || this.dead) return false;
        this.shootTimer -= deltaTime;
        if (this.shootTimer > 0) return false;
        this.shootTimer = this.shootInterval;
        return true;
    }

    public takeDamage(damage: number): boolean {
        if (this.dead) return false;
        this.hp -= damage;
        if (this.hp > 0) return false;
        this.dead = true;
        this.node.destroy();
        return true;
    }

    public destroySelf() {
        if (this.dead) return;
        this.dead = true;
        this.node.destroy();
    }

    private draw() {
        let transform = this.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);
        this.halfWidth = this.elite ? 40 : 31;
        this.halfHeight = this.elite ? 43 : 34;
        transform.setContentSize(this.halfWidth * 2, this.halfHeight * 2);

        const artPath = this.dropKind
            ? 'art/transport'
            : this.elite
                ? 'art/enemy_elite'
                : (this.pattern === 'DIAGONAL_LEFT' || this.pattern === 'DIAGONAL_RIGHT')
                    ? 'art/enemy_fast'
                    : 'art/enemy_normal';
        const artW = this.dropKind ? 94 : this.elite ? 94 : 72;
        const artH = this.dropKind ? 118 : this.elite ? 128 : 112;
        const art = applyArtSprite(this.node, artPath, artW, artH, '__EnemyArt', 255);
        art.angle = 180;
    }
}
