"""修复 CardSwiper.vue 双 BOM（保留单个 UTF-8 BOM）。"""
import pathlib

p = pathlib.Path(r"D:\6\恋爱小程序\apps\client\src\components\discover\CardSwiper.vue")
data = p.read_bytes()
bom = b"\xef\xbb\xbf"
if data.startswith(bom + bom):
    p.write_bytes(data[len(bom):])
    print("OK: 双 BOM 已修复为单 BOM")
else:
    print("SKIP: 非双 BOM（无需修复）")
