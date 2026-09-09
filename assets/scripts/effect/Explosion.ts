import { _decorator, Color, Component, Node, Sprite, UIOpacity, UITransform } from 'cc';
import { applyArtSprite } from '../game/ArtUtil';

const { ccclass } = _decorator;

/**
 * 短促的爆炸效果：外环扩散 + 内核闪光，约 0.45 秒后自毁。
 * 由 GameManager 在敌机 / Boss 击毁时创建。
 */
@ccclass('Explosion')
export class Explosion extends Component {
    public lifeTime = 0.45;
    public peakRadius = 56;

    private age = 0;
    private ringNode: Node | null = null;
    private coreNode: Node | null = null;
    private ringTransform: UITransform | null = null;
    private coreTransform: UITransform | null = null;
    private ringSprite: Sprite | null = null;
    private coreSprite: Sprite | null = null;
    private ringOpacity: UIOpacity | null = null;
    private coreOpacity: UIOpacity | null = null;

    public setup(peak: number, life: number, tint: Color) {
        this.peakRadius = peak;
        this.lifeTime = life;
        this.build(tint);
    }

    private build(tint: Color) {
        this.ringNode = new Node('__Ring');
        this.ringNode.layer = this.node.layer;
        this.node.addChild(this.ringNode);
        this.ringTransform = this.ringNode.addComponent(UITransform);
        this.ringSprite = this.ringNode.addComponent(Sprite);
        this.ringOpacity = this.ringNode.addComponent(UIOpacity);
        this.ringSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.ringSprite.trim = false;
        this.ringSprite.color = tint;
        this.ringOpacity.opacity = 220;

        this.coreNode = new Node('__Core');
        this.coreNode.layer = this.node.layer;
        this.node.addChild(this.coreNode);
        this.coreTransform = this.coreNode.addComponent(UITransform);
        this.coreSprite = this.coreNode.addComponent(Sprite);
        this.coreOpacity = this.coreNode.addComponent(UIOpacity);
        this.coreSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.coreSprite.trim = false;
        this.coreSprite.color = tint;
        this.coreOpacity.opacity = 255;

        applyArtSprite(this.ringNode, 'art/ui_white', this.peakRadius * 2, this.peakRadius * 2, '__Art', 255);
        applyArtSprite(this.coreNode, 'art/ui_white', this.peakRadius, this.peakRadius, '__Art', 255);
    }

    update(deltaTime: number) {
        deltaTime = Math.min(deltaTime, 1 / 20);
        this.age += deltaTime;
        const t = Math.min(1, this.age / this.lifeTime);
        const eased = 1 - Math.pow(1 - t, 2.4);
        const ringScale = 0.35 + eased * 1.05;
        const ringSize = this.peakRadius * 2 * ringScale;
        if (this.ringTransform) {
            this.ringTransform.setContentSize(ringSize, ringSize);
        }
        if (this.ringOpacity) {
            this.ringOpacity.opacity = Math.max(0, 220 * (1 - eased));
        }

        const coreScale = 0.45 + eased * 0.85;
        const coreSize = this.peakRadius * coreScale;
        if (this.coreTransform) {
            this.coreTransform.setContentSize(coreSize, coreSize);
        }
        if (this.coreOpacity) {
            this.coreOpacity.opacity = Math.max(0, 255 * Math.pow(1 - t, 1.6));
        }

        if (this.age >= this.lifeTime) {
            this.node.destroy();
        }
    }
}