import { MISSION01_TIMELINE, Mission01Event, Mission01StoryCue } from './Mission01Timeline';
import { MISSION01_SEQUENCES, Mission01SequenceId, mission01CueTime } from './Mission01Sequences';

export type Mission01Phase =
    | 'READY'
    | 'FORMATION'
    | 'TAKEOFF'
    | 'COMBAT'
    | 'FALCON_EVENT'
    | 'BOSS_APPROACH'
    | 'BOSS';

export type Mission01EventListener = (event: Mission01Event) => void;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

/**
 * Mission 01 唯一运行时钟。
 *
 * Timeline 负责离散秒点，Sequences 只给区间命名，Director 负责“现在演到哪里”。
 * 连续演出读 progress()/since()，离散事件订阅 onEvent()；表现组件不得再维护剧情 elapsed。
 */
export class Mission01Director {
    private elapsed = 0;
    private nextEventIndex = 0;
    private paused = false;
    private rate = 1;
    private listeners = new Set<Mission01EventListener>();

    public get time() {
        return this.elapsed;
    }

    public get playbackRate() {
        return this.rate;
    }

    public get isPaused() {
        return this.paused;
    }

    public get phase(): Mission01Phase {
        const t = this.elapsed;
        if (t < MISSION01_SEQUENCES.FORMATION.start) return 'READY';
        if (t < MISSION01_SEQUENCES.TAKEOFF.start) return 'FORMATION';
        if (t < MISSION01_SEQUENCES.TAKEOFF.end) return 'TAKEOFF';
        if (t < MISSION01_SEQUENCES.FALCON_INTERCEPT.start) return 'COMBAT';
        if (t < MISSION01_SEQUENCES.GOLIATH_PREPARE.start) return 'FALCON_EVENT';
        if (t < MISSION01_SEQUENCES.GOLIATH_PREPARE.end) return 'BOSS_APPROACH';
        return 'BOSS';
    }

    public reset() {
        this.elapsed = 0;
        this.nextEventIndex = 0;
        this.paused = false;
        this.rate = 1;
    }

    public advance(deltaTime: number) {
        if (this.paused) return;
        const dt = Math.min(Math.max(0, deltaTime), 1 / 20) * this.rate;
        this.elapsed += dt;
        this.flushEvents();
    }

    public setPaused(paused: boolean) {
        this.paused = paused;
    }

    public setPlaybackRate(rate: number) {
        this.rate = Math.max(0.1, Math.min(8, rate));
    }

    /**
     * 调试基础能力：移动导演时间和事件游标，但不补发旧事件。
     * 完整可视化 scrub 仍需要状态快照/重建层，不能把 seek() 当作完整演出预览器。
     */
    public seek(time: number) {
        this.elapsed = Math.max(0, time);
        this.nextEventIndex = 0;
        while (this.nextEventIndex < MISSION01_TIMELINE.length
            && MISSION01_TIMELINE[this.nextEventIndex].time <= this.elapsed) {
            this.nextEventIndex += 1;
        }
    }

    public progress(sequence: Mission01SequenceId): number {
        const window = MISSION01_SEQUENCES[sequence];
        const duration = Math.max(0.001, window.end - window.start);
        return clamp01((this.elapsed - window.start) / duration);
    }

    public since(cue: Mission01StoryCue): number {
        return Math.max(0, this.elapsed - mission01CueTime(cue));
    }

    public hasReached(cue: Mission01StoryCue): boolean {
        return this.elapsed >= mission01CueTime(cue);
    }

    public onEvent(listener: Mission01EventListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private flushEvents() {
        while (this.nextEventIndex < MISSION01_TIMELINE.length) {
            const event = MISSION01_TIMELINE[this.nextEventIndex];
            if (event.time > this.elapsed) break;
            this.nextEventIndex += 1;
            for (const listener of this.listeners) {
                listener(event);
            }
        }
    }
}

export const MISSION01_DIRECTOR = new Mission01Director();
