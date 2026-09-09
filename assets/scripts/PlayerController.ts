import { _decorator, Component, game, Game, input, Input, EventTouch, EventKeyboard, KeyCode, Node, UITransform } from 'cc';
import { GameManager } from './game/GameManager';
const { ccclass, property } = _decorator;

/** 显式引用管理器，触控区与按钮分开；鼠标沿用 Creator 节点触摸事件。 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node) public touchArea: Node | null = null;
    @property(GameManager) public gameManager: GameManager | null = null;
    private touchId: number | null = null;
    private lastX = 0;
    private lastY = 0;
    private keys = new Set<KeyCode>();
    onEnable() {
        this.touchArea?.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.touchArea?.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.touchArea?.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.touchArea?.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.resetInput, this);
    }
    private onTouchStart(event: EventTouch) {
        if (this.touchId !== null || !this.gameManager?.canControl) return;
        this.touchId = event.getID();
        const pos = event.getUILocation();
        this.lastX = pos.x;
        this.lastY = pos.y;
    }
    private onTouchMove(event: EventTouch) {
        if (this.touchId !== event.getID()) return;
        const pos = event.getUILocation();
        this.movePlayer(pos.x - this.lastX, pos.y - this.lastY);
        this.lastX = pos.x;
        this.lastY = pos.y;
    }
    private onTouchEnd(event: EventTouch) {
        if (this.touchId === event.getID()) this.touchId = null;
    }
    private onKeyDown(event: EventKeyboard) {
        const repeated = this.keys.has(event.keyCode);
        this.keys.add(event.keyCode);
        if (repeated || !this.gameManager?.canControl) return;
        if (event.keyCode === KeyCode.SPACE) this.gameManager.useBomb();
        if (event.keyCode === KeyCode.KEY_Q) this.gameManager.toggleWeapon();
    }
    private onKeyUp(event: EventKeyboard) { this.keys.delete(event.keyCode); }
    private resetInput() {
        this.touchId = null;
        this.keys.clear();
    }
    update(dt: number) {
        const x = Number(this.keys.has(KeyCode.ARROW_RIGHT) || this.keys.has(KeyCode.KEY_D))
            - Number(this.keys.has(KeyCode.ARROW_LEFT) || this.keys.has(KeyCode.KEY_A));
        const y = Number(this.keys.has(KeyCode.ARROW_UP) || this.keys.has(KeyCode.KEY_W))
            - Number(this.keys.has(KeyCode.ARROW_DOWN) || this.keys.has(KeyCode.KEY_S));
        const distance = 520 * Math.min(dt, 1 / 20) / (Math.hypot(x, y) || 1);
        if (x || y) this.movePlayer(x * distance, y * distance);
    }
    private movePlayer(dx: number, dy: number) {
        if (!this.gameManager?.canControl) return;
        const size = this.node.parent?.getComponent(UITransform)?.contentSize;
        const halfX = (size?.width ?? 750) / 2 - 53;
        const halfY = (size?.height ?? 1334) / 2 - 105;
        const pos = this.node.position;
        this.node.setPosition(Math.max(-halfX, Math.min(halfX, pos.x + dx)),
            Math.max(-halfY, Math.min(halfY - 65, pos.y + dy)), 0);
    }
    onDisable() {
        this.touchArea?.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.touchArea?.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.touchArea?.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.touchArea?.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.resetInput, this);
        this.resetInput();
    }
}
