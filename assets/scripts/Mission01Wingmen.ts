import { _decorator, Color, Component, Graphics, Node, UIOpacity, UITransform } from 'cc';
import { Explosion } from './effect/Explosion';
import { MISSION01_DIRECTOR } from './game/Mission01Director';
import { applyArtSprite } from './game/ArtUtil';
import { MISSION01_SEQUENCES } from './game/Mission01Sequences';

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

/**
 * Mission 01 僚机纯表现层。
 *
 * 所有剧情阈值和连续进度来自 Mission01Director，不再维护独立 elapsed。
 * 1/2 线的 VIPER / FALCON 静态 Sprite 只负责外观，编队、受损、烟迹和撤退仍由程序驱动。
 */
@ccclass('Mission01Wingmen')
export class Mission01Wingmen extends Component {
    private viper: WingmanVisual | null = null;
    private falcon: WingmanVisual | null = null;
    private smoke: SmokePuff[] = [];
    private falconSmokeTimer = 0;
    private viperSmokeTimer = 0;
    private falconHitPlayed = false;
    private falconDeathStarted = false;
    private viperHitPlayed = false;
    private viperWithdrawn = false;

    start() {
        const parent = this.node.parent;
        if (!parent) return;
        this.viper = this.createWingman('VIPER', 'art/wingman_viper');
        this.falcon = this.createWingman('FALCON', 'art/wingman_falcon');
        this.snapInitialPositions();
    }

    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.updateWingmen(dt);
        this.updateSmoke(dt);
    }

    private createWingman(id: WingmanId, resourcePath: string): WingmanVisual | null {
        const parent = this.node.parent;
        if (!parent) return null;

        const wing = new Node(id);
        wing.layer = this.node.layer;
        parent.addChild(wing);
        wing.addComponent(UITransform).setContentSize(96, 120);
        const art = applyArtSprite(wing, resourcePath, 96, 120, '__WingmanArt', 255);

        const shadow = new Node(`__${id}Shadow`);
        shadow.layer = this.node.layer;
        parent.addChild(shadow);
        shadow.addComponent(UITransform).setContentSize(96, 132);
        const g = shadow.addComponent(Graphics);
        g.fillColor = new Color(4, 9, 12, 108);
        g.ellipse(0, 0, 34, 52);
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
        const airborne = smoothstep(MISSION01_DIRECTOR.progress('TAKEOFF'));
        const formation = smoothstep(MISSION01_DIRECTOR.progress('FORMATION'));

        this.updateViper(player.x, player.y, airborne, formation, dt);
        this.updateFalcon(player.x, player.y, airborne, formation, dt);
    }

    private updateViper(playerX: number, playerY: number, airborne: number, formation: number, dt: number) {
        if (!this.viper || this.viperWithdrawn) return;

        let desiredX = playerX - (126 - formation * 14);
        let desiredY = playerY - (88 - formation * 24);
        let targetRotation = 0;
        let followRate = 5.5;

        if (MISSION01_DIRECTOR.hasReached('VIPER_DAMAGED')) {
            if (!this.viperHitPlayed) {
                this.viperHitPlayed = true;
                this.spawnExplosion(this.viper.node.position.x - 24, this.viper.node.position.y + 16, 42);
            }

            const damagedFor = MISSION01_DIRECTOR.since('VIPER_DAMAGED');
            const withdraw = smoothstep(MISSION01_DIRECTOR.progress('VIPER_WITHDRAW'));
            desiredX = playerX - 118 - withdraw * 540;
            desiredY = playerY - 54 + withdraw * 175;
            targetRotation = 11 + withdraw * 24;
            followRate = 3.1;

            this.viperSmokeTimer -= dt;
            if (this.viperSmokeTimer <= 0) {
                this.viperSmokeTimer = 0.11;
                this.spawnSmoke(this.viper.node.position.x - 18, this.viper.node.position.y - 52);
            }

            if (damagedFor >= MISSION01_SEQUENCES.VIPER_WITHDRAW.end - MISSION01_SEQUENCES.VIPER_WITHDRAW.start) {
                this.viperWithdrawn = true;
                this.viper.node.active = false;
                this.viper.shadow.active = false;
                return;
            }
        }

        this.follow(this.viper, desiredX, desiredY, dt, followRate);
        this.viper.rotation += (targetRotation - this.viper.rotation) * Math.min(1, dt * 6);
        this.applyWingmanTransform(this.viper, airborne);
    }

    private updateFalcon(playerX: number, playerY: number, airborne: number, formation: number, dt: number) {
        if (!this.falcon || this.falconDeathStarted) return;

        let desiredX = playerX + (126 - formation * 14);
        let desiredY = playerY - (88 - formation * 24);
        let followRate = 5.5;
        let targetRotation = 0;

        if (MISSION01_DIRECTOR.hasReached('FALCON_TARGETED') && !MISSION01_DIRECTOR.hasReached('FALCON_DAMAGED')) {
            const attack = smoothstep(MISSION01_DIRECTOR.progress('FALCON_INTERCEPT'));
            desiredX = playerX + 112 + attack * 92;
            desiredY = playerY - 64 + Math.sin(attack * Math.PI) * 150;
            targetRotation = -5 - attack * 7;
            followRate = 4.2;
        }

        if (MISSION01_DIRECTOR.hasReached('FALCON_DAMAGED')) {
            if (!this.falconHitPlayed) {
                this.falconHitPlayed = true;
                this.spawnExplosion(this.falcon.node.position.x + 24, this.falcon.node.position.y + 18, 34);
            }

            const fall = smoothstep(MISSION01_DIRECTOR.progress('FALCON_LOSS'));
            desiredX = playerX + 185 + fall * 165;
            desiredY = playerY - 50 - fall * 380;
            targetRotation = -12 - fall * 34;
            followRate = 2.0;

            this.falconSmokeTimer -= dt;
            if (this.falconSmokeTimer <= 0) {
                this.falconSmokeTimer = 0.12;
                this.spawnSmoke(this.falcon.node.position.x + 16, this.falcon.node.position.y - 45);
            }
        }

        this.follow(this.falcon, desiredX, desiredY, dt, followRate);
        this.falcon.rotation += (targetRotation - this.falcon.rotation) * Math.min(1, dt * 5.5);
        this.applyWingmanTransform(this.falcon, airborne);

        if (MISSION01_DIRECTOR.hasReached('FALCON_DESTROYED')) {
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
        wing.art.setScale(0.90 + airborne * 0.05, 0.90 + airborne * 0.05, 1);

        const shadowScale = 1 - airborne * 0.62;
        wing.shadow.setPosition(wing.x + 18 * airborne, wing.y - 16 - 35 * airborne, this.node.position.z);
        wing.shadow.setScale(shadowScale, shadowScale, 1);
        wing.shadowOpacity.opacity = Math.round(108 - airborne * 94);
    }

    private beginFalconDestruction() {
        if (!this.falcon || this.falconDeathStarted) return;
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
        const puff = new Node('WingmanSmoke');
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
