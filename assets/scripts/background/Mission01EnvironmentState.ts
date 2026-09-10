export type Mission01EnvironmentStageId =
    | 'BG01_TAKEOFF_BASE'
    | 'BG02_COASTAL_EVAC'
    | 'BG03_HARBOR_DEFENSE'
    | 'BG04_LOGISTICS_EVAC'
    | 'BG05_BASE_PURGE'
    | 'BG06_GOLIATH_PLATFORM';

export interface Mission01EnvironmentStageDefinition {
    readonly id: Mission01EnvironmentStageId;
    readonly panelName: string;
    readonly combatLaneHalfWidth: number;
}

/**
 * Mission 01 六段环境的固定空间顺序。
 *
 * 这里只描述空间，不包含任何秒点。环境表现必须由 Director / Sequence
 * 显式驱动，不能在背景组件里复制 Mission Timeline 或维护剧情时钟。
 */
export const MISSION01_ENVIRONMENT_STAGES: readonly Mission01EnvironmentStageDefinition[] = [
    { id: 'BG01_TAKEOFF_BASE', panelName: 'GroundA', combatLaneHalfWidth: 166 },
    { id: 'BG02_COASTAL_EVAC', panelName: 'GroundB', combatLaneHalfWidth: 170 },
    { id: 'BG03_HARBOR_DEFENSE', panelName: 'GroundC', combatLaneHalfWidth: 205 },
    { id: 'BG04_LOGISTICS_EVAC', panelName: 'GroundD', combatLaneHalfWidth: 160 },
    { id: 'BG05_BASE_PURGE', panelName: 'GroundE', combatLaneHalfWidth: 150 },
    { id: 'BG06_GOLIATH_PLATFORM', panelName: 'GroundF', combatLaneHalfWidth: 185 },
] as const;

export interface Mission01EnvironmentPresentationState {
    /** 当前剧情希望强调的环境段；空间滚动仍由 Ground panel 自身位置决定。 */
    stage: Mission01EnvironmentStageId;
    /** 0..1，基地警戒灯 / 局部告警表现强度。 */
    alertIntensity: number;
    /** 0..1，BG05 烟、火、设施损坏表现强度。 */
    purgeIntensity: number;
    /** 0..1，GOLIATH 地面平台准备 / 升空承接进度。 */
    goliathPrepareProgress: number;
}

export const DEFAULT_MISSION01_ENVIRONMENT_STATE: Readonly<Mission01EnvironmentPresentationState> = {
    stage: 'BG01_TAKEOFF_BASE',
    alertIntensity: 0,
    purgeIntensity: 0,
    goliathPrepareProgress: 0,
};

function clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

/**
 * 接受 Director / Sequence 提供的离散状态与 progress，并做输入保护。
 * 这个函数故意不接受 dt / elapsed / time，防止环境层重新变成第二套关卡时钟。
 */
export function normalizeMission01EnvironmentState(
    next: Mission01EnvironmentPresentationState,
): Mission01EnvironmentPresentationState {
    return {
        stage: next.stage,
        alertIntensity: clamp01(next.alertIntensity),
        purgeIntensity: clamp01(next.purgeIntensity),
        goliathPrepareProgress: clamp01(next.goliathPrepareProgress),
    };
}
