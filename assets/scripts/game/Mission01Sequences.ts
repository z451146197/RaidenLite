import { MISSION01_TIMELINE, Mission01Event, Mission01StoryCue } from './Mission01Timeline';

/**
 * 从 Mission01Timeline 派生“连续演出窗口”。
 *
 * Timeline 仍是唯一秒点数据源；本文件只把两个 cue 之间的区间命名，供表现组件读取 progress。
 * 因而调节时间只需改 Timeline，演出组件不复制 6/14/24/98/108/117/133/143/146 等魔法数字。
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
