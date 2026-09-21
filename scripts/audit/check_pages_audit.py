# -*- coding: utf-8 -*-
"""全页面审计：异步数据加载特征 / 骨架屏覆盖 / 导航死链。
只读扫描，不改任何文件。输出三类清单供人工逐项处置。
"""
import json, os, re, sys

SRC = r"D:\6\恋爱小程序\apps\client\src"

# 1. 解析 pages.json（去注释）
raw = open(os.path.join(SRC, "pages.json"), encoding="utf-8").read()
raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
raw = re.sub(r"^\s*//.*$", "", raw, flags=re.M)
conf = json.loads(raw)
pages = [p["path"] for p in conf.get("pages", [])]
for sp in conf.get("subPackages", []):
    for p in sp.get("pages", []):
        pages.append(sp["root"] + "/" + p["path"])
pageset = set(pages)

# 2. ROUTES 常量表（constants/routes.ts）中的路径值
routes_ts = open(os.path.join(SRC, "constants", "routes.ts"), encoding="utf-8").read()
route_vals = set(re.findall(r'"(/[A-Za-z0-9_\-/]+)"', routes_ts))

# 3. 注册页文件存在的路由值（合法目标）
valid_targets = set()
for p in pages:
    valid_targets.add("/" + p)

NAV_RE = re.compile(
    r'(?:openAppPath|navigateTo|redirectTo|switchTabWithQuery|switchTab|reLaunch)\s*\(\s*["\'`]([^"\'`]+)["\'`]'
)
ASYNC_RE = re.compile(r"(clientApi|\.list\(|\.detail\(|request<|fetch[A-Z]|await\s+\w+Store\.|bootstrap\()")
SKELETON_RE = re.compile(r"(SkeletonBlock|PageStateContainer|skeleton)")
SPINNER_RE = re.compile(r"(loading-spinner|uni-load-more|loading-dot|加载中|loadingMore)")

report = {"pages": [], "dead_links": [], "hardcoded_nav": []}
for rel in sorted(pages):
    fp = os.path.join(SRC, rel + ".vue")
    if not os.path.exists(fp):
        report["pages"].append((rel, "MISSING_FILE", "", ""))
        continue
    code = open(fp, encoding="utf-8").read()
    has_async = bool(ASYNC_RE.search(code))
    has_skeleton = bool(SKELETON_RE.search(code))
    has_spinner = bool(SPINNER_RE.search(code))
    # 模板里导航调用的目标
    targets = NAV_RE.findall(code)
    bad = [t for t in targets if not t.startswith("ROUTES") and t not in valid_targets and t not in route_vals and not t.startswith("/") is False]
    hard = [t for t in targets if t not in valid_targets]
    report["pages"].append((rel, "ASYNC" if has_async else "static",
                            "SKEL" if has_skeleton else ("spinner" if has_spinner else "-"),
                            "hardnav:" + ",".join(hard[:4]) if hard else ""))

print("=" * 100)
print(f"{'页面':58} {'加载':6} {'骨架':8} 备注")
print("-" * 100)
need_skel = []
for rel, kind, skel, note in report["pages"]:
    flag = ""
    if kind == "ASYNC" and skel == "-":
        flag = "  <<< 缺骨架"
        need_skel.append(rel)
    print(f"{rel:58} {kind:6} {skel:8} {note}{flag}")
print("-" * 100)
print("异步页缺骨架清单:", len(need_skel))
for r in need_skel:
    print("  -", r)
