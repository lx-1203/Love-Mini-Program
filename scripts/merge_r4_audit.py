# -*- coding: utf-8 -*-
"""
R4 全量审计合并去重脚本
- 读取 audit-round3/ 下 8 个代理 TSV 输出
- 校验 10 列格式
- 去重：键 = (文件, 行号, 归一化描述前40字)
- 与既有清单比对 legacy-link（FIN-1340 / R2-549）
- 分配 R4-00001 起连续编号
- 输出：audit-round3/R4-FINAL.tsv + 报告/1000-AUDIT/01-问题清单-全量.md
"""
import csv
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
ROUND3 = os.path.join(ROOT, "audit-round3")

SOURCE_FILES = [
    "client-pages1.tsv",
    "client-pages2.tsv",
    "client-store.tsv",
    "client-infra.tsv",
    "api-core.tsv",
    "api-domain.tsv",
    "api-infra.tsv",
    "admin-infra.tsv",
]

# 既有清单（用于 legacy-link 比对，键 = 文件路径归一化）
def load_legacy(path, prefix):
    """载入既有清单：返回 {归一化文件: [描述片段...]}"""
    index = {}
    if not os.path.exists(path):
        return index
    with io.open(path, "r", encoding="utf-8-sig", errors="ignore") as f:
        for line in f:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 6:
                continue
            fpath = parts[1].replace("\\", "/").lower()
            desc = parts[5] if len(parts) > 5 else ""
            index.setdefault(fpath, []).append(desc[:40])
    return index

def norm_path(p):
    return p.replace("\\", "/").lower()

def load_legacy_fin():
    idx = {}
    p = os.path.join(ROOT, "报告", "CONSOLIDATED-ISSUE-LIST-1000+.md")
    if not os.path.exists(p):
        return idx
    with io.open(p, "r", encoding="utf-8-sig", errors="ignore") as f:
        for line in f:
            parts = [x.strip() for x in line.split("|")]
            if len(parts) < 6 or not parts[0].startswith("FIN-"):
                continue
            idx.setdefault(norm_path(parts[1]), []).append(parts[5][:40])
    return idx

def load_legacy_r2():
    idx = {}
    p = os.path.join(ROOT, "audit-round2", "R3-ROUND2-ISSUES.tsv")
    if not os.path.exists(p):
        return idx
    with io.open(p, "r", encoding="utf-8-sig", errors="ignore") as f:
        for line in f:
            parts = [x.strip() for x in line.split("|")]
            if len(parts) < 6:
                continue
            # R2 格式：R2-00001|client|file|lines|SEVERITY|desc|...
            fpath = norm_path(parts[2])
            idx.setdefault(fpath, []).append(parts[5][:40])
    return idx

def main():
    legacy_fin = load_legacy_fin()
    legacy_r2 = load_legacy_r2()

    seen = set()
    rows = []
    skip = 0
    for fn in SOURCE_FILES:
        fp = os.path.join(ROUND3, fn)
        if not os.path.exists(fp):
            print(f"[warn] 缺输出文件: {fn}")
            continue
        with io.open(fp, "r", encoding="utf-8-sig", errors="ignore") as f:
            for lineno, line in enumerate(f, 1):
                line = line.rstrip("\n").rstrip("\r")
                if not line.strip():
                    continue
                parts = line.split("|")
                if len(parts) < 10:
                    # 允许描述/影响含 | 的折行数据：取前2列与后8列
                    print(f"[warn] {fn}:{lineno} 列数 {len(parts)}，尝试重组")
                    if len(parts) > 10:
                        head = parts[:2]
                        tail = parts[-(8):]
                        parts = head + ["|".join(parts[2:-8])] + tail
                    else:
                        print(f"[skip] 无法解析: {line[:80]}")
                        skip += 1
                        continue
                rid, fpath, line_no, dim, sev, desc, impact, fix, status, batch = parts[:10]
                fpath = fpath.strip()
                # 归一化
                np = norm_path(fpath)
                line_no = line_no.strip()
                dkey = re.sub(r"\s+", "", desc)[:40]
                key = (np, line_no, dkey)
                if key in seen:
                    continue
                seen.add(key)
                # legacy-link 判定
                link = ""
                if np in legacy_fin and any(dkey in d or d in dkey for d in legacy_fin[np]):
                    link = "FIN-dup"
                elif np in legacy_r2 and any(dkey in d or d in legacy_r2[np] for d in legacy_r2[np]):
                    link = "R2-dup"
                rows.append([rid, fpath, line_no, dim, sev, desc, impact, fix, status, batch, link])

    # 编号
    for i, r in enumerate(rows, 1):
        r[0] = f"R4-{i:05d}"

    # 统计
    sev_count = {}
    dim_count = {}
    for r in rows:
        sev_count[r[4]] = sev_count.get(r[4], 0) + 1
        dim_count[r[3]] = dim_count.get(r[3], 0) + 1

    # 输出 TSV
    out_tsv = os.path.join(ROUND3, "R4-FINAL.tsv")
    with io.open(out_tsv, "w", encoding="utf-8", newline="") as f:
        for r in rows:
            f.write("|".join(r) + "\n")

    # 输出 MD（报告/1000-AUDIT/01）
    md_dir = os.path.join(ROOT, "报告", "1000-AUDIT")
    os.makedirs(md_dir, exist_ok=True)
    out_md = os.path.join(md_dir, "01-问题清单-全量.md")
    with io.open(out_md, "w", encoding="utf-8") as f:
        f.write("# R4 全量审计问题清单（2026-08-09）\n\n")
        f.write(f"> 总问题数：**{len(rows)}** 条（去重后）\n\n")
        f.write("## 统计概览\n\n| 严重度 | 数量 |\n|---|---|\n")
        for s in ("P0", "P1", "P2", "P3"):
            f.write(f"| {s} | {sev_count.get(s, 0)} |\n")
        f.write("\n| 维度 | 数量 |\n|---|---|\n")
        for d in ("H", "T", "B", "F", "U", "D", "S"):
            f.write(f"| {d} | {dim_count.get(d, 0)} |\n")
        f.write("\n| 来源 | 数量 |\n|---|---|\n")
        f.write(f"| 与既有清单重复标记 | {sum(1 for r in rows if r[10])} |\n")
        f.write("\n## 问题清单\n\n")
        f.write("| 编号 | 文件 | 行号 | 维度 | 严重度 | 描述 | 商业化影响 | 修复方向 | 状态 | 修复批次 | legacy |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|---|\n")
        for r in rows:
            f.write("|" + "|".join(r) + "|\n")

    print(f"合计 {len(rows)} 条（去重后）；跳过无法解析 {skip} 条")
    print(f"P0={sev_count.get('P0',0)} P1={sev_count.get('P1',0)} P2={sev_count.get('P2',0)} P3={sev_count.get('P3',0)}")
    print(f"维度: " + " ".join(f"{k}={v}" for k, v in sorted(dim_count.items())))
    print(f"输出: {out_tsv}")
    print(f"输出: {out_md}")

if __name__ == "__main__":
    main()
