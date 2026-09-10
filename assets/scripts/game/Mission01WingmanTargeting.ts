import { Mission01WingmanAimMode } from './Mission01WingmanCombat';
import { Mission01WingmanPose } from './Mission01WingmanCombatPort';

export interface Mission01WingmanTargetCandidate {
    x: number;
    y: number;
    active: boolean;
    /** 目标是否正在发射 HEAVY 等不可抵消威胁。 */
    heavyThreat?: boolean;
    /** Elite/高价值单位可作为 INTERCEPT 的次优先级。 */
    priority?: boolean;
}

/**
 * 僚机选敌是纯策略，不依赖 Cocos Node / Enemy / GameManager。
 * Gameplay 只需要把当前可攻击目标映射成轻量 candidate，再使用返回的原对象。
 */
export function selectMission01WingmanTarget<T extends Mission01WingmanTargetCandidate>(
    aimMode: Mission01WingmanAimMode,
    pose: Mission01WingmanPose,
    candidates: readonly T[],
): T | null {
    let best: T | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        if (!candidate.active) continue;

        const dx = candidate.x - pose.x;
        const dy = candidate.y - pose.y;
        // 僚机只处理机头前方目标，避免转身去追已经穿过编队的敌人。
        if (dy < -24) continue;

        const distanceSq = dx * dx + dy * dy;
        let score = distanceSq;

        if (aimMode === 'PRIORITY_THREAT') {
            // INTERCEPT 阶段首先处理 HEAVY 威胁，其次 Elite/高价值单位。
            if (candidate.heavyThreat) score -= 2_000_000;
            else if (candidate.priority) score -= 750_000;
        }

        if (score < bestScore) {
            bestScore = score;
            best = candidate;
        }
    }

    return best;
}

/** 根据世界/Gameplay 同坐标系位置计算 Bullet.setup() 使用的角度。 */
export function mission01WingmanAimAngle(
    pose: Mission01WingmanPose,
    target: Mission01WingmanTargetCandidate | null,
    spreadDegrees = 0,
): number {
    if (!target) return spreadDegrees;
    const dx = target.x - pose.x;
    const dy = target.y - pose.y;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return spreadDegrees;
    return Math.atan2(dx, dy) * 180 / Math.PI + spreadDegrees;
}
