import { _decorator, Component, Sprite } from 'cc';
import { applyArtSprite } from './game/ArtUtil';
const { ccclass } = _decorator;
@ccclass('PlayerView')
export class PlayerView extends Component {
    start() {
        if (!this.node.getChildByName('__PlayerArt')?.getComponent(Sprite)?.spriteFrame) {
            applyArtSprite(this.node, 'art/player', 105, 210, '__PlayerArt');
        }
    }
}
