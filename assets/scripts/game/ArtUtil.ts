import { Color, isValid, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

const frames = new Map<string, SpriteFrame>();
const requests = new WeakMap<Node, string>();

/** 场景直接持有美术引用；开局就绪，射击时不反复异步加载。 */
export function registerArtFrames(assets: SpriteFrame[]) {
    frames.clear();
    for (const frame of assets) if (frame) frames.set('art/' + frame.name, frame);
}

export function applyArtSprite(
    host: Node, resourcePath: string, width: number, height: number,
    childName = '__Art', alpha = 255, onLoaded?: () => void,
): Node {
    const art = host.getChildByName(childName) ?? new Node(childName);
    if (!art.parent) {
        art.layer = host.layer;
        host.addChild(art);
        art.setSiblingIndex(0);
    }
    const transform = art.getComponent(UITransform) ?? art.addComponent(UITransform);
    const sprite = art.getComponent(Sprite) ?? art.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.trim = false;
    sprite.color = new Color(255, 255, 255, alpha);
    requests.set(art, resourcePath);
    const apply = (frame: SpriteFrame) => {
        if (!isValid(art, true) || requests.get(art) !== resourcePath) return;
        sprite.spriteFrame = frame;
        const size = frame.originalSize;
        const scale = Math.min(width / size.width, height / size.height);
        transform.setContentSize(size.width * scale, size.height * scale);
        onLoaded?.();
    };
    const cached = frames.get(resourcePath);
    if (cached && isValid(cached)) apply(cached);
    else resources.load(resourcePath + '/spriteFrame', SpriteFrame, (error, frame) => {
        if (error || !frame) {
            console.error('[RaidenLite] 无法加载 ' + resourcePath, error);
            return;
        }
        frames.set(resourcePath, frame);
        apply(frame);
    });
    return art;
}
