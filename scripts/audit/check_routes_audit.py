# -*- coding: utf-8 -*-
"""死链审计 v2：只检查页面导航调用的目标字符串。"""
import json, os, re, glob

SRC = r"D:\6\恋爱小程序\apps\client\src"

raw = open(os.path.join(SRC, "pages.json"), encoding="utf-8").read()
raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
raw = re.sub(r"^\s*//.*$", "", raw, flags=re.M)
conf = json.loads(raw)
pages = [p["path"] for p in conf.get("pages", [])]
for sp in conf.get("subPackages", []):
    for p in sp.get("pages", []):
        pages.append(sp["root"] + "/" + p["path"])
valid = {"/" + p for p in pages}

routes_ts = open(os.path.join(SRC, "constants", "routes.ts"), encoding="utf-8").read()
route_map = {}
for m in re.finditer(r'"?([A-Za-z][A-Za-z0-9_]*)"?\s*:\s*"(/[^"]*)"', routes_ts):
    route_map[m.group(1)] = m.group(2)
bad_routes = {k: v for k, v in route_map.items() if v not in valid}
print(f"ROUTES 常量 {len(route_map)} 个；死路由: {len(bad_routes)}")
for k, v in bad_routes.items():
    print(f"  [DEAD-ROUTE] {k} -> {v}")

# 导航模式：函数名( 后接模板字符串或普通字符串，只取参数第一个字符串字面量
FN_NAMES = ["openAppPath", "openUserProfile", "switchTabWithQuery", "switchTab",
            "navigateTo", "redirectTo", "reLaunch", "navigateBack"]
# 定位 "xxx( 反引号" / "xxx( '引号" 的调用点，然后向后截取 200 字符找字符串
issues = []
count = 0
for fp in glob.glob(os.path.join(SRC, "**", "*.vue"), recursive=True) + glob.glob(os.path.join(SRC, "**", "*.ts"), recursive=True):
    rel = os.path.relpath(fp, SRC).replace("\\", "/")
    if "node_modules" in rel or ".spec." in rel or "compat/" in rel:
        continue
    code = open(fp, encoding="utf-8").read()
    for fn in FN_NAMES:
        for m in re.finditer(fn + r"\s*\(", code):
            tail = code[m.end():m.end() + 220]
            # 跳过非导航（如 navigateBack()）
            s1 = re.match(r"\s*(\`[^\`]+\`|'[^']+'|\"[^\"]+\")", tail)
            if not s1:
                continue
            lit = s1.group(1)
            if lit.startswith("`"):
                inner = lit[1:-1]
                static_prefix = inner.split("${")[0].split("?")[0]
            else:
                static_prefix = lit[1:-1].split("?")[0]
            if not static_prefix.startswith("/"):
                continue
            count += 1
            # openUserProfile 传 userId 参数而不是路径——跳过参数调用
            if fn == "openUserProfile" and not static_prefix.startswith("/subpackages/profile-extra/profile/other"):
                continue
            if static_prefix not in valid:
                issues.append((rel, fn, static_prefix[:90]))

# 附加扫描：uni.navigateTo/uni.redirectTo 的 url: 属性
for fp in glob.glob(os.path.join(SRC, "**", "*.vue"), recursive=True):
    rel = os.path.relpath(fp, SRC).replace("\\", "/")
    if "node_modules" in rel:
        continue
    code = open(fp, encoding="utf-8").read()
    for m in re.finditer(r"url:\s*(\`[^\`]+\`|'[^']+'|\"[^\"]+\")", code):
        lit = m.group(1)
        inner = lit[1:-1]
        prefix = inner.split("${")[0].split("?")[0]
        if prefix.startswith("/"):
            count += 1
            if prefix not in valid:
                issues.append((rel, "url:", prefix[:90]))

seen = set()
uniq = []
for rel, fn, target in issues:
    key = (rel, target)
    if key in seen:
        continue
    seen.add(key)
    uniq.append((rel, fn, target))

print(f"\n导航目标检查 {count} 处；疑似死链 {len(uniq)} 处：")
for rel, fn, target in uniq:
    print(f"  [{fn}] {rel} -> {target}")
