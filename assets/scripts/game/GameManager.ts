import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    instantiate,
    isValid,
    Label,
    Node,
    Prefab,
    profiler,
    ResolutionPolicy,
    Sprite,
    SpriteFrame,
    UIOpacity,
    UITransform,
    Vec2,
    Vec3,
    view,
} from 'cc';
import { Bullet, PlayerBulletStyle } from '../bullet/Bullet';
import { EnemyBullet, EnemyBulletKind } from '../bullet/EnemyBullet';
import { Boss } from '../enemy/Boss';
import { Enemy, EnemyMovePattern, EnemySetup } from '../enemy/Enemy';
import { PowerItem, ItemKind } from '../item/PowerItem';
import { Explosion } from '../effect/Explosion';
import { StarField } from '../background/StarField';
import { registerArtFrames, applyArtSprite } from './ArtUtil';
import { MISSION01_DIRECTOR } from './Mission01Director';
import { Mission01Event, Mission01StoryCue } from './Mission01Timeline';

const { ccclass, property, executionOrder } = _decorator;

type GameState = 'PLAYING' | 'WARNING' | 'BOSS' | 'GAME_OVER' | 'CLEAR';
type WeaponKind = 'NORMAL' | 'SPREAD' | 'LASER';

@ccclass('GameManager')
@executionOrder(-100)
export class GameManager extends Component {
    @property(Node)
    public playerNode: Node | null = null;
    @property(Node)
    public gameplayRoot: Node | null = null;
    @property(Node)
    public uiRoot: Node | null = null;
    @property(Node)
    public bossLayer: Node | null = null;
    @property([SpriteFrame])
    public artFrames: SpriteFrame[] = [];

    private readonly playerHitRadius = 8;
    private readonly maxPower = 5;

    private gameState: GameState = 'PLAYING';
    private assetsReady = false;
    private restarting = false;
    private score = 0;
    private playerControlEnabled = false;
    private playerAutoFireEnabled = false;
    private background: StarField | null = null;
    private stopMissionListener: (() => void) | null = null;

    private currentWeapon: WeaponKind = 'NORMAL';
    private spreadUnlocked = false;
    private laserUnlocked = false;
    private powerLevel = 1;
    private bombs = 0;
    private overdriveTimer = 0;
    private invulnerableTimer = 0;
    private shootTimer = 0;

    @property(Prefab)
    private bulletPrefab: Prefab | null = null;
    @property(Prefab)
    private enemyPrefab: Prefab | null = null;

    @property(Node)
    private bulletLayer: Node | null = null;
    @property(Node)
    private enemyLayer: Node | null = null;
    @property(Node)
    private enemyBulletLayer: Node | null = null;
    @property(Node)
    private itemLayer: Node | null = null;

    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];
    private enemyBullets: EnemyBullet[] = [];
    private items: PowerItem[] = [];
    private boss: Boss | null = null;
    private bossShotTimer = 1.2;
    private bossPatternIndex = 0;

    private shakeTimer = 0;
    private shakeAmplitude = 0;
    private shakeOffset = new Vec3();
    private gameplayOrigin = new Vec3();
    private bossHpBarBg: Sprite | null = null;
    private bossHpBarFill: Sprite | null = null;
    private bossHpBarFillTransform: UITransform | null = null;

    private scoreLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private weaponButtonLabel: Label | null = null;
    private bombButtonLabel: Label | null = null;
    private warningNode: Node | null = null;
    private bossHpNode: Node | null = null;
    private bossHpLabel: Label | null = null;
    private announcementNode: Node | null = null;
    private announcementLabel: Label | null = null;
    private announcementTimer = 0;
    private gameOverLayer: Node | null = null;
    private levelClearLayer: Node | null = null;
    private bombFlashNode: Node | null = null;
    private bombFlashTimer = 0;

    onLoad() {
        view.setDesignResolutionSize(750, 1334, ResolutionPolicy.SHOW_ALL);
        registerArtFrames(this.artFrames);
    }

    start() {
        profiler.hideStats();
        this.bindUI();
        this.buildBossHpBar();
        this.assetsReady = !!(this.playerNode && this.gameplayRoot && this.uiRoot && this.bulletLayer
            && this.enemyLayer && this.bossLayer && this.enemyBulletLayer && this.itemLayer
            && this.bulletPrefab && this.enemyPrefab);
        if (!this.assetsReady) {
            console.error('[RaidenLite] Game.scene 的 GameManager 节点引用不完整。');
            this.showAnnouncement('场景引用缺失，请重新打开 Game.scene', 60);
            return;
        }

        const scene = director.getScene();
        this.background = scene?.getComponentInChildren(StarField) ?? null;
        if (!this.background) {
            console.warn('[RaidenLite] 未找到 StarField，Mission 01 背景速度事件将被忽略。');
        }

        // GameManager 不再维护关卡秒表/事件游标，只消费 Director 发出的离散事件。
        this.stopMissionListener?.();
        this.stopMissionListener = MISSION01_DIRECTOR.onEvent((event) => this.handleMission01Event(event));

        this.playerControlEnabled = false;
        this.playerAutoFireEnabled = false;
        this.invulnerableTimer = 2;
        if (this.gameplayRoot) {
            this.gameplayOrigin.set(this.gameplayRoot.position.x, this.gameplayRoot.position.y, this.gameplayRoot.position.z);
        }
        this.showAnnouncement('AEGIS // 飞行组待命', 2.2);
        this.refreshHUD();
    }

    public get canControl(): boolean {
        return this.assetsReady
            && this.playerControlEnabled
            && this.gameState !== 'GAME_OVER'
            && this.gameState !== 'CLEAR';
    }

    update(deltaTime: number) {
        // 切回前台时不补算数秒的弹幕和波次；Mission01Director 使用同样的单帧上限。
        deltaTime = Math.min(deltaTime, 1 / 20);
        this.updateTransientUI(deltaTime);
        this.updateScreenShake(deltaTime);

        if (this.gameState === 'GAME_OVER' || this.gameState === 'CLEAR') {
            return;
        }
        if (!this.assetsReady || !this.playerNode || !isValid(this.playerNode, true)) {
            return;
        }

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= deltaTime;
        }
        const opacity = this.playerNode.getComponent(UIOpacity);
        if (opacity) opacity.opacity = this.invulnerableTimer > 0
            ? (Math.floor(this.invulnerableTimer * 10) % 2 ? 130 : 255) : 255;
        if (this.overdriveTimer > 0) {
            this.overdriveTimer -= deltaTime;
        }

        if (this.playerAutoFireEnabled) {
            this.shootTimer += deltaTime;
            const interval = this.getShootInterval();
            while (this.shootTimer >= interval) {
                this.shootTimer -= interval;
                this.shootPlayerWeapon();
            }
        } else {
            this.shootTimer = 0;
        }

        this.tickEnemyShooting(deltaTime);
        this.tickBossShooting(deltaTime);
        this.removeDestroyedObjects();

        // 玩家弹先拦截普通敌弹，再判断命中敌机。
        this.checkPlayerBulletVsEnemyBullets();
        this.checkPlayerBulletVsEnemies();
        this.checkPlayerBulletVsBoss();
        this.checkItemPickups();
        this.checkPlayerDamage();
    }

    // ---------- Mission 01 离散事件消费 ----------

    private handleMission01Event(event: Mission01Event) {
        switch (event.kind) {
            case 'SCROLL':
                this.background?.setScrollSpeedScale(event.speedScale, event.transition);
                break;
            case 'CONTROL':
                this.playerControlEnabled = event.enabled;
                this.playerAutoFireEnabled = event.autoFire;
                if (event.enabled) {
                    this.invulnerableTimer = Math.max(this.invulnerableTimer, 2);
                }
                break;
            case 'WAVE':
                this.spawnTimelineWave(event);
                break;
            case 'ELITE':
                this.spawnElite(event.x, event.dropKind as ItemKind | null, event.heavyBullet);
                break;
            case 'WARNING':
                this.beginBossWarning();
                break;
            case 'BOSS':
                this.spawnBoss();
                break;
            case 'STORY':
                this.handleStoryCue(event.cue);
                break;
        }
    }

    private spawnTimelineWave(event: Extract<Mission01Event, { kind: 'WAVE' }>) {
        switch (event.pattern) {
            case 'LINE':
                this.spawnLineWave(event.count, event.canShoot);
                break;
            case 'V':
                this.spawnVWave(event.count, event.canShoot);
                break;
            case 'DIAGONAL_CROSS':
                this.spawnDiagonalCross(event.count, event.canShoot);
                break;
            case 'SINE':
                this.spawnSineWave(event.count, event.canShoot);
                break;
        }
    }

    private handleStoryCue(cue: Mission01StoryCue) {
        switch (cue) {
            case 'MISSION_OPEN':
                this.showAnnouncement('AEGIS // AURORA 是现在我们唯一可以驾驶的战机之一', 4.0);
                break;
            case 'FORMATION_RUNWAY':
                this.showAnnouncement('AEGIS // VIPER、FALCON，编队进入跑道', 3.0);
                break;
            case 'TAKEOFF':
                this.showAnnouncement('AEGIS // AURORA，准许起飞', 2.5);
                this.shakeScreen(0.8, 3.5);
                break;
            case 'PLAYER_CONTROL':
                this.showAnnouncement('CONTROL ONLINE · 拖动移动 / 自动射击', 3.0);
                break;
            case 'AEGIS_REVEAL':
                this.showAnnouncement('AEGIS // 敌机群进入拦截区', 2.2);
                break;
            case 'BOSS_PREPARE':
                this.showAnnouncement('AEGIS // 基地大型目标正在启动', 2.8);
                break;
            case 'GOLIATH_ENTER':
                this.showAnnouncement('GOLIATH // TARGET CONFIRMED', 2.0);
                break;
            case 'FALCON_TARGETED':
            case 'FALCON_DAMAGED':
            case 'FALCON_DESTROYED':
            case 'VIPER_DAMAGED':
                // 僚机视觉由 Mission01Wingmen 读取同一个 Director；GameManager 不重复硬编码。
                console.info(`[Mission01] wingman cue: ${cue}`);
                break;
        }
    }

    private spawnLineWave(count: number, canShoot: boolean) {
        const gap = 600 / Math.max(1, count - 1);
        for (let i = 0; i < count; i += 1) {
            const x = count === 1 ? 0 : -300 + gap * i;
            this.spawnEnemy(x, 720 + (i % 2) * 55, {
                pattern: 'STRAIGHT',
                canShoot,
                bulletKind: 'NORMAL',
                shootInterval: 2.0,
            });
        }
    }

    private spawnVWave(count: number, canShoot: boolean) {
        const center = (count - 1) * 0.5;
        for (let i = 0; i < count; i += 1) {
            const offset = i - center;
            this.spawnEnemy(offset * 82, 715 + Math.abs(offset) * 58, {
                pattern: 'STRAIGHT',
                canShoot,
                bulletKind: 'NORMAL',
                shootInterval: 2.2,
            });
        }
    }

    private spawnDiagonalCross(count: number, canShoot: boolean) {
        for (let i = 0; i < count; i += 1) {
            const fromLeft = i % 2 === 0;
            const row = Math.floor(i / 2);
            this.spawnEnemy(fromLeft ? -315 : 315, 720 + row * 85, {
                pattern: fromLeft ? 'DIAGONAL_RIGHT' : 'DIAGONAL_LEFT',
                speed: 235,
                canShoot,
                bulletKind: 'NORMAL',
                shootInterval: 2.3,
            });
        }
    }

    private spawnSineWave(count: number, canShoot: boolean) {
        for (let i = 0; i < count; i += 1) {
            const x = -250 + i * (500 / Math.max(1, count - 1));
            this.spawnEnemy(x, 720 + (i % 3) * 75, {
                pattern: 'SINE',
                speed: 205,
                canShoot,
                bulletKind: 'NORMAL',
                shootInterval: 1.9,
            });
        }
    }

    private spawnElite(x: number, dropKind: ItemKind | null, heavyBullet: boolean) {
        this.spawnEnemy(x, 730, {
            pattern: 'SINE',
            speed: 175,
            hp: 4,
            score: 300,
            canShoot: true,
            bulletKind: heavyBullet ? 'HEAVY' : 'NORMAL',
            shootInterval: heavyBullet ? 1.65 : 1.9,
            dropKind,
            elite: true,
        });
    }

    private spawnEnemy(x: number, y: number, setup: EnemySetup) {
        if (!this.enemyLayer || this.gameState === 'WARNING' || this.gameState === 'BOSS') {
            return;
        }

        const enemyNode = this.enemyPrefab ? instantiate(this.enemyPrefab) : new Node('Enemy');
        enemyNode.name = setup.elite ? 'EliteEnemy' : 'Enemy';
        enemyNode.layer = this.node.layer;
        this.enemyLayer.addChild(enemyNode);
        enemyNode.setPosition(x, y, 0);

        let enemy = enemyNode.getComponent(Enemy);
        if (!enemy) {
            enemy = enemyNode.addComponent(Enemy);
        }
        enemy.setup(setup);
        this.enemies.push(enemy);
    }

    private beginBossWarning() {
        if (this.gameState !== 'PLAYING') {
            return;
        }
        this.gameState = 'WARNING';
        this.clearRegularEnemies(false);
        this.clearEnemyBullets();
        if (this.warningNode) {
            this.warningNode.active = true;
        }
        this.showAnnouncement('敌方旗舰接近 · 准备迎战', 2.6);
    }

    private spawnBoss() {
        if (!this.bossLayer || this.gameState === 'GAME_OVER') {
            return;
        }
        this.gameState = 'BOSS';
        if (this.warningNode) {
            this.warningNode.active = false;
        }

        const bossNode = new Node('Boss');
        bossNode.layer = this.node.layer;
        this.bossLayer.addChild(bossNode);
        bossNode.setPosition(0, 735, 0);
        this.boss = bossNode.addComponent(Boss);
        this.bossShotTimer = 1.1;
        this.bossPatternIndex = 0;
        if (this.bossHpNode) {
            this.bossHpNode.active = true;
        }
        this.refreshBossHP();
    }

    // ---------- 玩家武器 ----------

    private getShootInterval(): number {
        const base = this.currentWeapon === 'LASER' ? 0.20 : this.currentWeapon === 'SPREAD' ? 0.16 : 0.15;
        return this.overdriveTimer > 0 ? base * 0.68 : base;
    }

    private shootPlayerWeapon() {
        if (!this.playerNode || !this.bulletLayer || !isValid(this.playerNode, true)) {
            return;
        }
        const pos = this.playerNode.position;
        const originY = pos.y + 91;

        if (this.currentWeapon === 'NORMAL') {
            const counts = [1, 2, 3, 4, 5];
            const count = counts[this.powerLevel - 1];
            for (let i = 0; i < count; i += 1) {
                const offset = (i - (count - 1) * 0.5) * 15;
                this.spawnPlayerBullet(pos.x + offset, originY, 0, 1, 'NORMAL', null);
            }
            return;
        }

        if (this.currentWeapon === 'SPREAD') {
            const anglesByLevel: number[][] = [
                [-12, 0, 12],
                [-20, -10, 0, 10, 20],
                [-28, -18, -9, 0, 9, 18, 28],
                [-32, -24, -16, -8, 0, 8, 16, 24, 32],
                [-38, -30, -22, -15, -8, 0, 8, 15, 22, 30, 38],
            ];
            const angles = anglesByLevel[this.powerLevel - 1];
            for (const angle of angles) {
                this.spawnPlayerBullet(pos.x, originY, angle, 0.58, 'SPREAD', null);
            }
            return;
        }

        const laserCounts = [1, 1, 2, 2, 3];
        const count = laserCounts[this.powerLevel - 1];
        for (let i = 0; i < count; i += 1) {
            const offset = (i - (count - 1) * 0.5) * 18;
            const target = this.findHomingTarget(pos.x + offset, originY);
            this.spawnPlayerBullet(pos.x + offset, originY, 0, 1.7 + (this.powerLevel - 1) * 0.25, 'LASER', target);
        }
    }

    private spawnPlayerBullet(x: number, y: number, angle: number, damage: number, style: PlayerBulletStyle, target: Node | null) {
        if (!this.bulletLayer) {
            return;
        }
        const bulletNode = this.bulletPrefab ? instantiate(this.bulletPrefab) : new Node('Bullet');
        bulletNode.name = style === 'LASER' ? 'HomingLaser' : 'Bullet';
        bulletNode.layer = this.node.layer;
        this.bulletLayer.addChild(bulletNode);
        bulletNode.setPosition(x, y, 0);

        let bullet = bulletNode.getComponent(Bullet);
        if (!bullet) {
            bullet = bulletNode.addComponent(Bullet);
        }
        bullet.setup(angle, damage, style, target);
        this.bullets.push(bullet);
    }

    private findHomingTarget(x: number, y: number): Node | null {
        let best: Node | null = null;
        let bestDistance = Number.MAX_VALUE;

        for (const enemy of this.enemies) {
            if (enemy.dead || !isValid(enemy.node, true)) {
                continue;
            }
            const p = enemy.node.position;
            const dx = p.x - x;
            const dy = p.y - y;
            const d = dx * dx + dy * dy;
            if (d < bestDistance) {
                bestDistance = d;
                best = enemy.node;
            }
        }

        if (this.boss && !this.boss.dead && isValid(this.boss.node, true)) {
            const p = this.boss.node.position;
            const dx = p.x - x;
            const dy = p.y - y;
            const d = dx * dx + dy * dy;
            if (d < bestDistance) {
                best = this.boss.node;
            }
        }
        return best;
    }

    public toggleWeapon() {
        if (!this.canControl) return;
        const available: WeaponKind[] = ['NORMAL'];
        if (this.spreadUnlocked) {
            available.push('SPREAD');
        }
        if (this.laserUnlocked) {
            available.push('LASER');
        }
        if (available.length <= 1) {
            this.showAnnouncement('先获取 S 或 L 武器', 1.3);
            return;
        }
        const currentIndex = available.indexOf(this.currentWeapon);
        this.currentWeapon = available[(currentIndex + 1) % available.length];
        this.shootTimer = 0;
        this.refreshHUD();
        this.showAnnouncement(`WEAPON: ${this.weaponShortName()}`, 1.0);
    }

    // ---------- 敌方射击 ----------

    private tickEnemyShooting(deltaTime: number) {
        if (this.gameState !== 'PLAYING') {
            return;
        }
        for (const enemy of this.enemies) {
            if (!enemy.dead && enemy.tickShoot(deltaTime) && isValid(enemy.node, true)) {
                this.spawnEnemyShot(enemy);
            }
        }
    }

    private spawnEnemyShot(enemy: Enemy) {
        if (!this.playerNode) {
            return;
        }
        const origin = enemy.node.position;
        if (enemy.bulletKind === 'NORMAL') {
            this.spawnEnemyBullet(origin.x, origin.y - enemy.halfHeight, 'NORMAL', 0, -345);
            return;
        }

        const player = this.playerNode.position;
        const dx = player.x - origin.x;
        const dy = player.y - origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 305;
        this.spawnEnemyBullet(
            origin.x,
            origin.y - enemy.halfHeight,
            'HEAVY',
            dx / distance * speed,
            dy / distance * speed,
        );
    }

    private tickBossShooting(deltaTime: number) {
        if (this.gameState !== 'BOSS' || !this.boss || this.boss.dead || !this.boss.entered) {
            return;
        }
        this.bossShotTimer -= deltaTime;
        if (this.bossShotTimer > 0) {
            return;
        }
        this.bossShotTimer = this.bossPatternIndex % 3 === 1 ? 1.65 : 1.25;
        this.spawnBossPattern(this.bossPatternIndex);
        this.bossPatternIndex += 1;
    }

    private spawnBossPattern(index: number) {
        if (!this.boss || !this.playerNode) {
            return;
        }
        const pos = this.boss.node.position;
        const originY = pos.y - 58;
        const pattern = index % 3;

        if (pattern === 0) {
            for (const vx of [-160, -80, 0, 80, 160]) {
                this.spawnEnemyBullet(pos.x, originY, 'NORMAL', vx, -345);
            }
            return;
        }

        if (pattern === 1) {
            const player = this.playerNode.position;
            const dx = player.x - pos.x;
            const dy = player.y - originY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const baseX = dx / dist;
            const baseY = dy / dist;
            for (const offset of [-0.16, 0, 0.16]) {
                const cos = Math.cos(offset);
                const sin = Math.sin(offset);
                const rx = baseX * cos - baseY * sin;
                const ry = baseX * sin + baseY * cos;
                this.spawnEnemyBullet(pos.x, originY, 'HEAVY', rx * 300, ry * 300);
            }
            return;
        }

        for (const vx of [-210, -140, -70, 0, 70, 140, 210]) {
            this.spawnEnemyBullet(pos.x, originY, 'NORMAL', vx, -330);
        }
        this.spawnEnemyBullet(pos.x - 65, originY, 'HEAVY', -45, -285);
        this.spawnEnemyBullet(pos.x + 65, originY, 'HEAVY', 45, -285);
    }

    private spawnEnemyBullet(x: number, y: number, kind: EnemyBulletKind, vx: number, vy: number) {
        if (!this.enemyBulletLayer) {
            return;
        }
        const node = new Node(`${kind}EnemyBullet`);
        node.layer = this.node.layer;
        this.enemyBulletLayer.addChild(node);
        node.setPosition(x, y, 0);
        const bullet = node.addComponent(EnemyBullet);
        bullet.setup(kind, vx, vy);
        this.enemyBullets.push(bullet);
    }

    // ---------- 碰撞 ----------

    private checkPlayerBulletVsEnemyBullets() {
        for (const bullet of this.bullets) {
            if (bullet.dead || !isValid(bullet.node, true)) {
                continue;
            }
            const bp = bullet.node.position;
            for (const enemyBullet of this.enemyBullets) {
                if (enemyBullet.dead || !enemyBullet.interceptable || !isValid(enemyBullet.node, true)) {
                    continue;
                }
                const ep = enemyBullet.node.position;
                const hitX = Math.abs(bp.x - ep.x) <= bullet.halfWidth + enemyBullet.radius;
                const hitY = Math.abs(bp.y - ep.y) <= bullet.halfHeight + enemyBullet.radius;
                if (hitX && hitY) {
                    bullet.destroySelf();
                    enemyBullet.destroySelf();
                    break;
                }
            }
        }
    }

    private checkPlayerBulletVsEnemies() {
        for (const bullet of this.bullets) {
            if (bullet.dead || !isValid(bullet.node, true)) {
                continue;
            }
            const bp = bullet.node.position;
            for (const enemy of this.enemies) {
                if (enemy.dead || !isValid(enemy.node, true)) {
                    continue;
                }
                const ep = enemy.node.position;
                const hitX = Math.abs(bp.x - ep.x) <= bullet.halfWidth + enemy.halfWidth;
                const hitY = Math.abs(bp.y - ep.y) <= bullet.halfHeight + enemy.halfHeight;
                if (!hitX || !hitY) {
                    continue;
                }
                bullet.destroySelf();
                this.damageEnemy(enemy, bullet.damage);
                break;
            }
        }
    }

    private checkPlayerBulletVsBoss() {
        if (!this.boss || this.boss.dead || !isValid(this.boss.node, true)) {
            return;
        }
        const bossPos = this.boss.node.position;
        for (const bullet of this.bullets) {
            if (bullet.dead || !isValid(bullet.node, true)) {
                continue;
            }
            const bp = bullet.node.position;
            const hitX = Math.abs(bp.x - bossPos.x) <= bullet.halfWidth + this.boss.halfWidth;
            const hitY = Math.abs(bp.y - bossPos.y) <= bullet.halfHeight + this.boss.halfHeight;
            if (!hitX || !hitY) {
                continue;
            }
            bullet.destroySelf();
            this.boss.flashHit();
            if (this.boss.takeDamage(bullet.damage)) {
                this.addScore(this.boss.scoreValue);
                this.spawnExplosion(bossPos.x, bossPos.y, 130, new Color(255, 200, 140, 255));
                this.shakeScreen(0.55, 14);
                this.finishLevel();
                return;
            }
            this.refreshBossHP();
        }
    }

    private damageEnemy(enemy: Enemy, damage: number) {
        if (enemy.dead || !isValid(enemy.node, true)) {
            return;
        }
        const pos = enemy.node.position;
        const dropKind = enemy.dropKind;
        const score = enemy.scoreValue;
        enemy.flashHit();
        if (enemy.takeDamage(damage)) {
            this.addScore(score);
            this.spawnExplosion(pos.x, pos.y, enemy.elite ? 64 : 44,
                enemy.elite ? new Color(255, 170, 90, 255) : new Color(255, 210, 120, 255));
            if (dropKind) {
                this.spawnItem(pos.x, pos.y, dropKind);
            }
        }
    }

    private checkItemPickups() {
        if (!this.playerNode) {
            return;
        }
        const pp = this.playerNode.position;
        for (const item of this.items) {
            if (item.dead || !isValid(item.node, true)) {
                continue;
            }
            const ip = item.node.position;
            const dx = pp.x - ip.x;
            const dy = pp.y - ip.y;
            const pickupRadius = item.radius + 34;
            if (dx * dx + dy * dy <= pickupRadius * pickupRadius) {
                const kind = item.kind;
                item.destroySelf();
                this.applyItem(kind);
            }
        }
    }

    private checkPlayerDamage() {
        if (!this.playerNode || this.invulnerableTimer > 0) {
            return;
        }
        const pp = this.playerNode.position;

        for (const bullet of this.enemyBullets) {
            if (bullet.dead || !isValid(bullet.node, true)) {
                continue;
            }
            const bp = bullet.node.position;
            const dx = pp.x - bp.x;
            const dy = pp.y - bp.y;
            const radius = this.playerHitRadius + bullet.radius;
            if (dx * dx + dy * dy <= radius * radius) {
                this.endGame();
                return;
            }
        }

        for (const enemy of this.enemies) {
            if (enemy.dead || !isValid(enemy.node, true)) {
                continue;
            }
            const ep = enemy.node.position;
            if (this.circleHitsBox(pp.x, pp.y, this.playerHitRadius, ep.x, ep.y, enemy.halfWidth, enemy.halfHeight)) {
                this.endGame();
                return;
            }
        }

        if (this.boss && !this.boss.dead && isValid(this.boss.node, true)) {
            const bp = this.boss.node.position;
            if (this.circleHitsBox(pp.x, pp.y, this.playerHitRadius, bp.x, bp.y, this.boss.halfWidth, this.boss.halfHeight)) {
                this.endGame();
            }
        }
    }

    private circleHitsBox(cx: number, cy: number, radius: number, bx: number, by: number, halfW: number, halfH: number): boolean {
        const closestX = Math.max(bx - halfW, Math.min(cx, bx + halfW));
        const closestY = Math.max(by - halfH, Math.min(cy, by + halfH));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return dx * dx + dy * dy <= radius * radius;
    }

    // ---------- 道具 / Bomb ----------

    private spawnItem(x: number, y: number, kind: ItemKind) {
        if (!this.itemLayer) {
            return;
        }
        const node = new Node(`${kind}Item`);
        node.layer = this.node.layer;
        this.itemLayer.addChild(node);
        node.setPosition(x, y, 0);
        const item = node.addComponent(PowerItem);
        item.setup(kind);
        this.items.push(item);
    }

    private applyItem(kind: ItemKind) {
        if (kind === 'P') {
            if (this.powerLevel < this.maxPower) {
                this.powerLevel += 1;
                this.showAnnouncement(`POWER UP  Lv.${this.powerLevel}`, 1.4);
            } else {
                this.overdriveTimer = Math.max(this.overdriveTimer, 6);
                this.showAnnouncement('POWER MAX  OVERDRIVE!', 1.4);
            }
        } else if (kind === 'S') {
            if (!this.spreadUnlocked) {
                this.spreadUnlocked = true;
                this.showAnnouncement('S 散射已解锁 · 点击武器切换', 1.8);
            } else {
                this.overdriveTimer = Math.max(this.overdriveTimer, 8);
                this.showAnnouncement('SPREAD OVERDRIVE!', 1.4);
            }
        } else if (kind === 'L') {
            if (!this.laserUnlocked) {
                this.laserUnlocked = true;
                this.showAnnouncement('L 追踪激光已解锁 · 点击武器切换', 1.8);
            } else {
                this.overdriveTimer = Math.max(this.overdriveTimer, 8);
                this.showAnnouncement('LASER OVERDRIVE!', 1.4);
            }
        } else {
            this.bombs = Math.min(9, this.bombs + 1);
            this.showAnnouncement(`BOMB +1   B × ${this.bombs}`, 1.4);
        }
        this.refreshHUD();
    }

    public useBomb() {
        if (this.bombs <= 0 || this.gameState === 'GAME_OVER' || this.gameState === 'CLEAR') {
            return;
        }
        this.bombs -= 1;
        this.invulnerableTimer = 2.2;
        this.clearEnemyBullets();

        for (const enemy of [...this.enemies]) {
            if (!enemy.dead) {
                this.damageEnemy(enemy, 6);
            }
        }
        if (this.boss && !this.boss.dead && isValid(this.boss.node, true)) {
            const bossPos = this.boss.node.position;
            this.boss.flashHit();
            if (this.boss.takeDamage(18)) {
                this.addScore(this.boss.scoreValue);
                this.spawnExplosion(bossPos.x, bossPos.y, 130, new Color(255, 200, 140, 255));
                this.shakeScreen(0.55, 14);
                this.finishLevel();
            } else {
                this.refreshBossHP();
            }
        }

        this.shakeScreen(0.32, 10);
        this.bombFlashTimer = 0.25;
        if (this.bombFlashNode) {
            this.bombFlashNode.active = true;
        }
        this.showAnnouncement('BOMB!', 0.8);
        this.refreshHUD();
    }

    // ---------- UI ----------

    private bindUI() {
        if (!this.uiRoot) return;
        const label = (path: string) => this.uiRoot!.getChildByPath(path)?.getComponent(Label) ?? null;
        const node = (name: string) => this.uiRoot!.getChildByName(name);
        this.scoreLabel = label('Score');
        this.statusLabel = label('Weapon');
        this.weaponButtonLabel = label('WeaponButton/Label');
        this.bombButtonLabel = label('BombButton/Label');
        this.warningNode = node('Warning');
        this.bossHpNode = node('BossHP');
        this.bossHpLabel = label('BossHP');
        this.announcementNode = node('Announcement');
        this.announcementLabel = label('Announcement');
        this.gameOverLayer = node('GameOver');
        this.levelClearLayer = node('LevelClear');
        this.bombFlashNode = node('BombFlash');
        node('WeaponButton')?.on(Button.EventType.CLICK, this.toggleWeapon, this);
        node('BombButton')?.on(Button.EventType.CLICK, this.useBomb, this);
        this.gameOverLayer?.getChildByName('RestartButton')?.on(Button.EventType.CLICK, this.restartGame, this);
        this.levelClearLayer?.getChildByName('RestartButton')?.on(Button.EventType.CLICK, this.restartGame, this);
        for (const panel of [this.warningNode, this.bossHpNode, this.announcementNode,
            this.gameOverLayer, this.levelClearLayer, this.bombFlashNode]) {
            if (panel) panel.active = false;
        }
    }

    private refreshHUD() {
        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE: ${this.score}`;
        }
        if (this.statusLabel) {
            const overdrive = this.overdriveTimer > 0 ? '  MAX!' : '';
            this.statusLabel.string = `${this.weaponShortName()}  POWER ${this.powerLevel === 5 ? 'MAX' : 'Lv.' + this.powerLevel}${overdrive}`;
        }
        if (this.weaponButtonLabel) {
            this.weaponButtonLabel.string = `武器 ${this.weaponShortName()}`;
        }
        if (this.bombButtonLabel) {
            this.bombButtonLabel.string = `BOMB × ${this.bombs}`;
        }
    }

    private weaponShortName(): string {
        return this.currentWeapon === 'SPREAD' ? 'S' : this.currentWeapon === 'LASER' ? 'L' : 'N';
    }

    private refreshBossHP() {
        if (!this.bossHpLabel || !this.boss) {
            return;
        }
        const percent = Math.max(0, Math.ceil(this.boss.hp / this.boss.maxHp * 100));
        this.bossHpLabel.string = `BOSS HP: ${percent}%`;
        this.refreshBossHpBar();
    }

    private showAnnouncement(text: string, seconds: number) {
        if (!this.announcementNode || !this.announcementLabel) {
            return;
        }
        this.announcementLabel.string = text;
        this.announcementNode.active = true;
        this.announcementTimer = seconds;
    }

    private updateTransientUI(deltaTime: number) {
        if (this.announcementTimer > 0) {
            this.announcementTimer -= deltaTime;
            if (this.announcementTimer <= 0 && this.announcementNode) {
                this.announcementNode.active = false;
            }
        }
        if (this.bombFlashTimer > 0) {
            this.bombFlashTimer -= deltaTime;
            if (this.bombFlashTimer <= 0 && this.bombFlashNode) {
                this.bombFlashNode.active = false;
            }
        }
        this.refreshHUD();
    }

    // ---------- 流程 ----------

    private addScore(value: number) {
        this.score += value;
        this.refreshHUD();
    }

    private endGame() {
        if (this.gameState === 'GAME_OVER' || this.gameState === 'CLEAR') {
            return;
        }
        this.gameState = 'GAME_OVER';
        const pos = this.playerNode ? this.playerNode.position : null;
        if (pos) {
            this.spawnExplosion(pos.x, pos.y, 96, new Color(255, 130, 110, 255));
        }
        this.shakeScreen(0.5, 16);
        this.freezeCombat();
        if (this.playerNode && isValid(this.playerNode, true)) {
            this.playerNode.active = false;
        }
        if (this.gameOverLayer) {
            this.updateOverlayScore(this.gameOverLayer);
            this.gameOverLayer.active = true;
            this.gameOverLayer.setSiblingIndex((this.uiRoot?.children.length ?? 1) - 1);
        }
    }

    private finishLevel() {
        if (this.gameState === 'CLEAR') {
            return;
        }
        this.gameState = 'CLEAR';
        this.clearEnemyBullets();
        this.freezeCombat();
        if (this.bossHpNode) {
            this.bossHpNode.active = false;
        }
        if (this.levelClearLayer) {
            this.updateOverlayScore(this.levelClearLayer);
            this.levelClearLayer.active = true;
            this.levelClearLayer.setSiblingIndex((this.uiRoot?.children.length ?? 1) - 1);
        }
    }

    private updateOverlayScore(layer: Node) {
        for (const child of layer.children) {
            if (child.name.endsWith('Score')) {
                const label = child.getComponent(Label);
                if (label) {
                    label.string = `SCORE: ${this.score}`;
                }
            }
        }
    }

    private freezeCombat() {
        for (const bullet of this.bullets) {
            bullet.enabled = false;
        }
        for (const enemy of this.enemies) {
            enemy.enabled = false;
        }
        for (const bullet of this.enemyBullets) {
            bullet.enabled = false;
        }
        for (const item of this.items) {
            item.enabled = false;
        }
        if (this.boss && isValid(this.boss, true)) this.boss.enabled = false;
        if (this.gameplayRoot) this.gameplayRoot.active = false;
    }

    private clearRegularEnemies(withScore: boolean) {
        for (const enemy of this.enemies) {
            if (enemy.dead || !isValid(enemy.node, true)) {
                continue;
            }
            if (withScore) {
                this.addScore(enemy.scoreValue);
            }
            if (enemy.dropKind) this.spawnItem(enemy.node.position.x, enemy.node.position.y, enemy.dropKind);
            enemy.destroySelf();
        }
    }

    private clearEnemyBullets() {
        for (const bullet of this.enemyBullets) {
            if (!bullet.dead && isValid(bullet.node, true)) {
                bullet.destroySelf();
            }
        }
    }

    private removeDestroyedObjects() {
        this.bullets = this.bullets.filter((bullet) => !bullet.dead && isValid(bullet.node, true));
        this.enemies = this.enemies.filter((enemy) => !enemy.dead && isValid(enemy.node, true));
        this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.dead && isValid(bullet.node, true));
        this.items = this.items.filter((item) => !item.dead && isValid(item.node, true));
    }

    private restartGame() {
        if (this.restarting) {
            return;
        }
        this.restarting = true;
        const currentScene = director.getScene();
        if (currentScene) {
            director.loadScene(currentScene.name, (error) => {
                if (error) {
                    this.restarting = false;
                    console.error('[RaidenLite] 重新开始失败', error);
                }
            });
        }
    }

    // ---------- 视觉反馈 ----------

    private spawnExplosion(x: number, y: number, peak: number, tint: Color) {
        if (!this.bulletLayer) {
            return;
        }
        const node = new Node('Explosion');
        node.layer = this.node.layer;
        this.bulletLayer.addChild(node);
        node.setPosition(x, y, 0);
        const ex = node.addComponent(Explosion);
        ex.setup(peak, 0.45, tint);
    }

    public shakeScreen(duration: number, amplitude: number) {
        if (duration <= 0 || amplitude <= 0) {
            return;
        }
        if (duration > this.shakeTimer) {
            this.shakeTimer = duration;
            this.shakeAmplitude = amplitude;
        }
    }

    private updateScreenShake(deltaTime: number) {
        if (!this.gameplayRoot) {
            return;
        }
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            if (this.shakeTimer <= 0) {
                this.gameplayRoot.setPosition(this.gameplayOrigin.x, this.gameplayOrigin.y, this.gameplayOrigin.z);
                this.shakeOffset.set(0, 0, 0);
                return;
            }
            const t = this.shakeTimer;
            const amp = this.shakeAmplitude * t;
            this.shakeOffset.x = (Math.random() - 0.5) * 2 * amp;
            this.shakeOffset.y = (Math.random() - 0.5) * 2 * amp;
            this.gameplayRoot.setPosition(
                this.gameplayOrigin.x + this.shakeOffset.x,
                this.gameplayOrigin.y + this.shakeOffset.y,
                this.gameplayOrigin.z,
            );
        }
    }

    private buildBossHpBar() {
        if (!this.bossHpNode) {
            return;
        }
        this.bossHpNode.removeAllChildren();
        const barWidth = 480;
        const barHeight = 14;
        const bg = new Node('Bg');
        bg.layer = this.bossHpNode.layer;
        this.bossHpNode.addChild(bg);
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(barWidth, barHeight);
        bg.setPosition(0, -28, 0);
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSprite.trim = false;
        bgSprite.color = new Color(20, 28, 36, 230);
        bg.addComponent(UIOpacity).opacity = 255;
        applyArtSprite(bg, 'art/ui_white', barWidth, barHeight, '__BgArt', 255);

        const fill = new Node('Fill');
        fill.layer = this.bossHpNode.layer;
        this.bossHpNode.addChild(fill);
        const fillTransform = fill.addComponent(UITransform);
        fillTransform.setContentSize(barWidth, barHeight);
        fill.setPosition(0, -28, 0);
        const fillSprite = fill.addComponent(Sprite);
        fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        fillSprite.trim = false;
        fillSprite.color = new Color(255, 96, 80, 255);
        fillSprite.fillType = Sprite.FillType.HORIZONTAL;
        fillSprite.fillCenter = new Vec2(0, 0.5);
        fillSprite.fillStart = 0;
        fillSprite.fillRange = 1;
        fill.addComponent(UIOpacity).opacity = 255;
        applyArtSprite(fill, 'art/ui_white', barWidth, barHeight, '__FillArt', 255);

        this.bossHpBarBg = bgSprite;
        this.bossHpBarFill = fillSprite;
        this.bossHpBarFillTransform = fillTransform;
    }

    private refreshBossHpBar() {
        if (!this.boss || !this.bossHpBarFill || !this.bossHpBarFillTransform) {
            return;
        }
        const ratio = Math.max(0, Math.min(1, this.boss.hp / this.boss.maxHp));
        const fullWidth = 480;
        const targetWidth = fullWidth * ratio;
        this.bossHpBarFill.fillRange = ratio;
        if (targetWidth > 0.5) {
            this.bossHpBarFillTransform.setContentSize(targetWidth, 14);
        }
        const low = ratio < 0.3;
        this.bossHpBarFill.color = low ? new Color(255, 200, 120, 255) : new Color(255, 96, 80, 255);
    }

    onDestroy() {
        this.stopMissionListener?.();
        this.stopMissionListener = null;
    }
}
