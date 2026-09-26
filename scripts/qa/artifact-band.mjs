#!/usr/bin/env node
/* 产物档位读取 + 游客档前置断言。
   为什么单独一个文件：执行器和取景器都要在开跑前问同一句「这包能不能表达我要测的身份」，
   上一版没有这一问，于是 mock 包上的 26 条游客用例被判成 FAILED 落进了台账
   （见 reports/audit/round-7/round7-NOTES.md §39）。
   断言不靠注释、也不靠我记不记得：它直接读在盘产物的 config/env.js，
   再读工作树里 stores/session.ts 的 mock 分支——产品哪天把那条无条件注入收了，
   这个前置就该自动放行，而不是继续挡着已经能测的东西。 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

/** 读在盘产物的 API 档位：取不到就返回 null，绝不给一个"看起来对"的默认值。 */
export function readApiMode(projectDir) {
  const envFile = join(projectDir, "config", "env.js");
  if (!existsSync(envFile)) return { envFile, mode: null, viteMode: null, sha8: null };
  const src = readFileSync(envFile, "utf8");
  return {
    envFile,
    mode: (src.match(/VITE_API_MODE:"([^"]*)"/) || [])[1] || null,
    viteMode: (src.match(/MODE:"([^"]*)"/) || [])[1] || null,
    sha8: createHash("sha256").update(src).digest("hex").slice(0, 8),
  };
}

/** 从 open 位置（应是 `{`）数到配对的右括号，返回含两端括号的长度。
    不按缩进找块尾：缩进一改，「这一段里还有没有别的 if」就会扫过头，
    那条判点于是变成永远不报警的装饰（本仓为这类判点付过学费）。 */
function matchingBrace(src, open) {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (depth === 0) return k - open + 1; }
  }
  return src.length - open;
}

/** 工作树里的 mock 启动分支是否仍然无条件注入 mock 会话。 */
export function mockAutoLoginInSource(repoRoot) {
  const f = join(repoRoot, "apps", "client", "src", "stores", "session.ts");
  if (!existsSync(f)) return { file: f, found: false, autoLogin: null, why: "读不到 session store 源文件" };
  const src = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const i = src.indexOf("if (useMock()) {");
  if (i < 0) return { file: f, found: false, autoLogin: false, why: "源码里已无 `if (useMock()) {` 分支" };
  const open = i + "if (useMock())".length;
  const block = src.slice(open, open + matchingBrace(src, open));
  const assigns = /this\.userSession\s*=\s*\{\s*\.\.\.mockUserSession/.test(block);
  const guarded = /\bif\s*\(/.test(block.slice(0, Math.max(0, block.indexOf("this.userSession"))));
  const line = 1 + src.slice(0, i).split("\n").length;
  return {
    file: f, found: true, line,
    autoLogin: assigns && !guarded,
    why: assigns ? (guarded ? "mock 分支里的赋值外面还有条件 ⇒ 不是无条件注入" : "mock 分支无条件把 userSession 赋成 mockUserSession") : "mock 分支里没有那条赋值",
  };
}

/** 游客身份能不能在这包上测。返回 {ok:false, reason} 时调用方必须**不跑**，而不是跑完记红。
    注意这里只回答「载体表达得了这个身份吗」，不回答「产品对不对」——后者由重测后的判决说话。 */
export function assertGuestCapable(repoRoot, projectDir, { allow = false } = {}) {
  const band = readApiMode(projectDir);
  if (!band.mode) return { ok: false, band, reason: "产物 " + band.envFile + " 里取不到 VITE_API_MODE ⇒ 不知道是哪一档载体，游客整批不跑" };
  if (band.mode !== "mock") return { ok: true, band, src: null };
  const src = mockAutoLoginInSource(repoRoot);
  if (src.autoLogin !== true) return { ok: true, band, src };
  const reason = "mock 包会把游客吃掉：" + band.envFile + " 的 VITE_API_MODE=\"" + band.mode + "\"，"
    + "而 " + src.file.replace(repoRoot + "/", "") + ":" + src.line + " " + src.why
    + " ⇒ 只要启动链路重跑一次（冷启动那次开页就会），store 就又变 logged-in，"
    + "登录页按设计 switchTab 到寻觅（pages/login/index.vue:87-89）。"
    + "这不是产品缺陷，是载体次序：跑游客批次前先预热一次开页并复查 not-logged-in（见 scripts/qa/probe-guest-band.mjs），"
    + "或换 --project apps/client/dist/build/mp-weixin-real 跑；两处都不做就只能记 NOT_SHOOTABLE，不许记成产品 FAILED。";
  if (allow) return { ok: true, band, src, warned: true, reason };
  return { ok: false, band, src, reason };
}
