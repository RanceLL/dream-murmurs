#!/usr/bin/env python3
"""把 pictures/ 里上传的原图整理成游戏用的牌面。

python3 tools/build_cards.py

做的事：
  1. 读 pictures/ 下所有图片（jpg/png/gif/webp…，大小、比例、文件名都随意）
  2. 去掉重复的图（看起来一样的只留分辨率最高的那张）
  3. 每张裁成 2:3 竖版：比例接近的直接居中裁切，差太多的用模糊背景垫底、整张放进去
  4. 生成两种 WebP：cards/s/ 小图 320x480（手牌、桌面）和 cards/l/ 大图（点开看）
  5. 生成 cards/mini-*.webp：所有牌的缩略拼图，一次下载就能先显示模糊预览
  6. 写 cards/manifest.json：牌的顺序。已有的牌顺序不变，新图接在后面
文件名按原图内容的哈希取，内容不变名字就不变，浏览器可以永久缓存。
"""
import hashlib, io, json, os, sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps

VERSION = 'cards-v1'  # 改了裁切或压缩参数就改这里，所有文件会换新名字
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'pictures'
OUT = ROOT / 'cards'
SMALL = (320, 480)
LARGE_MAX, LARGE_MIN = 800, 480
MINI = (20, 30)
MINI_COLS = 20
EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.jfif', '.avif'}
DUP_BITS = 22  # 12x12 dHash 的汉明距离，小于等于它算同一张图
CROP_MIN, CROP_MAX = 0.55, 0.8  # 宽高比在这个范围内直接裁；否则模糊垫底


def load(path):
    im = Image.open(path)
    try:
        im.seek(0)  # 动图只取第一帧
    except EOFError:
        pass
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        bg.alpha_composite(im)
        im = bg
    return im.convert('RGB')


def dhash(im, n=12):
    g = ImageOps.fit(im, (200, 300)).convert('L').resize((n + 1, n), Image.LANCZOS)
    px = g.tobytes()
    bits = 0
    for r in range(n):
        for c in range(n):
            bits = (bits << 1) | (px[r * (n + 1) + c] > px[r * (n + 1) + c + 1])
    return bits


def to_card(im, size):
    """裁成或垫成 size 大小的 2:3 竖图。"""
    w, h = im.size
    r = w / h
    if CROP_MIN <= r <= CROP_MAX:
        return ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, 0.45))
    # 比例差太多：模糊放大的同一张图做背景，整张图放在中间
    bg = ImageOps.fit(im, (size[0] // 4, size[1] // 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    bg = bg.resize(size, Image.LANCZOS)
    bg = Image.blend(bg, Image.new('RGB', size, (11, 27, 28)), 0.35)
    fg = ImageOps.contain(im, size, Image.LANCZOS)
    bg.paste(fg, ((size[0] - fg.width) // 2, (size[1] - fg.height) // 2))
    return bg


def webp(im, q):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return b.getvalue()


def main():
    files = sorted(p for p in SRC.rglob('*') if p.is_file() and p.suffix.lower() in EXTS)
    if not files:
        print('pictures/ 里没有图片'); return 1
    old, old_man = {}, None
    man_path = OUT / 'manifest.json'
    if man_path.exists():
        try:
            old_man = json.loads(man_path.read_text())
            for i, c in enumerate(old_man['cards']):
                old[c['sha']] = i
        except Exception:
            old, old_man = {}, None
    items, bad = [], []
    for p in files:
        data = p.read_bytes()
        sha = hashlib.sha1(data).hexdigest()
        try:
            im = load(io.BytesIO(data))
        except Exception as e:
            bad.append((p, str(e))); continue
        items.append({'path': p, 'sha': sha, 'im': im, 'hash': dhash(im), 'px': im.width * im.height, 'bytes': len(data)})
    # 去重：同一张图的几个版本只留最清楚的
    items.sort(key=lambda it: (-it['px'], -it['bytes'], str(it['path'])))
    keep, dups = [], []
    for it in items:
        twin = next((k for k in keep if bin(k['hash'] ^ it['hash']).count('1') <= DUP_BITS), None)
        if twin:
            dups.append((it['path'], twin['path']))
        else:
            keep.append(it)
    # 顺序：已有的牌保持原位置，新的按文件路径排在后面
    keep.sort(key=lambda it: (0, old[it['sha']]) if it['sha'] in old else (1, str(it['path'])))
    for d in ('s', 'l'):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    cards, used = [], {'s': set(), 'l': set()}
    total_s = total_l = 0
    low = []
    for it in keep:
        im = it['im']
        key = hashlib.sha1((VERSION + it['sha']).encode()).hexdigest()[:12]
        cw = min(im.width, round(im.height * 2 / 3))
        lw = max(LARGE_MIN, min(LARGE_MAX, cw))
        lw -= lw % 2
        large = (lw, lw * 3 // 2)
        fs, fl = OUT / 's' / f'{key}.webp', OUT / 'l' / f'{key}.webp'
        if not fs.exists():
            fs.write_bytes(webp(to_card(im, SMALL), 74))
        if not fl.exists():
            fl.write_bytes(webp(to_card(im, large), 80))
        used['s'].add(fs.name); used['l'].add(fl.name)
        total_s += fs.stat().st_size; total_l += fl.stat().st_size
        if cw < 400:
            low.append((it['path'], im.size))
        cards.append({'k': key, 'sha': it['sha'], 'src': str(it['path'].relative_to(ROOT)).replace(os.sep, '/'), 'size': list(im.size)})
    # 删掉不再用到的旧文件
    removed = 0
    for d in ('s', 'l'):
        for f in (OUT / d).glob('*.webp'):
            if f.name not in used[d]:
                f.unlink(); removed += 1
    # 缩略拼图：牌没变就沿用上次的，免得换个 Pillow 版本就多出一次提交
    rows = (len(cards) + MINI_COLS - 1) // MINI_COLS
    om = (old_man or {}).get('mini') or {}
    same = old_man and [c['k'] for c in old_man['cards']] == [c['k'] for c in cards] and om.get('w') == MINI[0] and om.get('cols') == MINI_COLS
    if same and (OUT / om['file']).exists():
        mini_name = om['file']
        mini_bytes = (OUT / mini_name).read_bytes()
    else:
        atlas = Image.new('RGB', (MINI_COLS * MINI[0], rows * MINI[1]), (23, 58, 58))
        by_key = {it['sha']: it for it in keep}
        for i, c in enumerate(cards):
            atlas.paste(to_card(by_key[c['sha']]['im'], MINI), ((i % MINI_COLS) * MINI[0], (i // MINI_COLS) * MINI[1]))
        mini_bytes = webp(atlas, 50)
        mini_name = f"mini-{hashlib.sha1(mini_bytes).hexdigest()[:10]}.webp"
    for f in OUT.glob('mini-*.webp'):
        if f.name != mini_name:
            f.unlink()
    if not (OUT / mini_name).exists():
        (OUT / mini_name).write_bytes(mini_bytes)
    manifest = {
        'v': 1, 'n': len(cards), 'small': list(SMALL), 'large': [LARGE_MAX, LARGE_MAX * 3 // 2],
        'mini': {'file': mini_name, 'cols': MINI_COLS, 'rows': rows, 'w': MINI[0], 'h': MINI[1]},
        'cards': cards,
    }
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n')
    src_total = sum(it['bytes'] for it in items)
    print(f'原图 {len(files)} 张，共 {src_total / 1e6:.1f} MB')
    print(f'牌面 {len(cards)} 张：小图共 {total_s / 1e6:.1f} MB（平均 {total_s / max(1, len(cards)) / 1e3:.0f} KB），大图共 {total_l / 1e6:.1f} MB（平均 {total_l / max(1, len(cards)) / 1e3:.0f} KB），缩略拼图 {len(mini_bytes) / 1e3:.0f} KB')
    if dups:
        print(f'重复的图 {len(dups)} 张（没有放进牌堆）：')
        for a, b in dups:
            print(f'  {a.relative_to(ROOT)}  和  {b.relative_to(ROOT)}  是同一张')
    if low:
        print(f'分辨率偏低的 {len(low)} 张（点开看大图会有点糊）：')
        for p, s in low:
            print(f'  {p.relative_to(ROOT)}  {s[0]}x{s[1]}')
    if bad:
        print(f'读不出来的文件 {len(bad)} 个：')
        for p, e in bad:
            print(f'  {p.relative_to(ROOT)}  {e}')
    if removed:
        print(f'删掉了 {removed} 个不再用到的旧牌面文件')
    return 0


if __name__ == '__main__':
    sys.exit(main())
