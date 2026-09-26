#!/usr/bin/env node
/* 游客档载体体检：清会话之后，「打开一个页」这个动作本身会不会把会话又登回去。
   为什么要这么一条探针：台账里 26 条 PAGES-LOGIN-INDEX 游客用例被判 FAILED，
   观测是 `top=pages/discover/index ≠ pages/login/index`——看起来像「产品把游客推走了」。
   但同样的两帧在 uidebt-shoot-guest2 里落在 pages/login/index（verify=not-logged-in），
   在 uidebt-shoot-guest 里落在 pages/discover/index：同一判据两种落点，
   差别只在「这一次开页有没有顺带重跑启动链路」。
   mock 包的 bootstrap 是无条件注入 mockUserSession 的（stores/session.ts 里
   `if (useMock()) { this.userSession = { ...mockUserSession }; }`），
   而登录页的 watch(isLoggedIn) 按设计 switchTab 到 discover（pages/login/index.vue:87-89）。
   所以真正要量的是「冷」还是「热」：
     · cold 腿 = 连上工程后的第一次开页（可能就是重启动作）
     · warm 腿 = 先开一个别的页把启动链路走完，再清会话、再开目标页
   两条腿各记一次「开页前 / 开页后」的会话状态与落点，谁成立写谁。
   判读规则（不许互相冒充）：
     · 开页后 store 又变 logged-in ⇒ 载体表达不了游客身份（测量错，不是产品缺陷）
     · 开页后 store 仍 not-logged-in 而落点不是目标页 ⇒ 真重定向（产品缺陷，须记红）
     · warm 腿成立而 cold 腿不成立 ⇒ 执行器的游客档要先跑一次预热开页，再进用例批次 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { openPage, routeStack, clearSession, verifyLogin } from "./cli-automator.mjs";
import { assertGuestCapable } from "./artifact-band.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf("--" + k);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const PAGE = arg("page", "pages/login/index");
const WARM_PAGE = arg("warm-page", "pages/home/index");
const SETTLE = Number(arg("settle", "2600"));
const sleep = (ms) => { const e = Date.now() + ms; while (Date.now() < e) {} };

const line = (k, v) => console.log("GUEST_BAND " + k + "=" + v);

/* ---- 静态腿：在盘产物的 API 档位 + 工作树里的无条件注入判点 ---- */
const envFile = join(PROJECT, "config", "env.js");
if (!existsSync(envFile)) {
  console.log("GUEST_BAND_RESULT=FAIL reason=产物里没有 config/env.js：" + envFile);
  process.exit(2);
}
const band = assertGuestCapable(REPO, PROJECT, { allow: true });
line("project", PROJECT);
line("VITE_API_MODE", band.band.mode || "?");
line("VITE_MODE", band.band.viteMode || "?");
line("envSha8", band.band.sha8 || "?");
line("sourcePredicate", JSON.stringify(band.src || "非 mock 档，无需该判点"));

/** 一条腿：清会话 → 验证 → 开页 → 再验证 → 再看落点。返回 null 表示这条腿没量成。 */
function leg(tag, warm) {
  const c = clearSession({ project: PROJECT });
  const before = verifyLogin({ project: PROJECT });
  line(tag + "_clear", c);
  line(tag + "_verify_before", before);
  if (!/^not-logged-in/.test(before)) {
    line(tag + "_verdict", "NOT_CLEARED（会话没清掉，后两步不能归因）");
    return null;
  }
  if (warm) {
    try { openPage(WARM_PAGE, "", { project: PROJECT }); } catch (e) {
      line(tag + "_verdict", "WARM_OPEN_FAIL " + String(e.message).slice(0, 60));
      return null;
    }
    sleep(SETTLE);
    line(tag + "_warm_landing", String(routeStack({ project: PROJECT }) || "(空)"));
    const c2 = clearSession({ project: PROJECT });
    const before2 = verifyLogin({ project: PROJECT });
    line(tag + "_clear2", c2);
    line(tag + "_verify_before2", before2);
    if (!/^not-logged-in/.test(before2)) {
      line(tag + "_verdict", "NOT_CLEARED_AFTER_WARM（预热后清不掉）");
      return null;
    }
  }
  try { openPage(PAGE, "", { project: PROJECT }); } catch (e) {
    line(tag + "_verdict", "OPEN_FAIL " + String(e.message).slice(0, 60));
    return null;
  }
  sleep(SETTLE);
  /* 开页之后紧接着那次 evaluate 有时会正好撞在应用重载上（实测 automation_evaluate 直接抛错）。
     探针不能因为通道抖一下就整条腿作废 ⇒ 重试一次，并把"两次都没答案"如实写成 NO_ANSWER。 */
  let after = "", stack = "";
  for (let k = 0; k < 2; k++) {
    try { after = String(verifyLogin({ project: PROJECT }) || ""); } catch (e) { after = "ERR " + String(e.message || e).slice(0, 70); }
    try { stack = String(routeStack({ project: PROJECT }) || ""); } catch (e) { stack = "ERR:" + String(e.message || e).slice(0, 60); }
    if (!/^ERR/.test(after) && stack && !stack.startsWith("ERR")) break;
    sleep(1800);
  }
  line(tag + "_verify_after", after || "(空)");
  line(tag + "_route_after", stack || "(空)");
  let verdict;
  if (/^logged-in/.test(after)) verdict = "AUTOLOGIN_ON_OPEN";
  else if (!stack || stack.startsWith("ERR")) verdict = "NO_LANDING_ANSWER";
  else if (!/^not-logged-in/.test(after)) verdict = "NO_LOGIN_ANSWER";
  else if (stack.includes(PAGE)) verdict = "GUEST_CAPABLE";
  else verdict = "REDIRECT_WHILE_GUEST";
  line(tag + "_verdict", verdict);
  return verdict;
}

/** 一条腿包一层：通道抛错也要留下可读的一行，而不是让整个探针死掉。 */
function safeLeg(tag, warm) {
  try { return leg(tag, warm); } catch (e) {
    line(tag + "_verdict", "THREW " + String((e && e.message) || e).slice(0, 90));
    return null;
  }
}
const cold = safeLeg("cold", false);
const warm = safeLeg("warm", true);
console.log("GUEST_BAND_SUMMARY cold=" + (cold || "无量") + " warm=" + (warm || "无量"));
if (cold === "AUTOLOGIN_ON_OPEN" && (warm === "GUEST_CAPABLE" || warm === "REDIRECT_WHILE_GUEST")) {
  console.log("结论：mock 包只在冷启动那次把会话造回来 ⇒ 游客批次必须先预热一次开页，再进用例；");
  console.log("      已跑的 26 条 cold-腿 FAILED 是载体次序造成的，重测后由重测自己说话。");
} else if (cold === "AUTOLOGIN_ON_OPEN" && warm === "AUTOLOGIN_ON_OPEN") {
  console.log("结论：这包无论如何都表达不了游客身份 ⇒ 游客用例换 mp-weixin-real 产物跑，或记 NOT_SHOOTABLE。");
} else if (warm === "REDIRECT_WHILE_GUEST") {
  console.log("结论：预热后 store 仍未登录而落点不是 " + PAGE + " ⇒ 产品级重定向，26 条 FAILED 成立，须记红并归因。");
} else if (warm === "GUEST_CAPABLE") {
  console.log("结论：游客档在预热次序下成立（停在目标页且未登录）⇒ 执行器补预热即可，先前那批要重测。");
} else {
  console.log("结论：两条腿都没给出可用答案 ⇒ 本探针不下判断，按 NOT_SHOOTABLE 记账并重跑。");
}
console.log("GUEST_BAND_RESULT=OK");
