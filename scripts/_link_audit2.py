# -*- coding: utf-8 -*-
"""链路通顺研究v2：前端url末段 → 后端注解字符串存在性（可靠匹配）"""
import os, re, io, json

ROOT = r"D:\6\恋爱小程序"
BACKEND = os.path.join(ROOT, "apps", "api", "src", "main", "java")

# 后端所有注解路径字符串（@XxxMapping("...") 中的字符串）
be_ann = []
for dirpath, _, files in os.walk(BACKEND):
    for fn in files:
        if not fn.endswith(".java") or "test" in dirpath:
            continue
        src = io.open(os.path.join(dirpath, fn), encoding="utf-8", errors="replace").read()
        for m in re.finditer(r'@(?:Get|Post|Put|Delete|Patch|Request)Mapping.*?"([^"]+)"', src):
            be_ann.append(m.group(1))

# 后端路径段集合
be_seg = set()
for p in be_ann:
    for seg in p.strip("/").split("/"):
        if seg and not seg.startswith("{") and seg not in ("api", "v1"):
            be_seg.add(seg)

CLIENT = os.path.join(ROOT, "apps", "client", "src")
fe = []
for dirpath, _, files in os.walk(CLIENT):
    for fn in files:
        if not fn.endswith((".ts", ".vue")):
            continue
        rel = os.path.relpath(os.path.join(dirpath, fn), CLIENT)
        src = io.open(os.path.join(dirpath, fn), encoding="utf-8", errors="replace").read()
        for m in re.finditer(r'url:\s*["`]([^"`]+)["`]', src):
            fe.append((m.group(1), rel))

def clean(s):
    s = re.sub(r"\$\{[^}]+\}", "x", s)
    s = re.sub(r"\{[^}]+\}", "x", s)
    return s

miss, verified, seen = [], [], set()
for url, rel in fe:
    path = clean(url.split("?")[0])
    if not path.startswith("/"):
        continue
    key = (path, rel)
    if key in seen:
        continue
    seen.add(key)
    segs = [s for s in path.strip("/").split("/") if s and s not in ("api", "v1")]
    if not segs:
        continue
    hit = any(clean(s) in be_seg for s in segs)
    (verified if hit else miss).append((path, rel))

out = {"frontend_unique": len(seen), "backend_segs": len(be_seg),
       "verified": len(verified), "miss": len(miss), "miss_list": sorted(set(miss))}
print(json.dumps(out, ensure_ascii=False, indent=1))
with io.open(os.path.join(ROOT, "scripts", "_link_audit2_result.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)