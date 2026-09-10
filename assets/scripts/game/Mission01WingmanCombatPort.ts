import {
    Mission01WingmanCombatScheduler,
    Mission01WingmanFireOrder,
    Mission01WingmanId,
} from './Mission01WingmanCombat';

export interface Mission01WingmanPose {
    x: number;
    y: number;
    angleDegrees: number;
    active: boolean;
}

/**
 * Presentation / Gameplay 之间的唯一僚机战斗桥。
 *
 * Presentation 提供当前机位；Gameplay 负责把 fire order 变成真实弹体并纳入
 * 现有碰撞、伤害、计分和掉落系统。Core 不直接遍历 Enemy，也不绕过 GameManager。
 */
export interface Mission01WingmanCombatHooks {
    getWingmanPose(actor: Mission01WingmanId): Mission01WingmanPose | null;
    fireWingman(order: Mission01WingmanFireOrder, pose: Mission01WingmanPose): void;
}

export class Mission01WingmanCombatPort {
    private connected = false;

    constructor(
        private readonly hooks: Mission01WingmanCombatHooks,
        private readonly scheduler = new Mission01WingmanCombatScheduler(),
    ) {}

    /**
     * 首次接入只同步当前射击槽位，不补发过去的射击。
     */
    public connect() {
        if (this.connected) return;
        this.scheduler.sync();
        this.connected = true;
    }

    public dispose() {
        this.connected = false;
        this.scheduler.reset();
    }

    public tick() {
        if (!this.connected) return;
        for (const order of this.scheduler.poll()) {
            const pose = this.hooks.getWingmanPose(order.actor);
            if (!pose?.active) continue;
            this.hooks.fireWingman(order, pose);
        }
    }
}
