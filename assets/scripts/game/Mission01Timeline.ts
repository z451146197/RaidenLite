export type Mission01StoryCue =
    | 'MISSION_OPEN'
    | 'FORMATION_RUNWAY'
    | 'TAKEOFF'
    | 'PLAYER_CONTROL'
    | 'AEGIS_REVEAL'
    | 'FALCON_TARGETED'
    | 'FALCON_DAMAGED'
    | 'FALCON_DESTROYED'
    | 'BOSS_PREPARE'
    | 'VIPER_DAMAGED'
    | 'GOLIATH_ENTER';

export type Mission01WavePattern = 'LINE' | 'V' | 'DIAGONAL_CROSS' | 'SINE';
export type Mission01DropKind = 'P' | 'S' | 'L' | 'B';

export type Mission01Event =
    | { time: number; kind: 'STORY'; cue: Mission01StoryCue }
    | { time: number; kind: 'SCROLL'; speedScale: number; transition: number }
    | { time: number; kind: 'CONTROL'; enabled: boolean; autoFire: boolean }
    | { time: number; kind: 'WAVE'; pattern: Mission01WavePattern; count: number; canShoot: boolean }
    | { time: number; kind: 'ELITE'; x: number; dropKind: Mission01DropKind | null; heavyBullet: boolean }
    | { time: number; kind: 'WARNING' }
    | { time: number; kind: 'BOSS' };

/** Mission 01 的唯一时间轴数据源：只描述“何时发生什么”。 */
export const MISSION01_TIMELINE: readonly Mission01Event[] = [
    { time: 0, kind: 'STORY', cue: 'MISSION_OPEN' },
    { time: 0, kind: 'SCROLL', speedScale: 0.18, transition: 0 },

    { time: 6, kind: 'STORY', cue: 'FORMATION_RUNWAY' },
    { time: 6, kind: 'SCROLL', speedScale: 0.48, transition: 2.5 },

    { time: 14, kind: 'STORY', cue: 'TAKEOFF' },
    { time: 14, kind: 'SCROLL', speedScale: 1.45, transition: 3.0 },

    { time: 24, kind: 'CONTROL', enabled: true, autoFire: true },
    { time: 24, kind: 'STORY', cue: 'PLAYER_CONTROL' },

    { time: 30, kind: 'WAVE', pattern: 'LINE', count: 4, canShoot: false },
    { time: 36, kind: 'WAVE', pattern: 'LINE', count: 5, canShoot: false },
    { time: 40, kind: 'STORY', cue: 'AEGIS_REVEAL' },
    { time: 42, kind: 'WAVE', pattern: 'DIAGONAL_CROSS', count: 6, canShoot: false },
    { time: 48, kind: 'ELITE', x: -180, dropKind: 'P', heavyBullet: false },
    { time: 54, kind: 'WAVE', pattern: 'LINE', count: 5, canShoot: true },
    { time: 60, kind: 'WAVE', pattern: 'V', count: 7, canShoot: true },
    { time: 66, kind: 'ELITE', x: 170, dropKind: 'S', heavyBullet: false },
    { time: 72, kind: 'WAVE', pattern: 'DIAGONAL_CROSS', count: 8, canShoot: true },
    { time: 78, kind: 'WAVE', pattern: 'SINE', count: 5, canShoot: true },
    { time: 84, kind: 'ELITE', x: 0, dropKind: null, heavyBullet: true },
    { time: 90, kind: 'ELITE', x: -210, dropKind: 'P', heavyBullet: true },
    { time: 96, kind: 'WAVE', pattern: 'V', count: 9, canShoot: true },

    { time: 98, kind: 'STORY', cue: 'FALCON_TARGETED' },
    { time: 102, kind: 'WAVE', pattern: 'DIAGONAL_CROSS', count: 10, canShoot: true },
    { time: 108, kind: 'STORY', cue: 'FALCON_DAMAGED' },
    { time: 108, kind: 'ELITE', x: 190, dropKind: 'L', heavyBullet: true },
    { time: 114, kind: 'WAVE', pattern: 'SINE', count: 7, canShoot: true },
    { time: 117, kind: 'STORY', cue: 'FALCON_DESTROYED' },
    { time: 120, kind: 'ELITE', x: 0, dropKind: 'B', heavyBullet: true },
    { time: 126, kind: 'WAVE', pattern: 'LINE', count: 8, canShoot: true },

    { time: 133, kind: 'STORY', cue: 'BOSS_PREPARE' },
    { time: 133, kind: 'SCROLL', speedScale: 0.62, transition: 3.0 },
    { time: 141, kind: 'WARNING' },
    { time: 143, kind: 'STORY', cue: 'VIPER_DAMAGED' },
    { time: 146, kind: 'SCROLL', speedScale: 0.28, transition: 2.0 },
    { time: 146, kind: 'STORY', cue: 'GOLIATH_ENTER' },
    { time: 146, kind: 'BOSS' },
];

/**
 * 所有连续演出窗口也只从 Timeline 推导。以后调整节奏只改上面的事件秒点，
 * Player / Wingman / GOLIATH 表现层不再各自复制一份时间常量。
 */
export function mission01CueTime(cue: Mission01StoryCue): number {
    const event = MISSION01_TIMELINE.find(
        (item): item is Extract<Mission01Event, { kind: 'STORY' }> => item.kind === 'STORY' && item.cue === cue,
    );
    if (!event) {
        throw new Error(`[Mission01] missing story cue: ${cue}`);
    }
    return event.time;
}

export const MISSION01_SEQUENCES = {
    FORMATION: { start: mission01CueTime('FORMATION_RUNWAY'), end: mission01CueTime('TAKEOFF') },
    TAKEOFF: { start: mission01CueTime('TAKEOFF'), end: mission01CueTime('PLAYER_CONTROL') },
    FALCON_INTERCEPT: { start: mission01CueTime('FALCON_TARGETED'), end: mission01CueTime('FALCON_DAMAGED') },
    FALCON_LOSS: { start: mission01CueTime('FALCON_DAMAGED'), end: mission01CueTime('FALCON_DESTROYED') },
    GOLIATH_PREPARE: { start: mission01CueTime('BOSS_PREPARE'), end: mission01CueTime('GOLIATH_ENTER') },
    VIPER_WITHDRAW: { start: mission01CueTime('VIPER_DAMAGED'), end: mission01CueTime('GOLIATH_ENTER') },
} as const;

export type Mission01SequenceId = keyof typeof MISSION01_SEQUENCES;
export const MISSION01_BOSS_TIME = mission01CueTime('GOLIATH_ENTER');
