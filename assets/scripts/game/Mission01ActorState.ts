import { Mission01Director } from './Mission01Director';

export type AuroraFlightPhase = 'READY' | 'ROLLING' | 'LIFTING' | 'AIRBORNE';
export type FalconPhase = 'FORMATION' | 'ACTIVE' | 'INTERCEPT' | 'DAMAGED' | 'DESTROYED';
export type ViperPhase = 'FORMATION' | 'ACTIVE' | 'WITHDRAWING' | 'WITHDRAWN';
export type GoliathPhase = 'GROUNDED' | 'LIFTING' | 'ENGAGED';

export interface DirectedActorState<TPhase extends string> {
    phase: TPhase;
    /** 当前 phase 的归一化剧情进度。无固定时长的稳定态为 0 或 1。 */
    progress: number;
    /** 当前 phase 已持续的导演时间；稳定态也可用于表现层做呼吸/脉冲。 */
    elapsed: number;
}

/**
 * 把 Timeline/Sequence 的时间语义转换成“演员状态”。
 *
 * Presentation 和未来 Gameplay 行为都只消费这些状态，避免各自重复 hasReached()/秒点判断。
 * 例如 FALCON 的视觉偏转和未来僚机射击停用会同时看到 DAMAGED/DESTROYED。
 */
export function auroraFlightState(director: Mission01Director): DirectedActorState<AuroraFlightPhase> {
    if (!director.hasReached('FORMATION_RUNWAY')) {
        return { phase: 'READY', progress: 0, elapsed: director.time };
    }
    if (!director.hasReached('TAKEOFF')) {
        return {
            phase: 'ROLLING',
            progress: director.progress('FORMATION'),
            elapsed: director.since('FORMATION_RUNWAY'),
        };
    }
    if (!director.hasReached('PLAYER_CONTROL')) {
        return {
            phase: 'LIFTING',
            progress: director.progress('TAKEOFF'),
            elapsed: director.since('TAKEOFF'),
        };
    }
    return {
        phase: 'AIRBORNE',
        progress: 1,
        elapsed: director.since('PLAYER_CONTROL'),
    };
}

export function falconState(director: Mission01Director): DirectedActorState<FalconPhase> {
    if (!director.hasReached('PLAYER_CONTROL')) {
        return { phase: 'FORMATION', progress: director.progress('TAKEOFF'), elapsed: director.time };
    }
    if (!director.hasReached('FALCON_TARGETED')) {
        return { phase: 'ACTIVE', progress: 1, elapsed: director.since('PLAYER_CONTROL') };
    }
    if (!director.hasReached('FALCON_DAMAGED')) {
        return {
            phase: 'INTERCEPT',
            progress: director.progress('FALCON_INTERCEPT'),
            elapsed: director.since('FALCON_TARGETED'),
        };
    }
    if (!director.hasReached('FALCON_DESTROYED')) {
        return {
            phase: 'DAMAGED',
            progress: director.progress('FALCON_LOSS'),
            elapsed: director.since('FALCON_DAMAGED'),
        };
    }
    return {
        phase: 'DESTROYED',
        progress: 1,
        elapsed: director.since('FALCON_DESTROYED'),
    };
}

export function viperState(director: Mission01Director): DirectedActorState<ViperPhase> {
    if (!director.hasReached('PLAYER_CONTROL')) {
        return { phase: 'FORMATION', progress: director.progress('TAKEOFF'), elapsed: director.time };
    }
    if (!director.hasReached('VIPER_DAMAGED')) {
        return { phase: 'ACTIVE', progress: 1, elapsed: director.since('PLAYER_CONTROL') };
    }
    if (!director.hasReached('GOLIATH_ENTER')) {
        return {
            phase: 'WITHDRAWING',
            progress: director.progress('VIPER_WITHDRAW'),
            elapsed: director.since('VIPER_DAMAGED'),
        };
    }
    return {
        phase: 'WITHDRAWN',
        progress: 1,
        elapsed: director.since('GOLIATH_ENTER'),
    };
}

export function goliathState(director: Mission01Director): DirectedActorState<GoliathPhase> {
    if (!director.hasReached('BOSS_PREPARE')) {
        return { phase: 'GROUNDED', progress: 0, elapsed: director.time };
    }
    if (!director.hasReached('GOLIATH_ENTER')) {
        return {
            phase: 'LIFTING',
            progress: director.progress('GOLIATH_PREPARE'),
            elapsed: director.since('BOSS_PREPARE'),
        };
    }
    return {
        phase: 'ENGAGED',
        progress: 1,
        elapsed: director.since('GOLIATH_ENTER'),
    };
}
