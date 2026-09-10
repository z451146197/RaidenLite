import { _decorator, Component } from 'cc';
import { MISSION01_DIRECTOR } from './game/Mission01Director';

const { ccclass, executionOrder } = _decorator;

/** Scene Runtime 的唯一 Mission 01 时钟驱动器。 */
@ccclass('Mission01DirectorDriver')
@executionOrder(-200)
export class Mission01DirectorDriver extends Component {
    onLoad() {
        MISSION01_DIRECTOR.reset();
    }

    update(deltaTime: number) {
        MISSION01_DIRECTOR.advance(deltaTime);
    }
}
