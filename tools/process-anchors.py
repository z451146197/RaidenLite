"""把样张处理成可直接替换游戏原 PNG 的最终资源：
- 战机：纯品红底色 → chroma-key 透明 → 抠 bbox → 等比缩放到目标显示框（保留上下边距）→ 保存
- 背景：底部水印区域裁掉 → 缩放到 750x1334 → 顶/底各复制一段做无缝镜像补带 → 保存

调用：
C:/Users/Gxmar/.workbuddy/binaries/python/envs/default/Scripts/python.exe tools/process-anchors.py
"""
from pathlib import Path
import math
import sys
from PIL import Image

TOOLS = Path(__file__).resolve().parent
GEN = TOOLS / '_art_gen'
ART = TOOLS.parent / 'assets' / 'resources' / 'art'

# (输入文件名, 输出名, 显示宽度, 显示高度, 上下留边, 旋转角度)
SPRITES = [
    # 飞机锚定
    ('2D_game_asset__top_down_vertic_2026-09-09T18-45-48.png', 'player.png', 105, 210, 6, 0),
    ('2D_game_asset__top_down_vertic_2026-09-09T18-46-07.png', 'enemy_normal.png', 112, 205, 6, 0),
    ('2D_game_asset__top_down_vertic_2026-09-09T18-49-19.png', 'enemy_fast.png', 94, 205, 6, 0),
    ('2D_game_asset__top_down_vertic_2026-09-09T18-50-20.png', 'enemy_elite.png', 120, 215, 6, 0),
    ('2D_game_asset__top_down_vertic_2026-09-09T18-50-48.png', 'transport.png', 115, 205, 6, 0),
    ('2D_game_asset__top_down_vertic_2026-09-09T18-51-12.png', 'boss.png', 285, 250, 4, 0),
    # 弹体
    ('2D_game_asset__vertical_energy_2026-09-09T18-51-32.png', 'bullet_player.png', 14, 44, 0, 0),
    ('2D_game_asset__vertical_energy_2026-09-09T18-51-50.png', 'bullet_spread.png', 14, 44, 0, 0),
    ('2D_game_asset__vertical_contin_2026-09-09T18-52-10.png', 'bullet_laser.png', 14, 58, 0, 0),
    ('2D_game_asset__vertical_enemy__2026-09-09T18-52-28.png', 'bullet_enemy_normal.png', 24, 38, 0, 0),
    ('2D_game_asset__vertical_enemy__2026-09-09T18-52-46.png', 'bullet_enemy_heavy.png', 42, 42, 0, 0),
    # 道具
    ('2D_game_item_icon__power_up_up_2026-09-09T18-53-02.png', 'item_p.png', 62, 70, 2, 0),
    ('2D_game_item_icon__spread_shot_2026-09-09T18-53-22.png', 'item_s.png', 62, 70, 2, 0),
    ('2D_game_item_icon__laser_beam__2026-09-09T18-53-42.png', 'item_l.png', 62, 70, 2, 0),
    ('2D_game_item_icon__bomb_pickup_2026-09-09T18-54-02.png', 'item_b.png', 62, 70, 2, 0),
]

BG_IN = '2D_game_scrolling_background___2026-09-09T18-46-28.png'
BG_OUT = 'background_level1.png'
CLOUD_IN = '2D_game_scrolling_cloud_overla_2026-09-09T18-54-21.png'
CLOUD_OUT = 'cloud_overlay.png'


def detect_bg_color(img: Image.Image) -> tuple[int, int, int]:
    """从四角取最常见的 RGB 作为背景色（边缘应为纯色）。"""
    pixels = img.convert('RGBA').load()
    w, h = img.size
    samples = [
        pixels[0, 0][:3],
        pixels[w - 1, 0][:3],
        pixels[0, h - 1][:3],
        pixels[w - 1, h - 1][:3],
    ]
    return max(set(samples), key=samples.count)


def chroma_key(img: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    """按 RGB 到背景色的切比雪夫距离做模糊 chroma key。"""
    img = img.convert('RGBA')
    pixels = img.load()
    br, bg_, bb = bg
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            dist = max(abs(r - br), abs(g - bg_), abs(b - bb))
            if dist < 60:
                pixels[x, y] = (r, g, b, 0)
            elif dist < 140:
                fade = (140 - dist) / 80
                pixels[x, y] = (r, g, b, int(a * (1 - fade)))
    return img


def fill_watermark_region(img: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    """右下角水印区域用背景色填充，便于后续 chroma key。"""
    w, h = img.size
    pixels = img.load()
    x0 = int(w * 0.72)
    y0 = int(h * 0.88)
    for y in range(y0, h):
        for x in range(x0, w):
            pixels[x, y] = (bg[0], bg[1], bg[2], 255)
    return img


def fit_into_box(img: Image.Image, box_w: int, box_h: int, margin: int, rotate: int = 0) -> Image.Image:
    """等比缩放到 fit box，box 内上下留 margin。rotate: 0/90/180/270 顺时针旋转后再处理。"""
    if rotate:
        img = img.rotate(-rotate, expand=True)
    src_w, src_h = img.size
    # 透明 bbox
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        src_w, src_h = img.size
    avail_w = box_w - margin * 2
    avail_h = box_h - margin * 2
    scale = min(avail_w / src_w, avail_h / src_h)
    new_w = max(1, int(round(src_w * scale)))
    new_h = max(1, int(round(src_h * scale)))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0))
    canvas.paste(img, ((box_w - new_w) // 2, (box_h - new_h) // 2), img)
    return canvas


def process_sprite(src_name: str, out_name: str, box_w: int, box_h: int, margin: int, rotate: int = 0) -> None:
    src_path = GEN / src_name
    if not src_path.exists():
        print(f'  skip (missing) {src_name}')
        return
    img = Image.open(src_path).convert('RGBA')
    bg = detect_bg_color(img)
    img = fill_watermark_region(img, bg)
    img = chroma_key(img, bg)
    img = fit_into_box(img, box_w, box_h, margin, rotate)
    out_path = ART / out_name
    backup = ART / f'{out_name}.genbak'
    if not backup.exists() and (out_path.exists()):
        out_path.replace(backup)
    img.save(out_path)
    print(f'  sprite: {out_name}  bg={bg} rot={rotate} -> {img.size[0]}x{img.size[1]}')


def process_background(src_name: str, out_name: str) -> None:
    src_path = GEN / src_name
    if not src_path.exists():
        print(f'  skip (missing) {src_name}')
        return
    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    # 右下水印区域：用右下方一小块海洋的均值填充
    sample_w = 60
    sample_x0 = w - sample_w - 10
    sample_y0 = h - 50
    sample = img.crop((sample_x0, sample_y0, w - 10, h - 10))
    fill_color = sample.resize((1, 1)).getpixel((0, 0))
    pixels = img.load()
    for y in range(int(h * 0.88), h):
        for x in range(int(w * 0.70), w):
            # 软填充，按到填充色距离混合
            r, g, b = pixels[x, y]
            k = 0.85
            pixels[x, y] = (
                int(r * (1 - k) + fill_color[0] * k),
                int(g * (1 - k) + fill_color[1] * k),
                int(b * (1 - k) + fill_color[2] * k),
            )
    # 缩放到 750x1334 等比（截掉上下少量以保 tile）
    target_w, target_h = 750, 1334
    scale = max(target_w / w, target_h / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    # 中心裁出 750x1334
    x0 = (new_w - target_w) // 2
    y0 = (new_h - target_h) // 2
    img = img.crop((x0, y0, x0 + target_w, y0 + target_h))

    out_path = ART / out_name
    backup = ART / f'{out_name}.genbak'
    if not backup.exists() and out_path.exists():
        out_path.replace(backup)
    img.save(out_path)
    print(f'  bg: {out_name}  -> {img.size[0]}x{img.size[1]}')


def process_cloud(src_name: str, out_name: str) -> None:
    src_path = GEN / src_name
    if not src_path.exists():
        print(f'  skip (missing) {src_name}')
        return
    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    target_w, target_h = 750, 1080
    scale = max(target_w / w, target_h / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    x0 = (new_w - target_w) // 2
    y0 = (new_h - target_h) // 2
    img = img.crop((x0, y0, x0 + target_w, y0 + target_h))
    out_path = ART / out_name
    backup = ART / f'{out_name}.genbak'
    if not backup.exists() and out_path.exists():
        out_path.replace(backup)
    img.save(out_path)
    print(f'  cloud: {out_name}  -> {img.size[0]}x{img.size[1]}')


def main() -> int:
    if not GEN.is_dir():
        print(f'ERROR: gen dir not found: {GEN}', file=sys.stderr)
        return 1
    print('Processing anchors -> assets/resources/art/')
    for entry in SPRITES:
        src, out, bw, bh, margin, rotate = entry
        process_sprite(src, out, bw, bh, margin, rotate)
    process_background(BG_IN, BG_OUT)
    process_cloud(CLOUD_IN, CLOUD_OUT)
    print('Done. Old files kept as *.genbak for rollback.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())