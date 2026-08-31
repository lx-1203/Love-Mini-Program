from PIL import Image
import os, shutil

def dhash(img, size=16):
    g = img.convert('L').resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = []
    for r in range(size):
        for c in range(size):
            bits.append(1 if px[r * (size + 1) + c] > px[r * (size + 1) + c + 1] else 0)
    return bits

def ham(a, b):
    return sum(x != y for x, y in zip(a, b))

for v in ['v1', 'v2', 'v3']:
    files = sorted(f for f in os.listdir(v) if f.endswith('.jpg'))
    outdir = '_key_' + v
    os.makedirs(outdir, exist_ok=True)
    last = None
    kept = 0
    for f in files:
        n = int(f[1:6])
        t = (n - 1) / 2.0
        img = Image.open(os.path.join(v, f))
        h = dhash(img)
        if last is None or ham(h, last) >= 16:
            last = h
            kept += 1
            shutil.copy(os.path.join(v, f), os.path.join(outdir, 's%07.1f.jpg' % t))
    print(v, 'kept', kept, 'of', len(files))
