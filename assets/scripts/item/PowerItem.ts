import { _decorator, Color, Component, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

export type ItemKind = 'P' | 'S' | 'L' | 'B';

@ccclass('PowerItem')
export class PowerItem extends Component {
    public kind: ItemKind = 'P';
    public dead = false;
    public radius = 28;
    public speed = 150;
    private age = 0;
    private haloNode: Node | null = null;
    private haloOpacity: UIOpacity | null = null;

    public setup(kind: ItemKind) {
        this.kind = kind;
        this.draw();
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        if (this.dead) return;
        this.age += deltaTime;
        const pos = this.node.position;
        this.node.setPosition(pos.x, pos.y - this.speed * deltaTime, 0);
        const pulse = 1 + Math.sin(this.age * 4.2) * 0.08;
        this.node.setScale(pulse, pulse, 1);
        if (this.haloOpacity) {
            this.haloOpacity.opacity = 60 + Math.sin(this.age * 4.2) * 25;
        }
        if (this.node.position.y < -760) this.destroySelf();
    }

    public destroySelf() {
        if (this.dead) return;
        this.dead = true;
        this.node.destroy();
    }

    private draw() {
        let transform = this.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);
        transform.setContentSize(58, 58);

        // 外发光圈，强化道具识别。
        this.haloNode = new Node('__Halo');
        this.haloNode.layer = this.node.layer;
        this.haloNode.setSiblingIndex(0);
        this.node.addChild(this.haloNode);
        const haloTransform = this.haloNode.addComponent(UITransform);
        haloTransform.setContentSize(86, 86);
        const haloSprite = this.haloNode.addComponent(Sprite);
        haloSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        haloSprite.trim = false;
        const tint = this.kind === 'P'
            ? new Color(255, 196, 110, 255)
            : this.kind === 'S'
                ? new Color(120, 230, 160, 255)
                : this.kind === 'L'
                    ? new Color(120, 200, 255, 255)
                    : new Color(255, 110, 120, 255);
        haloSprite.color = tint;
        this.haloOpacity = this.haloNode.addComponent(UIOpacity);
        this.haloOpacity.opacity = 75;
        applyArtSprite(this.haloNode, 'art/ui_white', 86, 86, '__HaloArt', 255);

        applyArtSprite(this.node, `art/item_${this.kind.toLowerCase()}`, 62, 70, '__ItemArt', 255);
    }
}
