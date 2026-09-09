"""Clean up PNG asset alpha. Keeps only the main shape (largest connected
component of well-opaque pixels) plus its antialiasing halo; trims items to
their non-transparent bbox.

Run from the project root with the managed Python venv:
    C:/Users/Gxmar/.workbuddy/binaries/python/envs/default/Scripts/python.exe tools/clean-art.py
"""
from pathlib import Path
import sys
from collections import deque
from PIL import Image

ART = Path(__file__).resolve().parent.parent / 'assets' / 'resources' / 'art'

# (filename, core_alpha, trim_to_bbox)
PLAN = {
    # Pixels with alpha >= CORE belong to the core of the main shape.
    # Ghost wings / duplicate outlines sit in a separate alpha range below
    # the core but above the antialiasing edge, so a flat threshold can't
    # kill them without chewing the silhouette. Connected-component on the
    # core isolates the main shape correctly.
    'enemy_normal.png': (200, False),
    'enemy_fast.png':   (200, False),
    'enemy_elite.png':  (200, False),
    'transport.png':    (200, False),
    'boss.png':         (200, False),
    'item_l.png':       (0,   True),
    'item_b.png':       (0,   True),
}


def keep_main_shape(img: Image.Image, core_alpha: int) -> None:
    """Drop every pixel that is not reachable from the largest core blob.

    The "core" is every pixel with alpha >= core_alpha. We compute the
    largest connected component of those pixels (4-neighbour), then drop
    all pixels that do not belong to it. Antialiasing edges (alpha below
    core) are kept only if they remain 4-adjacent to the kept core via
    a thin band, so the silhouette stays smooth.
    """
    w, h = img.size
    pixels = img.load()
    core_mask = [[pixels[x, y][3] >= core_alpha for x in range(w)] for y in range(h)]

    # Largest connected component (4-neighbour BFS).
    labels = [[-1] * w for _ in range(h)]
    sizes: dict[int, int] = {}
    label = 0
    for y in range(h):
        for x in range(w):
            if not core_mask[y][x] or labels[y][x] != -1:
                continue
            q = deque([(x, y)])
            labels[y][x] = label
            count = 0
            while q:
                cx, cy = q.popleft()
                count += 1
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h and core_mask[ny][nx] and labels[ny][nx] == -1:
                        labels[ny][nx] = label
                        q.append((nx, ny))
            sizes[label] = count
            label += 1

    if not sizes:
        return
    main_label = max(sizes, key=sizes.get)

    # Build keep mask: main core + halo pixels connected to it through a
    # chain of progressively translucent pixels (alpha >= 20). Without
    # this step the antialiasing edge would vanish and the shape would
    # look jagged.
    keep = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if labels[y][x] == main_label:
                keep[y][x] = True

    # Allow halo pixels adjacent to a kept pixel to remain if their alpha
    # is at least 20 (covers the soft edge gradient up to ~92% transparent).
    changed = True
    while changed:
        changed = False
        for y in range(h):
            for x in range(w):
                if keep[y][x] or pixels[x, y][3] < 20:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and keep[ny][nx]:
                        keep[y][x] = True
                        changed = True
                        break

    for y in range(h):
        for x in range(w):
            if not keep[y][x]:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)


def clean(src: Path, core_alpha: int, trim: bool) -> None:
    img = Image.open(src).convert('RGBA')
    w, h = img.size
    if core_alpha > 0:
        keep_main_shape(img, core_alpha)
    if trim:
        bbox = img.getbbox()
        if bbox and bbox != (0, 0, w, h):
            img = img.crop(bbox)
    img.save(src)
    print(f'  -> {src.name}: core_alpha={core_alpha}'
          f'{"; trimmed" if trim else ""}'
          f' -> {img.size[0]}x{img.size[1]}')


def main() -> int:
    if not ART.is_dir():
        print(f'ERROR: art folder not found: {ART}', file=sys.stderr)
        return 1
    print(f'Cleaning PNGs in {ART}')
    changed = 0
    for name, (core, trim) in PLAN.items():
        path = ART / name
        if not path.exists():
            print(f'  - skip (missing) {name}')
            continue
        before = path.stat().st_size
        clean(path, core, trim)
        after = path.stat().st_size
        if after != before:
            changed += 1
    print(f'Done. {changed} files rewritten (UUIDs preserved).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())