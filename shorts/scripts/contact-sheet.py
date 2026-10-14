"""Tiles out/stills/<prefix>-*.png into one labelled contact sheet: python3 scripts/contact-sheet.py Day1 out/contact.png"""
import glob, sys
from PIL import Image, ImageDraw

prefix, out = (sys.argv[1:] + ['Day1', 'out/contact.png'])[:2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
files = sorted(glob.glob(f'out/stills/{prefix}-*.png'))
tw, th, pad = 360, 640, 8
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad + 28) + pad), (40, 40, 40))
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + pad + 28)
    sheet.paste(im, (x, y + 28))
    # safe zones: top 150 / bottom 350 px of 1920 (scaled), middle third
    s = th / 1920
    draw.line([(x, y + 28 + 150 * s), (x + tw, y + 28 + 150 * s)], fill=(255, 80, 80), width=1)
    draw.line([(x, y + 28 + (1920 - 350) * s), (x + tw, y + 28 + (1920 - 350) * s)], fill=(255, 80, 80), width=1)
    frame = int(f.rsplit('-', 1)[1].split('.')[0])
    draw.text((x + 4, y + 6), f'frame {frame}  ({frame / 30:.1f}s)', fill=(230, 230, 230))
sheet.save(out)
print(out, sheet.size)
