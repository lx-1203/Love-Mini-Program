#!/usr/bin/env node
/* 定位「r-exec-cli 报 verify=not-logged-in」到底是真实模式上不去，还是我调用姿势错。
   做法：把两种调用形态在同一个工程上各跑一次，比 verify 与登录页落点。
     broken —— mintToken({project}) ：mintToken 的签名是 (kind, repoRoot, deviceId) 且是 async，
              所以 kind 落到 guest 分支，返回值又被 String() 成 [object Promise] 写进 storage。
     fixed  —— (await mintToken("A", REPO)).token
   判读：只有当 fixed 也拿不到 logged-in 时，「真实模式未登录」才成立。

   用法：node scripts/qa/probe-boot-callsite.mjs --project mock|real [--forms broken,fixed]
   一次只测一个工程：两条工程各自占一个 IDE 实例，串起来连测会把通道打挂（实测 socket hang up）。 */
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { mintToken, bootSession, verifyLogin, openPage, routeStack, evaluate } from "./cli-automator.mjs";

process.on("uncaughtException", (e) => { console.log("BOOTPROBE_CRASH " + String(e && e.message).slice(0, 90) + " ⇒ 已跑完的行仍在上文，别当整批作废"); process.exit(3); });

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const WHICH = arg("project", "real");
const REL = WHICH === "mock" ? "apps/client/dist/build/mp-weixin" : "apps/client/dist/build/mp-weixin-real";
const FORMS = arg("forms", "broken,fixed").split(",").map((s) => s.trim()).filter(Boolean);
const PROJECT = resolve(REPO, REL);
const o = { project: PROJECT };
const sleep = (ms) => { const t = Date.now() + ms; while (Date.now() < t) {} };
const readToken = () => { try { return String(evaluate("() => { try { return String(wx.getStorageSync('token') || '(empty)').slice(0, 24); } catch(e){ return 'ERR ' + e.message; } }")); } catch (e) { return "THROW " + String(e.message).slice(0, 50); } };

if (!existsSync(join(PROJECT, "app.json"))) { console.log(`BOOTPROBE ${WHICH}=SKIP 产物不存在 ${REL}`); process.exit(1); }
console.log(`BOOTPROBE_TARGET ${WHICH} = ${REL} forms=${FORMS.join("+")}`);

if (FORMS.includes("broken")) {
  /* broken 形态会真的发一次 guest-login 请求（因为没 await，请求在后台跑完），等一拍让它落地。 */
  const brokenArg = String(mintToken(o));
  sleep(1500);
  console.log(`BOOTPROBE ${WHICH} broken: boot=${bootSession(brokenArg, o)} verify=${verifyLogin(o)} token=${readToken()}`);
}
if (FORMS.includes("fixed")) {
  let tk = "";
  try { tk = (await mintToken("A", REPO, "bootprobe-a")).token; } catch (e) { console.log(`BOOTPROBE ${WHICH} fixed: 铸 token 失败 ${String(e.message).slice(0, 90)}`); }
  if (tk) {
    console.log(`BOOTPROBE ${WHICH} fixed: boot=${bootSession(tk, o)} verify=${verifyLogin(o)} tokenLen=${tk.length} token=${readToken()}`);
    /* 落点是第二证据：已登录时 pages/login/index 会被守卫弹走（第 4 项裁决确认过的行为） */
    try { openPage("pages/login/index", "", o); } catch (e) { console.log("  openpage-err " + String(e.message).slice(0, 70)); }
    sleep(2600);
    let rs = "";
    try { rs = String(routeStack(o) || "(空)"); } catch (e) { rs = "THROW " + String(e.message).slice(0, 60); }
    console.log(`BOOTPROBE ${WHICH} fixed: 登录页落点=${rs}`);
  }
}
console.log("BOOTPROBE_DONE 判读：fixed=logged-in ⇒ not-logged-in 是调用姿势错；fixed≠logged-in ⇒ 真实模式确有登录障碍");
