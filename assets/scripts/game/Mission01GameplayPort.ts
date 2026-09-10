import { MISSION01_DIRECTOR, Mission01Director } from './Mission01Director';
import { Mission01Event, Mission01StoryCue } from './Mission01Timeline';

export type Mission01WaveEvent = Extract<Mission01Event, { kind: 'WAVE' }>;
export type Mission01EliteEvent = Extract<Mission01Event, { kind: 'ELITE' }>;

/**
 * Gameplay 侧唯一需要实现的 Mission 01 接口。
 *
 * Director 不依赖 GameManager；GameManager 也不需要理解 Director 内部游标。
 * 未来 Gameplay 拆成 WaveController / CombatFlowController 时，只替换 hooks，
 * Timeline、Presentation 和 Boss Sequence 都无需修改。
 */
export interface Mission01GameplayHooks {
    setScroll(speedScale: number, transition: number): void;
    setControl(enabled: boolean, autoFire: boolean): void;
    spawnWave(event: Mission01WaveEvent): void;
    spawnElite(event: Mission01EliteEvent): void;
    showStory(cue: Mission01StoryCue): void;
    beginWarning(): void;
    spawnBoss(): void;
}

export class Mission01GameplayPort {
    private stopListening: (() => void) | null = null;

    constructor(
        private readonly hooks: Mission01GameplayHooks,
        private readonly director: Mission01Director = MISSION01_DIRECTOR,
    ) {}

    public connect() {
        if (this.stopListening) return;

        // 持久状态可安全补齐；WAVE/STORY/WARNING/BOSS 等脉冲事件绝不重放。
        const snapshot = this.director.snapshot();
        this.hooks.setScroll(snapshot.scroll.speedScale, 0);
        this.hooks.setControl(snapshot.control.enabled, snapshot.control.autoFire);
        this.stopListening = this.director.onEvent((event) => this.dispatch(event));
    }

    public dispose() {
        this.stopListening?.();
        this.stopListening = null;
    }

    private dispatch(event: Mission01Event) {
        switch (event.kind) {
            case 'SCROLL':
                this.hooks.setScroll(event.speedScale, event.transition);
                break;
            case 'CONTROL':
                this.hooks.setControl(event.enabled, event.autoFire);
                break;
            case 'WAVE':
                this.hooks.spawnWave(event);
                break;
            case 'ELITE':
                this.hooks.spawnElite(event);
                break;
            case 'STORY':
                this.hooks.showStory(event.cue);
                break;
            case 'WARNING':
                this.hooks.beginWarning();
                break;
            case 'BOSS':
                this.hooks.spawnBoss();
                break;
        }
    }
}
