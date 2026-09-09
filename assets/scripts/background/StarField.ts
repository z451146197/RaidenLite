import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;

/** 保留原脚本 UUID。只滚动场景内已有的地形与云层 Sprite。 */
@ccclass('StarField')
export class StarField extends Component {
    private ground: Node[] = [];
    private clouds: Node[] = [];
    start() {
        this.ground = this.node.children.filter(n => n.name.startsWith('Ground'));
        this.clouds = this.node.children.filter(n => n.name.startsWith('Cloud'));
    }
    update(dt: number) {
        dt = Math.min(dt, 1 / 20);
        this.scroll(this.ground, 1334, 34 * dt);
        this.scroll(this.clouds, 1080, 57 * dt);
    }
    private scroll(panels: Node[], height: number, distance: number) {
        for (const panel of panels) {
            let y = panel.position.y - distance;
            if (y <= -667 - height / 2) y += height * panels.length;
            panel.setPosition(0, y, 0);
        }
    }
}
