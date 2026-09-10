import { _decorator, Component } from 'cc';
import { MISSION01_DIRECTOR } from './game/Mission01Director';

const { ccclass, executionOrder } = _decorator;

/**
 * 把 Cocos 帧时间写入 Mission01Director。该组件由 PlayerView 运行时挂载，
 * 因此不需要修改 Game.scene，也不会和素材分支产生 scene JSON 冲突。
 */
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
