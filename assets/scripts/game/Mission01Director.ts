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

export interface Mission01PersistentState {
    scroll: {
        speedScale: number;
        transition: number;
    };
    control: {
        enabled: boolean;
        autoFire: boolean;
    };
}

export type Mission01EventListener = (event: Mission01Event) => void;

type Mission01EventKind = Mission01Event['kind'];
type EventOfKind<TKind extends Mission01EventKind> = Extract<Mission01Event, { kind: TKind }>;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function defaultPersistentState(): Mission01PersistentState {
    return {
        scroll: { speedScale: 1, transition: 0 },
        control: { enabled: false, autoFire: false },
    };
}

/**
 * Mission 01 唯一运行时钟。
 *
 * Timeline 负责离散秒点，Sequences 负责区间命名，ActorState 负责演员语义；
 * Director 只负责时间、事件游标和少量“持续有效”的运行状态快照。
 */
export class Mission01Director {
    private elapsed = 0;
    private nextEventIndex = 0;
    private paused = false;
    private rate = 1;
    private listeners = new Set<Mission01EventListener>();
    private persistent = defaultPersistentState();

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

    /** 返回副本，避免消费者意外修改 Director 内部状态。 */
    public snapshot(): Mission01PersistentState {
        return {
            scroll: { ...this.persistent.scroll },
            control: { ...this.persistent.control },
        };
    }

    public reset() {
        this.elapsed = 0;
        this.nextEventIndex = 0;
        this.paused = false;
        this.rate = 1;
        this.persistent = defaultPersistentState();
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
     * 调试基础能力：移动导演时间并重建 SCROLL/CONTROL 等持久状态，但不补发 WAVE/STORY 等脉冲事件。
     * 完整可视化 scrub 仍需要敌机/FX/对白的快照重建层。
     */
    public seek(time: number) {
        this.elapsed = Math.max(0, time);
        this.nextEventIndex = 0;
        this.persistent = defaultPersistentState();
        while (this.nextEventIndex < MISSION01_TIMELINE.length
            && MISSION01_TIMELINE[this.nextEventIndex].time <= this.elapsed) {
            this.applyPersistentState(MISSION01_TIMELINE[this.nextEventIndex]);
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

    /** 按事件类型订阅，避免所有消费者都维护一份大 switch。 */
    public onKind<TKind extends Mission01EventKind>(
        kind: TKind,
        listener: (event: EventOfKind<TKind>) => void,
    ): () => void {
        return this.onEvent((event) => {
            if (event.kind === kind) listener(event as EventOfKind<TKind>);
        });
    }

    private flushEvents() {
        while (this.nextEventIndex < MISSION01_TIMELINE.length) {
            const event = MISSION01_TIMELINE[this.nextEventIndex];
            if (event.time > this.elapsed) break;
            this.nextEventIndex += 1;
            this.applyPersistentState(event);
            for (const listener of this.listeners) {
                listener(event);
            }
        }
    }

    private applyPersistentState(event: Mission01Event) {
        if (event.kind === 'SCROLL') {
            this.persistent.scroll = {
                speedScale: event.speedScale,
                transition: event.transition,
            };
        } else if (event.kind === 'CONTROL') {
            this.persistent.control = {
                enabled: event.enabled,
                autoFire: event.autoFire,
            };
        }
    }
}

export const MISSION01_DIRECTOR = new Mission01Director();
