/**
 * R7: OBS 场景配置（obs-websocket 5.x 协议）
 * 用法: node scripts/r7-obs-scene.mjs setup|show
 * setup: 将「窗口采集」指向微信开发者工具主窗口, 启用它并禁用显示器采集/窗口采集2
 * show: 打印当前场景各 source 的可见性与窗口目标
 */
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const PASSWORD = "QEvyQIedhtB26zZc";
const PORT = 4455;
const ROOT = "D:/6/恋爱小程序";
const SCENE = "场景";
const WIN_CAPTURE = "窗口采集";        // 目标 source（uuid fa1e80e4）
const MONITOR = "显示器采集";
const WIN_CAPTURE_2 = "窗口采集 2";
// 微信开发者工具主窗口: title:class:exe
const DEVTOOLS_WINDOW = "校园恋爱 - mp-weixin - 微信开发者工具 Stable 2.02.2608040:Chrome_WidgetWin_1:微信开发者工具.exe";

function resolveWs() {
  const pnpmDir = `${ROOT}/node_modules/.pnpm`;
  try {
    const dirs = readdirSync(pnpmDir).filter((d) => /^ws@8/.test(d)).sort().reverse();
    for (const d of dirs) {
      try { return require(`${pnpmDir}/${d}/node_modules/ws/index.js`); } catch { /* try next */ }
    }
  } catch { /* no pnpm dir */ }
  return require("ws");
}

function authString(challenge, salt) {
  const secret = crypto.createHash("sha256").update(PASSWORD + salt).digest("base64");
  return crypto.createHash("sha256").update(secret + challenge).digest("base64");
}

function connect(WebSocket) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
    const timer = setTimeout(() => { reject(new Error("connect timeout")); try { ws.terminate(); } catch { } }, 8000);
    ws.on("error", (e) => { clearTimeout(timer); reject(new Error("ws error: " + e.message)); });
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.op === 0) {
        const d = msg.d || {};
        const identify = { rpcVersion: 1, eventSubscriptions: 0 };
        if (d.authentication) identify.authentication = authString(d.authentication.challenge, d.authentication.salt);
        ws.send(JSON.stringify({ op: 1, d: identify }));
      } else if (msg.op === 2) {
        clearTimeout(timer);
        resolve(ws);
      }
    });
  });
}

async function request(ws, requestType, requestData = {}) {
  return new Promise((resolve, reject) => {
    const id = "r7s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const timer = setTimeout(() => { reject(new Error(`request timeout: ${requestType}`)); }, 10000);
    const handler = (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.op === 7 && msg.d && msg.d.requestId === id) {
        clearTimeout(timer);
        ws.removeListener("message", handler);
        const st = msg.d.requestStatus || {};
        if (!st.result) { reject(new Error(`${requestType} failed: ${st.comment || st.code}`)); return; }
        resolve(msg.d.responseData || {});
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify({ op: 6, d: { requestType, requestId: id, requestData } }));
  });
}

const cmd = process.argv[2] || "show";
try {
  const WebSocket = resolveWs();
  const ws = await connect(WebSocket);
  if (cmd === "setup") {
    // 1) 设置 窗口采集 的捕获目标为 DevTools 主窗口（overlay=true 仅覆盖 window/method 字段）
    await request(ws, "SetInputSettings", { inputName: WIN_CAPTURE, inputSettings: { window: DEVTOOLS_WINDOW, method: 2 }, overlay: true });
    console.log("[scene] 窗口采集 -> DevTools 窗口 (method=WGC)");
    // 2) 场景内启用/禁用
    const sceneRef = { sceneName: SCENE };
    for (const [name, enable] of [[WIN_CAPTURE, true], [MONITOR, false], [WIN_CAPTURE_2, false]]) {
      const { sceneItemId } = await request(ws, "GetSceneItemId", { ...sceneRef, sourceName: name });
      await request(ws, "SetSceneItemEnabled", { ...sceneRef, sceneItemId, sceneItemEnabled: enable });
      console.log(`[scene] ${name} -> ${enable ? "enabled" : "disabled"}`);
    }
    // 3) 校验读取
    const { sceneItems } = await request(ws, "GetSceneItemList", sceneRef);
    for (const it of sceneItems) console.log(`[verify] ${it.sourceName}: visible=${it.sceneItemEnabled}`);
    const { inputSettings } = await request(ws, "GetInputSettings", { inputName: WIN_CAPTURE });
    console.log("[verify] 窗口采集 target:", inputSettings.window);
  } else {
    const { sceneItems } = await request(ws, "GetSceneItemList", { sceneName: SCENE });
    for (const it of sceneItems) console.log(`${it.sourceName}: visible=${it.sceneItemEnabled}`);
    const { inputSettings } = await request(ws, "GetInputSettings", { inputName: WIN_CAPTURE });
    console.log("窗口采集 target:", inputSettings.window);
  }
  ws.close();
} catch (e) {
  console.error("FAILED:", e.message);
  process.exit(1);
}
