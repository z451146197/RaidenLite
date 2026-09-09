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

/**
 * Mission 01 的唯一时间轴数据源。
 *
 * 这里刻意只描述“何时发生什么”，不直接操作 Cocos 节点。后续 WingmanController、
 * DialogueController、BackgroundController 和 GoliathSequence 都消费同一份数据，
 * 避免把剧情秒点散落到多个脚本里。
 */
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

    // 僚机剧情事件先进入统一时间轴；视觉实现由 WingmanController 接管。
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
    { time: 146, kind: 'STORY', cue: 'GOLIATH_ENTER' },
    { time: 146, kind: 'BOSS' },
];

export const MISSION01_BOSS_TIME = 146;
