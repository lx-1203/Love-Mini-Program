#!/usr/bin/env node
/* 把"mock 档上的游客腿"作废，并把它已被真档重测取代这件事写成一张可对账的纸。
   为什么要有这一步：interact-b2 的 38 行游客用例里 26 行被判 FAILED，
   观测是"开 pages/login/index 落到 pages/discover/index"——按字面读就是产品缺陷。
   但 probe-guest-band.mjs 在同一台机器、同一份 mock 产物上实测：
   清完会话（verify=not-logged-in）之后**任何一次开页**都会让 store 回到 logged-in
   （cold / warm 两腿都 AUTOLOGIN_ON_OPEN），因为 mock 包的 bootstrap 无条件注入 mock 会话。
   换到 mp-weixin-real 同一批用例重跑：executed=25 / failed=0 / skipped=13、0 证据洞。
   所以那 26 条不是"修好了"，是"从来没被量过"。这里把取代关系写死，
   免得下一轮有人拿 b2 的 FAILED 说产品有问题，或者拿 real 的绿说"上一轮已经测过"。
   用法：node scripts/qa/supersede-mock-guest-rows.mjs \
     --old reports/audit/round-7/interact-b2/exec-results.json \
     --new reports/audit/round-7/interact-real-guest/exec-results.json \
     [--manifest PAGES-LOGIN-INDEX] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { readApiMode } from "./artifact-band.mjs";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const OLD = resolve(REPO, arg("old", "reports/audit/round-7/interact-b2/exec-results.json"));
const NEW = resolve(REPO, arg("new", "reports/audit/round-7/interact-real-guest/exec-results.json"));
const MANIFEST = arg("manifest", "PAGES-LOGIN-INDEX");
/* 证明分两种成因，都必须核到源码/命令，不接受"我记得是这样"：
     mode=identity ⇒ mock 的 bootstrap 无条件造登录态；去接刀脚本核这个 manifest 只由游客腿跑过
     mode=flag     ⇒ 默认 false 的功能开关让守卫按设计弹回，只有 showcase 构建会置 true */
const MODE = arg("mode", "identity");
const FLAGS_KEY = arg("flag", "membershipEnabled");
const OUT = resolve(REPO, arg("out", MODE === "flag" ? "reports/audit/round-7/flag-band-supersede.json" : "reports/audit/round-7/guest-band-supersede.json"));

const fails = [];
if (!existsSync(OLD)) fails.push("旧件不存在 " + OLD);
if (!existsSync(NEW)) fails.push("新件不存在 " + NEW + " ⇒ 还没在能表达该身份的档位上重测，不许先作废");
if (fails.length) { for (const f of fails) console.log("SUPERSEDE_PROBLEM " + f); console.log("SUPERSEDE_RESULT=FAIL"); process.exit(2); }

const o = JSON.parse(readFileSync(OLD, "utf8"));
const n = JSON.parse(readFileSync(NEW, "utf8"));
/* 旧件（interact-b2）比 --identity 字段还早，所以"这批是游客腿"不能靠文件头的标量
   （它会被后跑的 A 腿覆盖成 A）。改成去接刀脚本里核一遍：
   只有当 round7-post-b-slice.sh 里这个 manifest 恰好只出现在 --identity guest 那一条命令上，
   才允许按 manifest 选行。核不过就停，不做"我记得是这样"的推定。 */
const EXPECT_ID = MODE === "flag" ? null : "guest";
const pick = (arr, f) => (arr || []).filter((r) => r.manifest === MANIFEST && (!EXPECT_ID || (r.identity ? r.identity === EXPECT_ID : true)));
let oldRows = pick(o.results, o);
const newRows = pick(n.results, n);
/* 证明分两种成因，都必须核到源码/命令，不接受"我记得是这样"：
     mode=identity ⇒ mock 的 bootstrap 无条件造登录态；去接刀脚本核这个 manifest 只由游客腿跑过
     mode=flag     ⇒ 默认 false 的功能开关让守卫按设计弹回，只有 showcase 构建会置 true */
function proofIdentity() {
  const SLICE = join(REPO, "scripts", "qa", "round7-post-b-slice.sh");
  const slice = existsSync(SLICE) ? readFileSync(SLICE, "utf8") : "";
  const cmdLines = slice.replace(/\\\r?\n\s*/g, " ").split(/\r?\n/).filter((l) => l.includes("r-exec-cli.mjs"));
  const guestCmds = cmdLines.filter((l) => /--identity +guest/.test(l));
  const otherCmds = cmdLines.filter((l) => !/--identity +guest/.test(l));
  const inGuest = guestCmds.some((l) => l.includes(MANIFEST));
  const inOther = otherCmds.some((l) => new RegExp("--manifests [^\\n]*\\b" + MANIFEST.replace(/[-]/g, "\\-") + "\\b").test(l));
  console.log("SUPERSEDE_IDENTITY_PROOF 脚本里带 --identity guest 的命令=" + guestCmds.length + " 其它=" + otherCmds.length +
    " ｜ " + MANIFEST + " 只出现在游客命令里？" + (inGuest && !inOther ? "是（按 manifest 选行成立）" : "否"));
  return inGuest && !inOther;
}
function proofFlag() {
  const ff = readFileSync(join(REPO, "apps/client/src/config/feature-flags.ts"), "utf8");
  const sc = readFileSync(join(REPO, "apps/client/src/config/showcase.ts"), "utf8");
  const vip = join(REPO, "apps/client/src/subpackages/vip/index.vue");
  const gate = new RegExp(FLAGS_KEY + ":\\s*false").test(ff);
  const opens = new RegExp("featureFlags\\." + FLAGS_KEY + "\\s*=\\s*true").test(sc);
  const guard = existsSync(vip) && new RegExp("featureFlags\\." + FLAGS_KEY).test(readFileSync(vip, "utf8"));
  const bounced = oldRows.filter((r) => String(r.observed || "").includes("pages/profile/index")).length;
  console.log("SUPERSEDE_FLAG_PROOF 默认 " + FLAGS_KEY + ":false=" + gate + " showcase 置 true=" + opens +
    " 页面守卫读它=" + guard + " ｜旧行里落回「我的」Tab 的=" + bounced + "/" + oldRows.length);
  if (!(gate && opens && guard && bounced > 0)) return false;
  /* 只作废"被守卫弹回"的那些行：同一 manifest 里本来就能跑的行（market/activities 那几页）
     不能被顺手一起作废，否则就是用一次档位更正，抹掉一批本来就成立的测量。 */
  oldRows = oldRows.filter((r) => String(r.observed || "").includes("pages/profile/index"));
  return true;
}
if (!(MODE === "flag" ? proofFlag() : proofIdentity())) {
  console.log("SUPERSEDE_PROBLEM mode=" + MODE + " 的前提没核上 ⇒ 不作废，两份文件都保持原样");
  console.log("SUPERSEDE_RESULT=FAIL");
  process.exit(2);
}
if (!oldRows.length) console.log("SUPERSEDE_WARN 旧件里没有 " + MANIFEST + " 的行（可能已经作废过了）");
if (!newRows.length) fails.push("新件里没有 " + MANIFEST + " 的行 ⇒ 没有替代品，不能作废");

/* 取代的前提是新件自己是一次**成立的测量**：档位必须能表达被测前提，
   且这一批不能有证据洞（没证据的绿不能用来取代红）。 */
const OLD_TAG = OLD.split("round-7/")[1] ? OLD.split("round-7/")[1].split("/")[0] : OLD;
const NEW_TAG = NEW.split("round-7/")[1] ? NEW.split("round-7/")[1].split("/")[0] : NEW;
const newBand = readApiMode(join(REPO, n.project || "apps/client/dist/build/mp-weixin-real"));
if (newBand.mode === "mock") fails.push("新件仍是 mock 档（" + n.project + "）⇒ 它同样表达不了该前提");
if (MODE === "flag" && newBand.viteMode !== "mp-weixin-showcase") {
  fails.push("新件不是 showcase 档（MODE=" + newBand.viteMode + "）⇒ 那一档上开关仍然是关的");
}
const holes = newRows.filter((r) => r.status === "EXECUTED" && !r.evidence && !/present\(|absent/.test(String(r.observed || "")));
if (holes.length) fails.push(holes.length + " 条新 EXECUTED 没有任何证据 ⇒ 不能用无证据的绿取代红");

const WHY = MODE === "flag"
  ? "默认档位上 " + FLAGS_KEY + "=false，页面守卫按设计弹回「我的」⇒ 旧行不是产品判红，是载体档位没量到（showcase 档重测见 new）"
  : "mock 包开页会重跑启动链路并把会话造回来（probe-guest-band 两腿 AUTOLOGIN_ON_OPEN）⇒ 旧行不是产品判红，是载体没量到";
const byNew = new Map(newRows.map((r) => [r.id, r]));
const map = [];
for (const r of oldRows) {
  const rep = byNew.get(r.id);
  map.push({
    id: r.id, page: r.page,
    old: { status: r.status, band: r.band || (o.band || "mock@未知（这一批早于档位字段）"), reason: String(r.failureReason || "").slice(0, 90), file: OLD_TAG },
    new: rep ? { status: rep.status, band: rep.band || ((newBand.mode || "?") + "@" + (newBand.sha8 || "?")), observed: String(rep.observed || "").slice(0, 120), file: NEW_TAG } : null,
    why: WHY,
  });
}
const missing = map.filter((m) => !m.new);
const histOld = {}, histNew = {};
for (const m of map) { histOld[m.old.status] = (histOld[m.old.status] || 0) + 1; if (m.new) histNew[m.new.status] = (histNew[m.new.status] || 0) + 1; }
console.log("SUPERSEDE_SCOPE manifest=" + MANIFEST + " 旧行=" + map.length + " 新件行=" + newRows.length);
console.log("SUPERSEDE_OLD_HIST " + JSON.stringify(histOld));
console.log("SUPERSEDE_NEW_HIST " + JSON.stringify(histNew));
console.log("SUPERSEDE_NEW_BAND " + (newBand.mode || "?") + "@" + (newBand.sha8 || "?") + "（" + (n.project || "?") + "）");
console.log("SUPERSEDE_UNMATCHED " + missing.length + (missing.length ? "：" + missing.slice(0, 8).map((m) => m.id).join(",") : ""));
if (map.length !== oldRows.length) fails.push("取代表条数与旧行数不一致");
if (missing.length) fails.push(missing.length + " 条旧行在新件里找不到对应 ⇒ 它们仍是没被重测的洞，不许作废");
if (existsSync(OLD) && (o.results || []).filter((r) => r.manifest === MANIFEST).length !== oldRows.length) {
  console.log("SUPERSEDE_NOTE 旧件里 " + MANIFEST + " 另有 " + ((o.results || []).filter((r) => r.manifest === MANIFEST).length - oldRows.length) + " 行不在本次作废范围（档位问题没落在它们身上）");
}
if (fails.length) { for (const f of fails) console.log("SUPERSEDE_PROBLEM " + f); console.log("SUPERSEDE_RESULT=FAIL ⇒ 不作废，两份文件都保持原样"); process.exit(2); }

writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), manifest: MANIFEST,
  oldFile: OLD.split("reports/")[1] ? "reports/" + OLD.split("reports/")[1] : OLD, oldGitSha: o.gitSha,
  newFile: "reports/" + NEW.split("reports/")[1], newGitSha: n.gitSha, newBand: (newBand.mode || "?") + "@" + (newBand.sha8 || "?"),
  probe: MODE === "flag"
    ? "apps/client/src/config/feature-flags.ts:" + FLAGS_KEY + "=false × config/showcase.ts 置 true × 页面守卫读它（三件事由本脚本现场核）"
    : "scripts/qa/probe-guest-band.mjs（cold=AUTOLOGIN_ON_OPEN warm=AUTOLOGIN_ON_OPEN，产物 mp-weixin envSha8=f1c7b96b）",
  rows: map,
}, null, 1));
console.log("SUPERSEDE_WRITTEN=" + OUT + " rows=" + map.length);
console.log("SUPERSEDE_RESULT=OK 旧腿作废、新腿生效；两边都留在盘上，谁引用哪一档必须点名");
