import { falconState, viperState } from './Mission01ActorState';
import { MISSION01_DIRECTOR, Mission01Director } from './Mission01Director';

export type Mission01WingmanId = 'VIPER' | 'FALCON';
export type Mission01WingmanAimMode = 'NEAREST_AHEAD' | 'PRIORITY_THREAT';

export interface Mission01WingmanFireOrder {
    actor: Mission01WingmanId;
    phase: string;
    aimMode: Mission01WingmanAimMode;
    damage: number;
    projectileSpeed: number;
    spreadDegrees: number;
    /** 当前 phase 内的确定性射击槽位，用于调试和回放检查。 */
    slot: number;
    issuedAt: number;
}

interface FireProfile {
    phase: string;
    interval: number;
    firstDelay: number;
    aimMode: Mission01WingmanAimMode;
    damage: number;
    projectileSpeed: number;
    spreadDegrees: number;
}

interface ActorScheduleState {
    key: string | null;
}

const VIPER_ACTIVE: FireProfile = {
    phase: 'ACTIVE',
    interval: 0.58,
    firstDelay: 0.34,
    aimMode: 'NEAREST_AHEAD',
    damage: 0.18,
    projectileSpeed: 780,
    spreadDegrees: 0,
};

const FALCON_ACTIVE: FireProfile = {
    phase: 'ACTIVE',
    interval: 0.64,
    firstDelay: 0.46,
    aimMode: 'NEAREST_AHEAD',
    damage: 0.20,
    projectileSpeed: 820,
    spreadDegrees: 0,
};

const FALCON_INTERCEPT: FireProfile = {
    phase: 'INTERCEPT',
    interval: 0.38,
    firstDelay: 0.14,
    aimMode: 'PRIORITY_THREAT',
    damage: 0.24,
    projectileSpeed: 860,
    spreadDegrees: 2.5,
};

/**
 * Mission 01 僚机战斗调度器。
 *
 * 关键原则：
 * - 不维护第二套剧情 elapsed，也不靠累加 deltaTime 控制射速；
 * - 直接使用 Director 时间 + Actor State 的 phase elapsed 计算射击槽位；
 * - 单次 poll 每架僚机最多发一个 order，掉帧/切后台/倍速不会补打一串子弹；
 * - DAMAGED / DESTROYED / WITHDRAWING / WITHDRAWN 等状态天然没有 FireProfile，因此自动停火；
 * - 本层只生成“射击意图”，真实弹体、命中、计分和掉落仍由 Gameplay 侧执行。
 */
export class Mission01WingmanCombatScheduler {
    private lastTime = Number.NEGATIVE_INFINITY;
    private readonly schedule: Record<Mission01WingmanId, ActorScheduleState> = {
        VIPER: { key: null },
        FALCON: { key: null },
    };

    constructor(private readonly director: Mission01Director = MISSION01_DIRECTOR) {}

    /**
     * 在接入时或 seek 后调用：同步到当前槽位但不补发旧射击。
     */
    public sync() {
        this.lastTime = this.director.time;
        this.schedule.VIPER.key = this.currentKey('VIPER');
        this.schedule.FALCON.key = this.currentKey('FALCON');
    }

    public reset() {
        this.lastTime = Number.NEGATIVE_INFINITY;
        this.schedule.VIPER.key = null;
        this.schedule.FALCON.key = null;
    }

    /** 返回本帧应该交给 Gameplay 的射击意图。 */
    public poll(): Mission01WingmanFireOrder[] {
        const now = this.director.time;

        // 时间倒退通常意味着调试 seek / restart。先静默同步，绝不重播旧槽位。
        if (now < this.lastTime) {
            this.sync();
            return [];
        }
        this.lastTime = now;

        const orders: Mission01WingmanFireOrder[] = [];
        const viper = this.buildOrder('VIPER');
        if (viper) orders.push(viper);
        const falcon = this.buildOrder('FALCON');
        if (falcon) orders.push(falcon);
        return orders;
    }

    private buildOrder(actor: Mission01WingmanId): Mission01WingmanFireOrder | null {
        const state = actor === 'VIPER' ? viperState(this.director) : falconState(this.director);
        const profile = this.profileFor(actor, state.phase);

        if (!profile || state.elapsed < profile.firstDelay) {
            this.schedule[actor].key = null;
            return null;
        }

        const slot = Math.floor((state.elapsed - profile.firstDelay) / profile.interval);
        const key = `${state.phase}:${slot}`;
        if (this.schedule[actor].key === key) return null;

        // 只记录当前槽位，不遍历 missed slots：一次 poll 最多一个 order。
        this.schedule[actor].key = key;
        return {
            actor,
            phase: state.phase,
            aimMode: profile.aimMode,
            damage: profile.damage,
            projectileSpeed: profile.projectileSpeed,
            spreadDegrees: profile.spreadDegrees,
            slot,
            issuedAt: this.director.time,
        };
    }

    private currentKey(actor: Mission01WingmanId): string | null {
        const state = actor === 'VIPER' ? viperState(this.director) : falconState(this.director);
        const profile = this.profileFor(actor, state.phase);
        if (!profile || state.elapsed < profile.firstDelay) return null;
        const slot = Math.floor((state.elapsed - profile.firstDelay) / profile.interval);
        return `${state.phase}:${slot}`;
    }

    private profileFor(actor: Mission01WingmanId, phase: string): FireProfile | null {
        if (actor === 'VIPER') {
            return phase === VIPER_ACTIVE.phase ? VIPER_ACTIVE : null;
        }
        if (phase === FALCON_INTERCEPT.phase) return FALCON_INTERCEPT;
        if (phase === FALCON_ACTIVE.phase) return FALCON_ACTIVE;
        return null;
    }
}
