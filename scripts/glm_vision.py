#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GLM Vision API 命令行帮助脚本：读取 glm-vision-mcp/config.json 的 key，调用智谱视觉模型。"""
import argparse, base64, json, sys
from pathlib import Path
import httpx

CONFIG = Path(r"D:\6\glm-vision-mcp\config.json")
DEFAULT_MODEL = "glm-4.6v-flash"
DEFAULT_BASE = "https://open.bigmodel.cn/api/paas/v4"

def load_config():
    cfg = {}
    if CONFIG.exists():
        try:
            cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
        except Exception:
            pass
    return cfg

def to_part(p: str) -> str:
    p = p.strip().strip('"').strip("'")
    if p.startswith(("http://", "https://")):
        return p
    path = Path(p)
    if not path.exists():
        raise SystemExit(f"图片不存在: {p}")
    return base64.b64encode(path.read_bytes()).decode("ascii")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", nargs="+", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--thinking", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    cfg = load_config()
    key = cfg.get("api_key", "").strip()
    model = cfg.get("model") or DEFAULT_MODEL
    base = (cfg.get("base_url") or DEFAULT_BASE).rstrip("/")
    if not key:
        raise SystemExit("未配置 API Key")
    content = [{"type": "image_url", "image_url": {"url": to_part(i)}} for i in args.images]
    content.append({"type": "text", "text": args.prompt})
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "thinking": {"type": "enabled" if args.thinking else "disabled"},
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    url = f"{base}/chat/completions"
    last = ""
    for attempt in range(1, 4):
        try:
            with httpx.Client(timeout=180) as client:
                resp = client.post(url, headers=headers, json=payload)
        except httpx.HTTPError as e:
            last = f"网络错误: {e}"
            continue
        if resp.status_code == 200:
            data = resp.json()
            text = (data["choices"][0]["message"]["content"] or "").strip()
            if args.out:
                Path(args.out).write_text(text, encoding="utf-8")
            else:
                print(text)
            return
        detail = resp.text[:800]
        try:
            detail = json.dumps(resp.json().get("error", resp.json()), ensure_ascii=False)[:800]
        except Exception:
            pass
        last = f"HTTP {resp.status_code}: {detail}"
        if resp.status_code == 429:
            import time
            time.sleep(10 * attempt)
            continue
        break
    raise SystemExit(last)

if __name__ == "__main__":
    main()
