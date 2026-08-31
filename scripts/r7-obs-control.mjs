/**
 * R7: OBS 录制控制（obs-websocket 5.x 协议）
 * 用法: node scripts/r7-obs-control.mjs start|stop|status
 * 依赖: node_modules/.pnpm 中的 ws@8.x（动态解析，无需安装）
 */
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const PASSWORD = "QEvyQIedhtB26zZc";
const PORT = 4455;
const ROOT = "D:/6/恋爱小程序";

function resolveWs() {
  const pnpmDir = `${ROOT}/node_modules/.pnpm`;
  try {
    const dirs = readdirSync(pnpmDir)
      .filter((d) => /^ws@8/.test(d))
      .sort()
      .reverse();
    for (const d of dirs) {
      try {
        return require(`${pnpmDir}/${d}/node_modules/ws/index.js`);
      } catch {
        /* try next */
      }
    }
  } catch {
    /* no pnpm dir */
  }
  return require("ws");
}

function authString(challenge, salt) {
  // obs-websocket 5.x: secret = base64(sha256(password + salt)); auth = base64(sha256(secret + challenge))
  const secret = crypto.createHash("sha256").update(PASSWORD + salt).digest("base64");
  return crypto.createHash("sha256").update(secret + challenge).digest("base64");
}

async function call(requestType, timeoutMs = 8000) {
  const WebSocket = resolveWs();
  const verbose = process.argv.includes("--verbose");
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`obs-websocket timeout (${requestType})`));
      try {
        ws.terminate();
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    ws.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`obs-websocket connect error: ${e.message}`));
    });
    ws.on("close", (code, reason) => {
      if (verbose) console.error(`[ws-close] code=${code} reason=${reason}`);
    });
    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        if (verbose) console.error(`[ws-badmsg] ${raw.toString().slice(0, 200)}`);
        return;
      }
      if (verbose) console.error(`[ws-msg] op=${msg.op} ${JSON.stringify(msg.d).slice(0, 300)}`);
      if (msg.op === 0) {
        // Hello
        const d = msg.d || {};
        const identify = { rpcVersion: 1, eventSubscriptions: 0 };
        if (d.authentication) {
          identify.authentication = authString(d.authentication.challenge, d.authentication.salt);
        }
        ws.send(JSON.stringify({ op: 1, d: identify }));
      } else if (msg.op === 2) {
        // Identified -> send request
        ws.send(JSON.stringify({ op: 6, d: { requestType, requestId: "r7-" + Date.now() } }));
      } else if (msg.op === 7) {
        // RequestResponse
        clearTimeout(timer);
        const st = (msg.d && msg.d.requestStatus) || {};
        resolve({ result: !!st.result, code: st.code, comment: st.comment, data: msg.d && msg.d.responseData });
        ws.close();
      }
    });
  });
  return result;
}

const cmd = process.argv[2] || "status";
try {
  if (cmd === "start") {
    const r = await call("StartRecord");
    console.log(JSON.stringify({ cmd, ok: r.result, detail: r.comment || "" }));
    process.exit(r.result ? 0 : 1);
  } else if (cmd === "stop") {
    const r = await call("StopRecord", 15000);
    console.log(JSON.stringify({ cmd, ok: r.result, outputPath: (r.data && r.data.outputPath) || "", detail: r.comment || "" }));
    process.exit(r.result ? 0 : 1);
  } else {
    const r = await call("GetRecordStatus");
    console.log(JSON.stringify({ cmd, ok: r.result, data: r.data || {}, detail: r.comment || "" }));
    process.exit(0);
  }
} catch (e) {
  console.error(JSON.stringify({ cmd, ok: false, error: e.message }));
  process.exit(1);
}
