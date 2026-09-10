import { director, Node } from 'cc';
import { Mission01DirectorDriver } from '../Mission01DirectorDriver';

const RUNTIME_NODE_NAME = '__Mission01Runtime';

/**
 * 保证 Mission 01 的导演驱动器属于 Scene Runtime，而不是 Player 生命周期。
 *
 * 目前可由任意低冲突 bootstrap 调用 ensure()；真正创建的 Driver 挂在场景根节点下。
 * 以后改成场景级 Bootstrap 时无需改 Director/Presentation。
 */
export function ensureMission01RuntimeHost(): Node | null {
    const scene = director.getScene();
    if (!scene) return null;

    let host = scene.getChildByName(RUNTIME_NODE_NAME);
    if (!host) {
        host = new Node(RUNTIME_NODE_NAME);
        scene.addChild(host);
    }
    if (!host.getComponent(Mission01DirectorDriver)) {
        host.addComponent(Mission01DirectorDriver);
    }
    return host;
}
