#!/usr/bin/env node
/* ④ 的"待裁决按可辩护默认落地"这件事，此前只存在于我写的段落里 —— 没有一条能重跑的判据会因为它不成立而变红。
   本脚本把四项各绑一个可机检的载体：
     · 两项是台账行（要求行内出现带日期的裁决句 + 指定的证据锚点仍在）
     · 两项是载体文件（要求 schema 版本、运行期 SHA、以及各自那件"必须写下来"的字段）
   缺省判四项；--selftest 会把每条判据各破坏一次，确认门禁真的会红（一条永不会红的门禁就是装饰）。 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const SELFTEST = process.argv.includes("--selftest");
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const ledgerText = readFileSync(LEDGER, "utf8");
/* 载体路径可指到别处（默认仍是在盘那份）：门禁要能用一份 SCRATCH 样本走完整红/绿，
   而 reports/** 是活证据，自检不许往那里写。 */
const GATES_REL = arg("gates", "reports/audit/real-e2e/GATES.json");
const GATES_PATH = resolve(REPO, GATES_REL);

/* ---- 载体 gitSha 的新鲜度：形状对不等于没过期 ------------------------------------
   原来只按 /^[0-9a-f]{7,40}$/ 校验 SHA 的**长相**，从没跟 HEAD 对过，
   所以 e4495d67 落后 HEAD 21 个提交（apps/client/src 改了 51 个文件）照样绿 ——
   一条永不会红的门禁就是装饰。现在真对，距离与按路径的改动数一起报出来。

   判红（载体不可信 ⇒ 未落地 +1 ⇒ 退出码 2）：
     1) SHA 在本仓解析不到 ⇒ 那三道 Gate 的数归因不到任何提交；
     2) SHA 不是 HEAD 的祖先 ⇒ 它记的是另一条线上的提交（本仓实测有 reasonix/* 旁支）；
     3) 该 SHA 之后 apps/api 有改动 ⇒ G8 十环 / G9 / "后端已重启"前置件量的那个后端
        已经不是现在这个后端：载体不是在报旧数，是在报错对象。
   判警示（报距离与改动数，不拦路，退出码仍 0）：落后只发生在客户端/脚本侧。
   为什么不对任何 client 改动 blanket-fail（这是刻意选的，不是偷懒）：
     · 载体只能由 write-gates-json.mjs 真跑一遍 G8 才能重写，而 G8 每跑一次真写 4 行库、
       还要占模拟器租约；"任何客户端提交都判红"= 门禁常驻红色 ⇒ 真出事时没人再看它，
       比没有门禁更糟。本轮要防的是"把 21 个提交前的载体当本轮复验凭据"，不是每次提交都报警。
     · 客户端提交只让载体显得陈旧，不会洗白当前结论：终报 G 节把"载体当时值"与"本次复跑值"
       两行并印（它自己的话：两者不一致即"证据已过期"，两条都印、不取齐、不覆盖）。
     · apps/api 改动不一样：要重现载体里的 G8/G9 必须先把后端重启（那是会写库、要占设备的行为），
       所以后端一旦动过，PASS 就不再可复核 ⇒ 这一条判红。
   要更严的人：--max-behind N（默认 0=不设限）把"落后超过 N 个提交"也升级成红，由人显式决定。
   已知不覆盖：工作树未提交的改动不在本判据里（SHA 无法描述脏树），只报距离。 */
const SHA_MAX_BEHIND = Number(arg("max-behind", "0")) || 0;
/* stderr 一律吞掉：探测性调用（cat-file / merge-base）失败是**判据的一部分**，
   让 git 把 "fatal: Not a valid object name …" 泼到门禁自己的输出里，
   读日志的人会以为是脚本崩了，而不是"载体 SHA 解析不到"这条结论。 */
const GIT = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const GITOK = (...a) => { try { GIT(...a); return true } catch { return false } };
const churn = (sha, p) => { try { return GIT("diff", "--name-only", sha + "^{commit}", "HEAD", "--", p).split("\n").filter(Boolean).length } catch { return -1 } };
let HEAD_SHORT = "";
try { HEAD_SHORT = GIT("rev-parse", "--short", "HEAD") } catch { HEAD_SHORT = "" }
const shaCache = new Map();
function shaState(rec) {
  const sha = String(rec || "").trim();
  if (shaCache.has(sha)) return shaCache.get(sha);
  const st = { sha, head: HEAD_SHORT, level: "FAIL", distance: null, api: null, client: null, runner: null, msg: "" };
  shaCache.set(sha, st);
  const shape = /^[0-9a-f]{7,40}$/.test(sha);
  if (!HEAD_SHORT) { st.msg = "取不到当前 HEAD（git 不可用？）⇒ 新鲜度判据失效，按不可信记"; return st; }
  if (!shape) { st.msg = `载体 gitSha=${sha || "(空)"} 不是合法 SHA`; return st; }
  if (!GITOK("cat-file", "-e", sha + "^{commit}")) { st.msg = `载体 gitSha=${sha} 在本仓解析不到 ⇒ 三道 Gate 的数归因不到提交（HEAD=${HEAD_SHORT}）`; return st; }
  if (!GITOK("merge-base", "--is-ancestor", sha, "HEAD")) { st.msg = `载体 gitSha=${sha} 不是 HEAD(${HEAD_SHORT}) 的祖先 ⇒ 它记的是另一条线上的提交`; return st; }
  st.distance = Number(GIT("rev-list", "--count", sha + "^{commit}" + "..HEAD")) || 0;
  st.api = churn(sha, "apps/api");
  st.client = churn(sha, "apps/client/src");
  st.runner = ["scripts/qa/g8-e2e.cjs", "scripts/qa/g9-probe.cjs", "scripts/qa/verify-backend-restarted.mjs", "apps/client/scripts/build-real-isolated.mjs"]
    .reduce((s, p) => s + Math.max(0, churn(sha, p)), 0);
  if (st.distance === 0) { st.level = "FRESH"; st.msg = `载体 SHA 就是 HEAD(${HEAD_SHORT}) ⇒ 新鲜`; return st; }
  if (st.api > 0) { st.level = "FAIL"; st.msg = `载体 gitSha=${sha} 落后 HEAD 共 ${st.distance} 个提交，其间 apps/api 改了 ${st.api} 个文件 ⇒ G8/G9 与"后端已重启"前置件量的后端已不是现在这个后端，载体里的 PASS 不可复核`; return st; }
  if (SHA_MAX_BEHIND && st.distance > SHA_MAX_BEHIND) { st.level = "FAIL"; st.msg = `载体 gitSha=${sha} 落后 ${st.distance} 个提交 > --max-behind ${SHA_MAX_BEHIND} ⇒ 按收紧口径判红`; return st; }
  st.level = "WARN";
  st.msg = `载体 gitSha=${sha} 落后 HEAD(${HEAD_SHORT}) 共 ${st.distance} 个提交，其间 apps/api 改 0 / apps/client/src 改 ${st.client} / 量具脚本改 ${st.runner} 个文件 ⇒ 只作"陈旧"记，不判红；载体里的数不是本轮复验凭据`;
  return st;
}

/* 台账判据：行必须由 id 定位到，且行内含指定标记。
   ledgerText 走参数而不是读闭包里的全局量 —— 否则 --selftest 里"改掉日期"这一枪
   打在空气上（第一版就是这样：那条负例永远不会红，比没有负例更糟，因为它长得像覆盖）。 */
function ledgerRow(id, text) {
  return text.split("\n").find((l) => l.startsWith("| " + id + " ") || l.startsWith("|" + id + "|")) || null;
}

const ITEMS = [
  {
    key: "登录页已登录落地页",
    kind: "ledger", id: "MP-R6REAL-PAGES-LOGIN-INDEX-001",
    must: [/裁决\s*2026-\d\d-\d\d/, /pages\/login\/index\.vue:8[0-9]/],
    why0: "裁决必须落在行里（带日期）", why1: "且要留得住『有意实现』这个结论的源码锚点",
  },
  {
    key: "ChatInput.vue 删除去留",
    kind: "ledger", id: "MP-R2VIS-COMPONENTS-CHAT-CHATINPUT-A01",
    must: [/裁决\s*2026-\d\d-\d\d/, /git ls-files/],
    why0: "采 (A) 保留整件删除这条裁决要写进行", why1: "且要留可复现的核对动作（git ls-files）",
  },
  {
    key: "GATES.json 过期载体重写",
    kind: "file", path: GATES_REL,
    check: (j) => j.schemaVersion === "gates-2"
      && /^[0-9a-f]{7,40}$/.test(String(j.gitSha || ""))
      && shaState(j.gitSha).level !== "FAIL"
      && /git rev-parse/.test(String(j.gitShaSource || ""))
      && !!j.capturedAt && !!j.precondition && /verify-backend-restarted/.test(String(j.precondition.check || "")),
    why0: (j) => { const s = shaState(j.gitSha); return s.level === "FAIL" ? "载体 SHA 新鲜度不过：" + s.msg : "载体必须是重写后的 gates-2：运行期取 SHA（不写死）、带重启前置件指针，且该 SHA 不许落后到改动后端（apps/api）"; },
  },
  {
    key: "遗留测试数据处置",
    kind: "file", path: GATES_REL,
    check: (j) => !!j.dbWriteDisclosure && !!j.newDbKeysThisRound && Object.keys(j.newDbKeysThisRound).length >= 4
      && Object.values(j.newDbKeysThisRound).every((v) => typeof v === "number" && v >= 0),
    why0: "「保留不删」这条裁定必须连着『本轮真写了哪些键』一起落账，不能只留一句态度",
  },
];

function judge(items, text) {
  const ledgerText0 = text || ledgerText;
  const out = [];
  for (const it of items) {
    if (it.kind === "ledger") {
      const row = ledgerRow(it.id, ledgerText0);
      const misses = !row ? ["找不到台账行 " + it.id] : it.must.filter((re) => !re.test(row)).map((re) => "行内缺标记 " + re.source.slice(0, 40));
      out.push({ key: it.key, ok: !misses.length, misses });
    } else {
      const p = resolve(REPO, it.path);
      if (!existsSync(p)) { out.push({ key: it.key, ok: false, misses: ["载体文件不存在 " + it.path] }); continue; }
      let j = null; try { j = JSON.parse(readFileSync(p, "utf8")); } catch (e) { out.push({ key: it.key, ok: false, misses: ["载体不是合法 JSON：" + e.message.slice(0, 60)] }); continue; }
      let ok = false; try { ok = !!it.check(j); } catch (e) { ok = false; }
      const why = typeof it.why0 === "function" ? it.why0(j) : it.why0;
      out.push({ key: it.key, ok, misses: ok ? [] : [why] });
    }
  }
  return out;
}

const verdict = judge(ITEMS);
let fail = verdict.filter((v) => !v.ok).length;
console.log(`RULINGS 四项=${ITEMS.length} 已落地=${verdict.length - fail} 未落地=${fail}（判据：${ITEMS.map((i) => i.kind).join("/")}）`);
for (const v of verdict) console.log((v.ok ? "  ok   " : "  ✗    ") + v.key + (v.ok ? "" : " :: " + v.misses.join("；")));

/* 载体 SHA 新鲜度单独印一行：判红/判警示都要给出距离与按路径的改动数，
   否则读报告的人只知道"红了"，分不清"落后 21 个提交但没人动后端"和"后端都换了"是两回事。 */
let gatesDoc = null;
try { if (existsSync(GATES_PATH)) gatesDoc = JSON.parse(readFileSync(GATES_PATH, "utf8")); } catch { /* 不是合法 JSON 这件事，上面的判据行已经报过 */ }
const st = shaState(gatesDoc && gatesDoc.gitSha);
console.log(`RULINGS_GITSHA 载体=${st.sha || "(取不到)"} HEAD=${st.head || "(取不到)"} 距离=${st.distance === null ? "?" : st.distance}个提交 apps/api改动=${st.api === null ? "?" : st.api} apps/client/src改动=${st.client === null ? "?" : st.client} 判=${st.level === "FAIL" ? "红" : st.level === "WARN" ? "陈旧警示" : st.level === "FRESH" ? "新鲜" : "不可判"}`);
if (st.level === "WARN") console.log("  !    gitSha 新鲜度：" + st.msg);

if (SELFTEST) {
  /* 每条判据各破坏一次：改坏的那次必须红，全绿就说明这条判据是装饰。 */
  const breaks = [];
  /* 1/2：把「那一行」的日期标记拿掉（等价于"裁决没写进账"）。
     注意必须定位到行再改：整份文件 replace 只会命中**第一处**日期，
     而台账里带日期的裁决句有十几条 —— 打错目标的负例等于没有负例。 */
  const saved = ledgerRow("MP-R6REAL-PAGES-LOGIN-INDEX-001", ledgerText);
  const brokenRow = saved ? saved.replace(/裁决\s*2026-\d\d-\d\d/, "裁决（日期缺失）") : "";
  const tamperedLedger = saved && brokenRow !== saved ? ledgerText.split(saved).join(brokenRow) : "";
  breaks.push(["台账去掉日期后必须红", !judge([{ kind: "ledger", id: "MP-R6REAL-PAGES-LOGIN-INDEX-001", must: [/裁决\s*2026-\d\d-\d\d/] }], tamperedLedger).every((v) => v.ok)]);
  breaks.push(["不存在的行必须红", !judge([{ kind: "ledger", id: "MP-NOPE-000", must: [/x/] }]).every((v) => v.ok)]);
  const gates = JSON.parse(readFileSync(GATES_PATH, "utf8"));
  breaks.push(["gitSha 写死成 HEAD 字样必须红", !ITEMS[2].check({ ...gates, gitSha: "HEAD" })]);
  breaks.push(["缺重启前置件指针必须红", !ITEMS[2].check({ ...gates, precondition: {} })]);
  breaks.push(["测试数据键清单被清空必须红", !ITEMS[3].check({ ...gates, newDbKeysThisRound: {} })]);
  breaks.push(["dbWriteDisclosure 被删必须红", !ITEMS[3].check({ ...gates, dbWriteDisclosure: null })]);
  /* 新鲜度判据的四个样本全部**现取于真历史**（不写死 SHA：写死就是把今天的读数当常量）。
     注意还有两个"必须绿"的正例：只有负例的门禁会靠"什么都红"假装严格，
     那种门禁同样没人信 —— 在盘载体（客户端落后 21 个提交、后端 0 改动）必须只是警示。 */
  const apiStale = (() => {
    try { return GIT("rev-parse", "--short", GIT("log", "-1", "--format=%H", "--", "apps/api") + "^"); } catch { return ""; }
  })();
  const side = (() => { try { return GIT("rev-list", "--max-count=1", "--all", "--not", "HEAD").slice(0, 8); } catch { return ""; } })();
  breaks.push(["载体 SHA 解析不到（形状合法）必须红", !ITEMS[2].check({ ...gates, gitSha: "deadbeef" }), shaState("deadbeef").msg]);
  breaks.push(["载体不是 HEAD 的祖先（旁支提交）必须红", side ? !ITEMS[2].check({ ...gates, gitSha: side }) : false, side ? shaState(side).msg : "本仓没有旁支提交可取 ⇒ 这条负例等于没测"]);
  breaks.push(["载体落后且其间 apps/api 改动过必须红", apiStale ? !ITEMS[2].check({ ...gates, gitSha: apiStale }) : false, apiStale ? shaState(apiStale).msg : "取不到动过后端的祖先提交 ⇒ 这条负例等于没测"]);
  breaks.push(["载体 SHA = HEAD 必须绿（新鲜载体不误伤）", ITEMS[2].check({ ...gates, gitSha: HEAD_SHORT }), shaState(HEAD_SHORT).msg, "POS"]);
  const clientStale = (() => {
    for (let n = 1; n <= 20; n++) {
      let s; try { s = GIT("rev-parse", "--short", "HEAD~" + n) } catch { return "" }
      if (shaState(s).distance > 0 && churn(s, "apps/api") === 0) return s;
    }
    return "";
  })();
  breaks.push(["载体只落后在客户端（apps/api 零改动）必须只警示、不拦路", clientStale ? shaState(clientStale).level === "WARN" && ITEMS[2].check({ ...gates, gitSha: clientStale }) === true : false, clientStale ? shaState(clientStale).msg : "取不到「只动客户端的落后提交」⇒ 这条正例等于没测", "POS"]);
  let bfail = 0;
  for (const [name, ok, msg, kind] of breaks) { const k = kind || "NEG"; console.log((ok ? "  ok   " : "  ✗    ") + k + " " + name + (msg ? " ⟵ " + msg : "")); if (!ok) bfail++; }
  console.log(`RULINGS_SELFTEST=${bfail ? "FAIL" : "PASS"} 样本=${breaks.length}（含 2 条必须绿的）未按预期=${bfail}`);
  if (bfail) process.exit(2);
  if (!tamperedLedger.includes("裁决（日期缺失）") || !saved) { console.log("  ✗    NEG 自检前置量没生成（这条负例等于没测）"); process.exit(2); }
}
console.log(fail ? `RULINGS_RESULT=FAIL 未落地=${fail}` : "RULINGS_RESULT=PASS ④ 四项都有可重跑判据背书");
process.exit(fail ? 2 : 0);
