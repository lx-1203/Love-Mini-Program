/* 后台腿的仪器前提补给模块（被 scripts/verify-admin-*.mjs import，不是独立门）。
 *
 * 为什么需要它：四把后台门一律从 process.env 读口令（2026-10-14 轮换后脚本内不内置默认值——那是对的），
 * 但载具被后台/子代理起时常常没带环境 ⇒ 整批 NOT-EVIDENCED。2026-10-17 实测：红数 6→10，
 * 其中 4 条（后又连着设备腿 2 条）根本不是产品判决，而是"我没带"被记成"门判不动"。
 *
 * 纪律三条：
 *  1) 值一律不回显：只报条数与键名，凭据本体不进日志、不进产物。
 *  2) 已显式设过的环境变量优先，本模块只补缺的那几个（不覆盖 = 调用方的显式意图最大）。
 *  3) 读不到 .env 或缺关键键 ⇒ 什么都不做，让门照旧大声退 2；绝不为了变绿伪造凭据或塞默认值。
 */
import { readFileSync, existsSync } from "node:fs";
import http from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const FILES = [".env", ".env.local"];

/** 与 scripts/verify-env-release.mjs 的 parseEnv 同语法：忽略注释/空行，支持引号包裹的值。 */
export function parseEnvLines(text) {
  const out = {};
  for (const l of String(text).split(/\r?\n/)) {
    if (!l.trim() || l.trim().startsWith("#")) continue;
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^\s*"(.*)"\s*$/, "$1").replace(/^\s*'(.*)'\s*$/, "$1");
  }
  return out;
}

export function readDotEnv() {
  const merged = {};
  const seen = [];
  for (const f of FILES) {
    const p = resolve(REPO, f);
    if (!existsSync(p)) continue;
    Object.assign(merged, parseEnvLines(readFileSync(p, "utf8")));
    seen.push(f);
  }
  return { merged, seen };
}

const probePort = (port) => new Promise((res) => {
  const r = http.get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (x) => res(x.statusCode));
  r.on("error", () => res(0));
  r.on("timeout", () => { r.destroy(); res(0); });
});

/** 别名三条，出处都写在注释里，不凭印象：
 *   SUPER_PASSWORD ← ADMIN_LOGIN_PASSWORD（载具 run-final-verify-v33.sh :149 记的同一映射）
 *   ADMIN_LOGIN_USERNAME ← ADMIN_OPENID（scripts/verify-admin-post-detail.mjs 头注 :5："username 是 users.openid，不是手机号"）
 *   ADMIN_BASE_URL ← 端口实测（该脚本 :20 的缺省是 5177，而本轮实测 5173 拒连、5177 通；上一程注释记的是反方向 ⇒ 取实测不取注释） */
const ALIASES = [["SUPER_PASSWORD", "ADMIN_LOGIN_PASSWORD"], ["ADMIN_LOGIN_USERNAME", "ADMIN_OPENID"]];

export async function supplyInstrumentEnv({ log = true } = {}) {
  const { merged, seen } = readDotEnv();
  let loaded = 0, aliased = 0;
  for (const [k, v] of Object.entries(merged)) {
    if (v && process.env[k] === undefined) { process.env[k] = v; loaded++; }
  }
  for (const [dst, src] of ALIASES) {
    if (process.env[dst] === undefined && merged[src]) { process.env[dst] = merged[src]; aliased++; }
  }
  let base = process.env.ADMIN_BASE_URL || "";
  if (!base && (process.env.ADMIN_LOGIN_PASSWORD || process.env.SUPER_PASSWORD)) {
    const [p5177, p5173] = await Promise.all([probePort(5177), probePort(5173)]);
    const ok = (c) => c >= 200 && c < 500;
    if (ok(p5177)) { process.env.ADMIN_BASE_URL = base = "http://127.0.0.1:5177"; aliased++; }
    else if (ok(p5173)) { process.env.ADMIN_BASE_URL = base = "http://127.0.0.1:5173"; aliased++; }
    if (log) console.log(`INSTRUMENT_ENV env_files=${seen.join(",") || "无"} 补入=${loaded} 别名=${aliased} admin_probe 5177=${p5177 || "不通"} 5173=${p5173 || "不通"}（值不回显）`);
    return { loaded, aliased, base: base || "两端都不通⇒让门自己报 NOT-EVIDENCED", files: seen };
  }
  if (log) console.log(`INSTRUMENT_ENV env_files=${seen.join(",") || "无"} 补入=${loaded} 别名=${aliased} ADMIN_BASE_URL=${base || "未设（.env 里没有口令时不猜端口）"}（值不回显）`);
  return { loaded, aliased, base, files: seen };
}
