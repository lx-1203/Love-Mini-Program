# -*- coding: utf-8 -*-
"""R7: OBS 录屏配置
1. 场景「未命名」：启用 窗口采集(微信开发者工具)，关闭 麦克风/Aux（避免环境噪声）
2. obs-websocket：server_enabled -> true（端口 4455，沿用已有密码）
用法: python scripts/r7-obs-config.py
"""
import json
import os
import shutil

APPDATA = os.environ.get("APPDATA", "")
SCENE = os.path.join(APPDATA, r"obs-studio\basic\scenes\未命名.json")
WS = os.path.join(APPDATA, r"obs-studio\plugin_config\obs-websocket\config.json")

DEVTOOLS_SRC = "fa1e80e4-2af7-4379-b160-7f0abd8a450b"  # 窗口采集 -> 微信开发者工具.exe
MIC_SRC = "2e5f3dd7-33e8-465c-94db-2ca2a14dc37c"        # 麦克风/Aux


def main():
    # 1) 场景：切换可见性
    shutil.copyfile(SCENE, SCENE + ".bak-r7")
    with open(SCENE, "r", encoding="utf-8") as f:
        data = json.load(f)
    changed = []
    for src in data.get("sources", []):
        if src.get("id") != "scene":
            continue
        for item in src.get("settings", {}).get("items", []):
            su = item.get("source_uuid")
            if su == DEVTOOLS_SRC and not item.get("visible"):
                item["visible"] = True
                changed.append("窗口采集(DevTools) -> visible")
            if su == MIC_SRC and item.get("visible"):
                item["visible"] = False
                changed.append("麦克风/Aux -> invisible")
    with open(SCENE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print("[scene] " + ("; ".join(changed) if changed else "no change needed"))

    # 2) obs-websocket：启用服务
    if os.path.exists(WS):
        shutil.copyfile(WS, WS + ".bak-r7")
        with open(WS, "r", encoding="utf-8") as f:
            ws = json.load(f)
        if not ws.get("server_enabled"):
            ws["server_enabled"] = True
            with open(WS, "w", encoding="utf-8") as f:
                json.dump(ws, f, ensure_ascii=False, indent=2)
            print("[websocket] server_enabled -> true (port %s)" % ws.get("server_port"))
        else:
            print("[websocket] already enabled")
    else:
        print("[websocket] config not found")


if __name__ == "__main__":
    main()
