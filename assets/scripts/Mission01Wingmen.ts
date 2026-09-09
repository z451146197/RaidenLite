import { _decorator, Color, Component, Graphics, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { Explosion } from './effect/Explosion';
import { applyArtSprite } from './game/ArtUtil';
import { MISSION01_TIMELINE, Mission01StoryCue } from './game/Mission01Timeline';

const { ccclass } = _decorator;

type WingmanId = 'VIPER' | 'FALCON';

interface WingmanVisual {
    id: WingmanId;
    node: Node;
    art: Node;
    shadow: Node;
    shadowOpacity: UIOpacity;
    x: number;
    y: number;
    rotation: number;
}

interface SmokePuff {
    node: Node;
    opacity: UIOpacity;
    age: number;
    life: number;
}

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
 * Mission 01 僚机程序演出。
 *
 * V1 暂时复用 AURORA 静态 Sprite 作为 VIPER / FALCON 占位，靠尺寸与色调区分；
 * 以后有独立静态机体时只替换 resourcePath，不改编队、受损、坠毁逻辑。
 */
@ccclass('Mission01Wingmen')
export class Mission01Wingmen extends Component {
    private elapsed = 0;
    private viper: WingmanVisual | null = null;
    private falcon: WingmanVisual | null = null;
    private smoke: SmokePuff[] = [];
    private smokeTimer = 0;
    private falconHitPlayed = false;
    private falconDeathStarted = false;

    private readonly formationTime = storyTime('FORMATION_RUNWAY', 6);
    private readonly takeoffTime = storyTime('TAKEOFF', 14);
    private readonly controlTime = storyTime('PLAYER_CONTROL', 24);
    private readonly falconTargetedTime = storyTime('FALCON_TARGETED', 98);
    private readonly falconDamagedTime = storyTime('FALCON_DAMAGED', 108);
    private readonly falconDestroyedTime = storyTime('FALCON_DESTROYED', 117);

    start() {
        const parent = this.node.parent;
        if (!parent) return;
        this.viper = this.createWingman('VIPER', new Color(160, 214, 255, 235));
        this.falcon = this.createWingman('FALCON', new Color(255, 205, 145, 235));
        this.snapInitialPositions();
    }

    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.elapsed += dt;
        this.updateWingmen(dt);
        this.updateSmoke(dt);
    }

    private createWingman(id: WingmanId, tint: Color): WingmanVisual | null {
        const parent = this.node.parent;
        if (!parent) return null;

        const wing = new Node(id);
        wing.layer = this.node.layer;
        parent.addChild(wing);
        wing.addComponent(UITransform).setContentSize(86, 172);
        const art = applyArtSprite(wing, 'art/player', 86, 172, '__WingmanArt', 235, () => {
            // applyArtSprite 在缓存命中时会同步触发回调，因此不能闭包引用尚未完成赋值的 art 常量。
            const sprite = wing.getChildByName('__WingmanArt')?.getComponent(Sprite);
            if (sprite) sprite.color = tint;
        });

        const shadow = new Node(`__${id}Shadow`);
        shadow.layer = this.node.layer;
        parent.addChild(shadow);
        shadow.addComponent(UITransform).setContentSize(90, 155);
        const g = shadow.addComponent(Graphics);
        g.fillColor = new Color(4, 9, 12, 108);
        g.ellipse(0, 0, 31, 61);
        g.fill();
        const shadowOpacity = shadow.addComponent(UIOpacity);
        shadow.setSiblingIndex(wing.getSiblingIndex());

        return { id, node: wing, art, shadow, shadowOpacity, x: 0, y: 0, rotation: 0 };
    }

    private snapInitialPositions() {
        const p = this.node.position;
        if (this.viper) {
            this.viper.x = p.x - 126;
            this.viper.y = p.y - 88;
            this.viper.node.setPosition(this.viper.x, this.viper.y, p.z);
        }
        if (this.falcon) {
            this.falcon.x = p.x + 126;
            this.falcon.y = p.y - 88;
            this.falcon.node.setPosition(this.falcon.x, this.falcon.y, p.z);
        }
    }

    private updateWingmen(dt: number) {
        const player = this.node.position;
        const airborne = smoothstep((this.elapsed - this.takeoffTime) / Math.max(0.1, this.controlTime - this.takeoffTime));
        const formation = smoothstep((this.elapsed - this.formationTime) / Math.max(0.1, this.takeoffTime - this.formationTime));

        if (this.viper) {
            const desiredX = player.x - (126 - formation * 14);
            const desiredY = player.y - (88 - formation * 24);
            this.follow(this.viper, desiredX, desiredY, dt, 5.5);
            this.viper.rotation += (0 - this.viper.rotation) * Math.min(1, dt * 7);
            this.applyWingmanTransform(this.viper, airborne);
        }

        if (this.falcon && !this.falconDeathStarted) {
            let desiredX = player.x + (126 - formation * 14);
            let desiredY = player.y - (88 - formation * 24);
            let followRate = 5.5;
            let targetRotation = 0;

            if (this.elapsed >= this.falconTargetedTime && this.elapsed < this.falconDamagedTime) {
                const attack = smoothstep((this.elapsed - this.falconTargetedTime)
                    / Math.max(0.1, this.falconDamagedTime - this.falconTargetedTime));
                desiredX = player.x + 112 + attack * 92;
                desiredY = player.y - 64 + Math.sin(attack * Math.PI) * 150;
                targetRotation = -5 - attack * 7;
                followRate = 4.2;
            }

            if (this.elapsed >= this.falconDamagedTime) {
                if (!this.falconHitPlayed) {
                    this.falconHitPlayed = true;
                    this.spawnExplosion(this.falcon.node.position.x + 24, this.falcon.node.position.y + 18, 34);
                }
                const damagedFor = this.elapsed - this.falconDamagedTime;
                desiredX = player.x + 185 + damagedFor * 18;
                desiredY = player.y - 50 - damagedFor * 42;
                targetRotation = -12 - damagedFor * 8;
                followRate = 2.0;
                this.smokeTimer -= dt;
                if (this.smokeTimer <= 0) {
                    this.smokeTimer = 0.12;
                    this.spawnSmoke(this.falcon.node.position.x + 16, this.falcon.node.position.y - 55);
                }
            }

            this.follow(this.falcon, desiredX, desiredY, dt, followRate);
            this.falcon.rotation += (targetRotation - this.falcon.rotation) * Math.min(1, dt * 5.5);
            this.applyWingmanTransform(this.falcon, airborne);
        }

        if (!this.falconDeathStarted && this.elapsed >= this.falconDestroyedTime && this.falcon) {
            this.beginFalconDestruction();
        }
    }

    private follow(wing: WingmanVisual, desiredX: number, desiredY: number, dt: number, rate: number) {
        const blend = 1 - Math.exp(-rate * dt);
        wing.x += (desiredX - wing.x) * blend;
        wing.y += (desiredY - wing.y) * blend;
    }

    private applyWingmanTransform(wing: WingmanVisual, airborne: number) {
        wing.node.setPosition(wing.x, wing.y, this.node.position.z);
        wing.node.setRotationFromEuler(0, 0, wing.rotation);
        wing.art.setScale(0.88 + airborne * 0.05, 0.88 + airborne * 0.05, 1);

        const shadowScale = 1 - airborne * 0.62;
        wing.shadow.setPosition(wing.x + 18 * airborne, wing.y - 16 - 35 * airborne, this.node.position.z);
        wing.shadow.setScale(shadowScale, shadowScale, 1);
        wing.shadowOpacity.opacity = Math.round(108 - airborne * 94);
    }

    private beginFalconDestruction() {
        if (!this.falcon) return;
        this.falconDeathStarted = true;
        const falcon = this.falcon;
        const x = falcon.node.position.x;
        const y = falcon.node.position.y;

        this.spawnExplosion(x - 10, y + 18, 48);
        this.scheduleOnce(() => this.spawnExplosion(x + 25, y - 15, 62), 0.18);
        this.scheduleOnce(() => this.spawnExplosion(x - 18, y - 30, 86), 0.38);
        this.scheduleOnce(() => {
            falcon.node.active = false;
            falcon.shadow.active = false;
        }, 0.46);
    }

    private spawnExplosion(x: number, y: number, size: number) {
        const parent = this.node.parent;
        if (!parent) return;
        const fx = new Node('WingmanExplosion');
        fx.layer = this.node.layer;
        parent.addChild(fx);
        fx.setPosition(x, y, this.node.position.z);
        fx.addComponent(Explosion).setup(size, 0.42, new Color(255, 175, 105, 255));
    }

    private spawnSmoke(x: number, y: number) {
        const parent = this.node.parent;
        if (!parent) return;
        const puff = new Node('FalconSmoke');
        puff.layer = this.node.layer;
        parent.addChild(puff);
        puff.setPosition(x, y, this.node.position.z);
        puff.addComponent(UITransform).setContentSize(50, 50);
        const g = puff.addComponent(Graphics);
        g.fillColor = new Color(80, 88, 88, 170);
        g.circle(0, 0, 16);
        g.fill();
        const opacity = puff.addComponent(UIOpacity);
        this.smoke.push({ node: puff, opacity, age: 0, life: 1.15 });
    }

    private updateSmoke(dt: number) {
        for (const puff of this.smoke) {
            puff.age += dt;
            const t = clamp01(puff.age / puff.life);
            const p = puff.node.position;
            puff.node.setPosition(p.x, p.y - 34 * dt, p.z);
            const scale = 0.75 + t * 1.45;
            puff.node.setScale(scale, scale, 1);
            puff.opacity.opacity = Math.round(170 * (1 - t) * (1 - t));
            if (t >= 1) puff.node.destroy();
        }
        this.smoke = this.smoke.filter((puff) => puff.age < puff.life);
    }

    onDestroy() {
        this.viper?.node.destroy();
        this.viper?.shadow.destroy();
        this.falcon?.node.destroy();
        this.falcon?.shadow.destroy();
        for (const puff of this.smoke) puff.node.destroy();
        this.smoke.length = 0;
    }
}
