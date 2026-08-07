#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
素材 URL 全量核查脚本
任务：
1. 从 MySQL campus_love 数据库导出所有图片/语音/外链 URL（去重）。
2. 从 Flyway seed 文件提取所有素材 URL（含 CONCAT 动态生成）。
3. 从前端/设计稿/配置代码中提取素材 URL。
4. 对每个唯一 URL 执行 HEAD/GET 探测，记录 HTTP 状态与耗时。
5. 按域名分类，识别非允许域名并评估版权风险。
6. 定位失败/风险 URL 的精确来源（数据库表字段、seed 文件行号、代码文件行号）。
7. 输出核查报告（Markdown）。

约束：
- 只读核查，不修改数据库或代码。
- 允许图片域名：Unsplash、Pexels、Pixabay。
- 允许语音示例：MDN CC0。
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import pymysql

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FLYWAY_SQL_DIR = PROJECT_ROOT / "database" / "flyway" / "sql"
REPORT_PATH = PROJECT_ROOT / "doc" / "reports" / "material-url-audit-report.md"

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "hyp5022940",
    "database": "campus_love",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}

# 允许的免费可商用域名白名单（图片）
ALLOWED_IMAGE_DOMAINS = {
    "images.unsplash.com",
    "unsplash.com",
    "images.pexels.com",
    "pexels.com",
    "cdn.pixabay.com",
    "pixabay.com",
}

# 允许的语音/音频示例域名（CC0 / 公有领域）
ALLOWED_AUDIO_DOMAINS = {
    "interactive-examples.mdn.mozilla.net",
}

# 外部跳转/配置类域名（非图片/语音素材，仅记录）
EXTERNAL_LINK_DOMAINS = {
    "www.xinli001.com",
    "study.163.com",
    "www.psycom.net",
    "www.coursera.org",
    "www.16personalities.com",
}

REQUEST_TIMEOUT = 15  # 秒
MAX_RETRIES = 2

# 需要扫描源码的目录与扩展名
CODE_DIRS = [
    PROJECT_ROOT / "apps" / "client",
    PROJECT_ROOT / "apps" / "admin",
    PROJECT_ROOT / "apps" / "admin-legacy",
    PROJECT_ROOT / "design-preview",
    PROJECT_ROOT / "design-system",
    PROJECT_ROOT / "design-archive",
]
CODE_EXTS = {"*.ts", "*.tsx", "*.js", "*.jsx", "*.vue", "*.html", "*.scss", "*.css", "*.json", "*.sql", "*.md"}

# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------


def extract_urls(text):
    """从文本中提取 http(s) URL。"""
    if not text:
        return []
    pattern = r'https?://[^\s\'"\)]+'
    return re.findall(pattern, text)


def clean_url(url):
    """去除 URL 末尾可能粘附的标点。"""
    return url.rstrip("',.;)")


def is_meaningful_url(url):
    """
    判断 URL 是否指向具体资源，而非 CONCAT 模板中的基础路径。
    """
    parsed = urlparse(url)
    path = parsed.path
    if parsed.netloc in ("images.pexels.com", "pexels.com"):
        if re.search(r"/photos/\d+/pexels-photo-\d+\.jpe?g", path):
            return True
        return False
    if path in ("", "/"):
        return False
    return True


def get_domain(url):
    """获取 URL 的域名。"""
    try:
        parsed = urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return "unknown"


def is_allowed_image_domain(domain):
    """判断域名是否在允许的图片图床白名单内（支持子域名）。"""
    domain = domain.lower()
    for allowed in ALLOWED_IMAGE_DOMAINS:
        if domain == allowed or domain.endswith("." + allowed):
            return True
    return False


def is_allowed_audio_domain(domain):
    """判断域名是否在允许的音频示例白名单内（支持子域名）。"""
    domain = domain.lower()
    for allowed in ALLOWED_AUDIO_DOMAINS:
        if domain == allowed or domain.endswith("." + allowed):
            return True
    return False


def classify_url(url):
    """对 URL 进行分类：image / audio / external-link / unknown。"""
    domain = get_domain(url)
    lower = url.lower()
    image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"]
    audio_exts = [".mp3", ".ogg", ".wav", ".m4a", ".aac", ".flac"]
    if any(ext in lower for ext in image_exts):
        return "image"
    if any(ext in lower for ext in audio_exts):
        return "audio"
    if is_allowed_image_domain(domain):
        return "image"
    if is_allowed_audio_domain(domain):
        return "audio"
    if domain in EXTERNAL_LINK_DOMAINS or "example.com" in domain or domain.endswith(".example.com"):
        return "external-link"
    return "unknown"


def check_url(url):
    """
    对单个 URL 执行 HEAD/GET 探测。
    先尝试 HEAD，若 405/403/501 则降级为 GET。
    返回 dict：{status, method, elapsed_ms, error, redirect_url}
    """
    result = {
        "status": None,
        "method": None,
        "elapsed_ms": None,
        "error": None,
        "redirect_url": None,
    }

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": "https://www.pexels.com/",
    }

    last_error = None
    start = None
    for _ in range(MAX_RETRIES + 1):
        for method in ("HEAD", "GET"):
            req = urllib.request.Request(url, headers=headers, method=method)
            start = time.time()
            try:
                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                    elapsed = (time.time() - start) * 1000
                    result["status"] = resp.getcode()
                    result["method"] = method
                    result["elapsed_ms"] = round(elapsed, 2)
                    final_url = resp.geturl()
                    if final_url and final_url != url:
                        result["redirect_url"] = final_url
                    return result
            except urllib.error.HTTPError as e:
                elapsed = (time.time() - start) * 1000
                if method == "HEAD" and e.code in (405, 403, 501):
                    last_error = f"HEAD {e.code}"
                    continue
                result["status"] = e.code
                result["method"] = method
                result["elapsed_ms"] = round(elapsed, 2)
                result["error"] = str(e)
                return result
            except Exception as e:
                elapsed = (time.time() - start) * 1000
                last_error = f"{method} {type(e).__name__}: {e}"
                continue

    result["error"] = last_error or "unknown error"
    result["elapsed_ms"] = round((time.time() - start) * 1000, 2) if start else None
    return result


def query_db_urls():
    """查询数据库中所有图片/语音/外链相关 URL。"""
    urls = []
    queries = [
        ("users", "avatar_url", "id"),
        ("user_basic_profile", "photo_gallery", "user_id"),
        ("user_basic_profile", "profile_background_url", "user_id"),
        ("user_basic_profile", "half_body_photo_url", "user_id"),
        ("posts", "images", "id"),
        ("campus_topics", "images", "id"),
        ("activities", "participant_avatars", "id"),
        ("shop_items", "image_url", "id"),
        ("circle_topics", "images", "id"),
        ("official_accounts", "icon_url", "id"),
        ("official_messages", "card_target_url", "id"),
        ("app_config", "config_value", "config_key"),
    ]

    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cur:
            for table, field, pk_field in queries:
                cur.execute(
                    "SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    (DB_CONFIG["database"], table, field),
                )
                if cur.fetchone()["cnt"] == 0:
                    print(f"[DB] 跳过不存在的表/字段: {table}.{field}")
                    continue

                sql = f"SELECT `{pk_field}` AS pk, `{field}` AS val FROM `{table}` WHERE `{field}` IS NOT NULL AND `{field}` != ''"
                try:
                    cur.execute(sql)
                    rows = cur.fetchall()
                except Exception as e:
                    print(f"[DB] 查询失败 {table}.{field}: {e}")
                    continue

                for row in rows:
                    val = row["val"]
                    pk = row["pk"]
                    if val is None:
                        continue
                    try:
                        parsed = json.loads(val)
                        if isinstance(parsed, list):
                            candidates = parsed
                        else:
                            candidates = [str(parsed)]
                    except (json.JSONDecodeError, TypeError):
                        candidates = [val]

                    for candidate in candidates:
                        if not isinstance(candidate, str):
                            continue
                        for raw_url in extract_urls(candidate):
                            url = clean_url(raw_url)
                            if url and is_meaningful_url(url):
                                urls.append({
                                    "url": url,
                                    "table": table,
                                    "field": field,
                                    "pk": pk,
                                    "source": "database",
                                })
    finally:
        if conn:
            conn.close()
    return urls


def parse_seed_files():
    """解析 Flyway seed 文件，提取 URL 并记录来源。"""
    urls = []
    if not FLYWAY_SQL_DIR.exists():
        print(f"[SEED] 目录不存在: {FLYWAY_SQL_DIR}")
        return urls

    seed_files = sorted(FLYWAY_SQL_DIR.glob("V*.sql"))
    for file_path in seed_files:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        for line_no, line in enumerate(lines, start=1):
            stripped = line.strip()
            if stripped.startswith("--"):
                continue
            for raw_url in extract_urls(line):
                url = clean_url(raw_url)
                if url and is_meaningful_url(url):
                    urls.append({
                        "url": url,
                        "file": file_path.name,
                        "line": line_no,
                        "source": "seed",
                    })
    return urls


def parse_code_files():
    """扫描源码/设计稿/配置中的 URL。"""
    urls = []
    for base_dir in CODE_DIRS:
        if not base_dir.exists():
            continue
        for ext in CODE_EXTS:
            for file_path in base_dir.rglob(ext):
                # 跳过依赖和构建产物
                parts = set(file_path.parts)
                if {"node_modules", "dist", ".git", ".venv", ".vscode", ".idea"} & parts:
                    continue
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                except Exception:
                    continue
                rel = file_path.relative_to(PROJECT_ROOT).as_posix()
                for line_no, line in enumerate(lines, start=1):
                    if line.strip().startswith("//") or line.strip().startswith("*"):
                        continue
                    for raw_url in extract_urls(line):
                        url = clean_url(raw_url)
                        if url and is_meaningful_url(url):
                            urls.append({
                                "url": url,
                                "file": rel,
                                "line": line_no,
                                "source": "code",
                            })
    return urls


def generate_dynamic_urls():
    """
    根据 seed 文件中的 CONCAT 公式，生成实际会被插入数据库的动态 URL。
    """
    generated = []
    base_pattern = "https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg?auto=compress&cs=tinysrgb&w={w}&h={h}&fit=crop"

    # user_basic_profile.photo_gallery 第二张照片：220453 + (u.id MOD 40)，u.id 10001-10056
    photo_ids_40 = {220453 + (uid % 40) for uid in range(10001, 10057)}
    for pid in sorted(photo_ids_40):
        generated.append({
            "url": base_pattern.format(photo_id=pid, w=600, h=600),
            "file": "V2026.08.07.0022__seed_profiles_and_posts.sql",
            "line": 45,
            "source": "seed-generated",
            "note": "user_basic_profile.photo_gallery (220453 + u.id MOD 40)",
        })

    # posts.images (0022 第一条动态): 220453 + (u.id MOD 60)，u.id 10001-10056
    photo_ids_60_a = {220453 + (uid % 60) for uid in range(10001, 10057)}
    for pid in sorted(photo_ids_60_a):
        generated.append({
            "url": base_pattern.format(photo_id=pid, w=600, h=400),
            "file": "V2026.08.07.0022__seed_profiles_and_posts.sql",
            "line": 79,
            "source": "seed-generated",
            "note": "posts.images 0022 first post (220453 + u.id MOD 60)",
        })

    # posts.images (0024 圈子帖子): 313601 + (u.id MOD 60)，u.id 10001-10050
    photo_ids_60_b = {313601 + (uid % 60) for uid in range(10001, 10051)}
    for pid in sorted(photo_ids_60_b):
        generated.append({
            "url": base_pattern.format(photo_id=pid, w=600, h=400),
            "file": "V2026.08.07.0024__seed_circle_posts_and_topics.sql",
            "line": 26,
            "source": "seed-generated",
            "note": "posts.images 0024 circle posts (313601 + u.id MOD 60)",
        })

    # shop_items.image_url 与 circle_topics.images 使用的固定 img_id
    fixed_img_ids = [257360, 313601, 936119, 1222271, 415829, 733872, 91227]
    for pid in fixed_img_ids:
        generated.append({
            "url": base_pattern.format(photo_id=pid, w=400, h=400),
            "file": "V2026.08.07.0025__seed_activities_checkin_wallet.sql",
            "line": 125,
            "source": "seed-generated",
            "note": "shop_items.image_url",
        })
        generated.append({
            "url": base_pattern.format(photo_id=pid, w=600, h=400),
            "file": "V2026.08.07.0025__seed_activities_checkin_wallet.sql",
            "line": 154,
            "source": "seed-generated",
            "note": "circle_topics.images",
        })

    return generated


def dedupe(url_records):
    """按 URL 去重，保留所有来源定位信息。"""
    mapping = defaultdict(list)
    for rec in url_records:
        mapping[rec["url"]].append(rec)
    return mapping


def build_report(unique_urls, url_sources, check_results):
    """构建 Markdown 核查报告。"""
    lines = []
    material_urls = [u for u in unique_urls if classify_url(u) in ("image", "audio")]
    failed_material = [
        u for u in material_urls
        if not check_results[u].get("status") or check_results[u].get("status") >= 400
    ]
    risky_urls = []
    for u in unique_urls:
        domain = get_domain(u)
        cls = classify_url(u)
        if cls == "image" and not is_allowed_image_domain(domain):
            risky_urls.append(u)
        if cls == "audio" and not is_allowed_audio_domain(domain):
            risky_urls.append(u)

    lines.append("# 恋爱小程序素材 URL 全量核查报告")
    lines.append("")
    lines.append(f"- 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- 核查范围：MySQL `campus_love` 数据库 + Flyway seed 文件 + 前端/设计稿/配置代码")
    lines.append(f"- 唯一 URL 总数：{len(unique_urls)}")
    lines.append(f"- 唯一素材 URL 总数（图片+语音）：{len(material_urls)}")
    lines.append(f"- 探测失败素材 URL：{len(failed_material)}")
    lines.append(f"- 非允许域名/版权风险 URL：{len(risky_urls)}")
    lines.append("")

    lines.append("## 执行摘要")
    lines.append("")
    if not failed_material and not risky_urls:
        lines.append("✅ 所有图片/语音素材 URL 均可访问且来自允许域名。")
    else:
        lines.append(f"- 图片素材：{sum(1 for u in material_urls if classify_url(u) == 'image')} 个唯一 URL；")
        lines.append(f"- 语音素材：{sum(1 for u in material_urls if classify_url(u) == 'audio')} 个唯一 URL；")
        if failed_material:
            pexels_404 = [u for u in failed_material if get_domain(u) == "images.pexels.com"]
            other_failed = [u for u in failed_material if get_domain(u) != "images.pexels.com"]
            lines.append(f"- ❌ 失败素材 {len(failed_material)} 个，其中 Pexels 404 {len(pexels_404)} 个（seed 中 `MOD` 算术生成的 ID 在 Pexels 上不存在），其他失败 {len(other_failed)} 个；")
        if risky_urls:
            lines.append(f"- ⚠️ 版权风险 {len(risky_urls)} 个：包含非允许域名的图片或音频 URL。")
    lines.append("")

    # 域名分布
    domain_count = defaultdict(int)
    domain_status = defaultdict(lambda: {"ok": 0, "fail": 0})
    for url in unique_urls:
        domain = get_domain(url)
        domain_count[domain] += 1
        res = check_results[url]
        status = res.get("status")
        if status and 200 <= status < 400:
            domain_status[domain]["ok"] += 1
        else:
            domain_status[domain]["fail"] += 1

    lines.append("## 一、域名分布")
    lines.append("")
    lines.append("| 域名 | URL 数量 | 成功 | 失败 | 合规性 |")
    lines.append("|------|---------|------|------|--------|")
    for domain, count in sorted(domain_count.items(), key=lambda x: -x[1]):
        cls = classify_url(f"https://{domain}/")
        if cls == "image" and is_allowed_image_domain(domain):
            compliance = "✅ 允许图床"
        elif cls == "audio" and is_allowed_audio_domain(domain):
            compliance = "✅ 允许音频示例"
        elif domain in EXTERNAL_LINK_DOMAINS or "example.com" in domain:
            compliance = "⚠️ 非素材链接/占位"
        else:
            compliance = "❌ 非允许域名"
        ok = domain_status[domain]["ok"]
        fail = domain_status[domain]["fail"]
        lines.append(f"| {domain} | {count} | {ok} | {fail} | {compliance} |")
    lines.append("")

    # 按分类汇总
    lines.append("## 二、URL 分类汇总")
    lines.append("")
    cat_count = defaultdict(int)
    for url in unique_urls:
        cat_count[classify_url(url)] += 1
    for cat, count in sorted(cat_count.items()):
        lines.append(f"- {cat}: {count}")
    lines.append("")

    # 失败 URL 列表
    failed = []
    risky = []
    for url in unique_urls:
        res = check_results[url]
        status = res.get("status")
        domain = get_domain(url)
        cls = classify_url(url)
        is_risk = False
        if cls == "image" and not is_allowed_image_domain(domain):
            is_risk = True
        if cls == "audio" and not is_allowed_audio_domain(domain):
            is_risk = True
        if not status or status >= 400 or res.get("error"):
            failed.append(url)
        if is_risk:
            risky.append(url)

    lines.append("## 三、HTTP 探测失败 URL")
    lines.append("")
    if not failed:
        lines.append("✅ 所有 URL 均可访问。")
    else:
        lines.append(f"❌ 共发现 {len(failed)} 个失败 URL：")
        lines.append("")
        lines.append("| URL | 状态码 | 方法 | 耗时(ms) | 错误信息 |")
        lines.append("|-----|--------|------|----------|----------|")
        for url in failed:
            res = check_results[url]
            lines.append(
                f"| {url} | {res.get('status') or '-'} | {res.get('method') or '-'} | "
                f"{res.get('elapsed_ms') or '-'} | {res.get('error') or '-'} |"
            )
        lines.append("")

    # 版权风险 URL
    lines.append("## 四、非允许域名 / 版权风险 URL")
    lines.append("")
    if not risky:
        lines.append("✅ 所有素材 URL 均来自允许域名。")
    else:
        lines.append(f"⚠️ 共发现 {len(risky)} 个风险 URL：")
        lines.append("")
        lines.append("| URL | 域名 | 分类 | 风险说明 |")
        lines.append("|-----|------|------|----------|")
        for url in risky:
            domain = get_domain(url)
            cls = classify_url(url)
            if "example.com" in domain:
                risk_note = "占位域名，不可访问"
            elif cls == "audio":
                risk_note = "非 CC0/免费可商用音频源，需替换"
            else:
                risk_note = "非 Unsplash/Pexels/Pixabay 免费图床，存在版权风险"
            lines.append(f"| {url} | {domain} | {cls} | {risk_note} |")
        lines.append("")

    # 精确来源定位
    lines.append("## 五、失败/风险 URL 精确来源定位")
    lines.append("")
    target_urls = set(failed) | set(risky)
    if not target_urls:
        lines.append("无。")
    else:
        for url in sorted(target_urls):
            lines.append(f"### {url}")
            lines.append("")
            sources = url_sources[url]
            for src in sources:
                if src.get("source") == "database":
                    lines.append(f"- 数据库：`{src['table']}.{src['field']}`，主键 `{src['pk']}`")
                elif src.get("source") in ("seed", "seed-generated"):
                    note = f" ({src.get('note')})" if src.get("note") else ""
                    lines.append(f"- Seed 文件：`{src['file']}` 第 {src['line']} 行{note}")
                elif src.get("source") == "code":
                    lines.append(f"- 源码文件：`{src['file']}` 第 {src['line']} 行")
                else:
                    lines.append(f"- 其他：{src}")
            lines.append("")

    # 修复建议
    lines.append("## 六、修复建议")
    lines.append("")
    if failed:
        lines.append("1. **不可访问 URL**：")
        lines.append("   - 对 404/403/超时失败的 URL，优先在 Pexels/Pixabay/Unsplash 搜索同主题替换图；")
        lines.append("   - 替换后同步更新 Flyway seed 文件，并重新执行迁移或增量修复脚本；")
        lines.append("   - 对占位域名（example.com）必须替换为真实可访问地址或清空。")
        lines.append("")
    if risky:
        lines.append("2. **版权风险 URL**：")
        lines.append("   - 将所有非允许域名的图片迁移至 Pexels / Unsplash / Pixabay；")
        lines.append("   - 语音示例仅使用 MDN CC0、Freesound CC0 等明确公有领域资源；")
        lines.append("   - 在 CI 中增加素材域名白名单校验，防止后续 seed 引入非法外链。")
        lines.append("")
    lines.append("3. **流程建议**：")
    lines.append("   - 建立素材 URL 白名单机制，seed 文件合入前强制校验域名；")
    lines.append("   - 定期（如每周）重跑本核查脚本，及时发现外链失效或新增风险；")
    lines.append("   - 生产环境用户上传图片应落盘至自有 CDN/对象存储，避免依赖第三方图床。")
    lines.append("")

    # 附录：全部 URL 检测结果
    lines.append("## 附录：全部唯一 URL 检测结果")
    lines.append("")
    lines.append("| URL | 分类 | 域名 | 状态码 | 方法 | 耗时(ms) | 重定向 |")
    lines.append("|-----|------|------|--------|------|----------|--------|")
    for url in sorted(unique_urls):
        res = check_results[url]
        domain = get_domain(url)
        cls = classify_url(url)
        redirect = res.get("redirect_url") or "-"
        lines.append(
            f"| {url} | {cls} | {domain} | {res.get('status') or '-'} | "
            f"{res.get('method') or '-'} | {res.get('elapsed_ms') or '-'} | {redirect} |"
        )
    lines.append("")

    return "\n".join(lines)


def main():
    print("[1/6] 查询数据库素材 URL ...")
    db_urls = query_db_urls()
    print(f"      从数据库提取 {len(db_urls)} 条 URL 记录")

    print("[2/6] 解析 Flyway seed 文件 ...")
    seed_urls = parse_seed_files()
    print(f"      从 seed 文件提取 {len(seed_urls)} 条 URL 记录")

    print("[3/6] 生成 seed 中动态 URL ...")
    generated_urls = generate_dynamic_urls()
    print(f"      生成 {len(generated_urls)} 条动态 URL")

    print("[4/6] 扫描源码/设计稿/配置中的 URL ...")
    code_urls = parse_code_files()
    print(f"      从代码提取 {len(code_urls)} 条 URL 记录")

    all_records = db_urls + seed_urls + generated_urls + code_urls
    url_sources = dedupe(all_records)
    unique_urls = sorted(url_sources.keys())
    print(f"[5/6] 去重后唯一 URL：{len(unique_urls)}")

    print("[6/6] 执行 HTTP 探测（可能耗时，请等待）...")
    check_results = {}
    for idx, url in enumerate(unique_urls, start=1):
        res = check_url(url)
        check_results[url] = res
        status_str = res.get("status") or f"ERR:{res.get('error')}"
        print(f"      [{idx}/{len(unique_urls)}] {status_str} {url[:80]}...")

    report = build_report(unique_urls, url_sources, check_results)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n✅ 核查报告已生成：{REPORT_PATH}")
    print(f"   唯一 URL 数：{len(unique_urls)}")
    failed_count = sum(1 for u in unique_urls if not check_results[u].get("status") or check_results[u].get("status") >= 400)
    print(f"   失败 URL 数：{failed_count}")


if __name__ == "__main__":
    main()
