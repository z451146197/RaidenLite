import { _decorator, Component, Sprite } from 'cc';
import { applyArtSprite } from './game/ArtUtil';
import { Mission01Wingmen } from './Mission01Wingmen';
import { PlayerFlightPresentation } from './PlayerFlightPresentation';
const { ccclass } = _decorator;

@ccclass('PlayerView')
export class PlayerView extends Component {
    start() {
        if (!this.node.getChildByName('__PlayerArt')?.getComponent(Sprite)?.spriteFrame) {
            applyArtSprite(this.node, 'art/player', 105, 210, '__PlayerArt');
        }
        if (!this.node.getComponent(PlayerFlightPresentation)) {
            this.node.addComponent(PlayerFlightPresentation);
        }
        if (!this.node.getComponent(Mission01Wingmen)) {
            this.node.addComponent(Mission01Wingmen);
        }
    }
}
