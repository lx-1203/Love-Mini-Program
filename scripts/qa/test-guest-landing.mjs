#!/usr/bin/env node
/* verify-guest-landing.mjs 的负例自检：门禁若不会为真问题变红，它就是装饰。
   每条一个"必须红"的注入 + 一条真数据的"必须绿"，全部离线（不开模拟器、不抢租约）。
   Node 要 v22：PATH 上的缺省 node 是 DevTools 的 v16。 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { landingStatus, LANDING_UNCLOSED } from "./guest-landing-status.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TMP = resolve(REPO, ".zcode/tmp/guest-landing-selftest");
mkdirSync(TMP, { recursive: true });
const SCRIPT = resolve(REPO, "scripts/qa/verify-guest-landing.mjs");
const POLICY = resolve(REPO, "scripts/qa/guest-landing-policy.json");
const TRIAGE = resolve(REPO, ".zcode/tmp/triage-r7-guest.json");
/* 第二条腿：守卫车道的声明身份游客语料（exec-guest-real-guard-r10）。
   为什么必须在测试里现算而不是抄一份：:16 那份 scratch 是 2026-09-27 09:28 的，早于守卫入库，
   它不可能含 "setup/recommend-pref/index → pages/login/index" 这一组 —— 于是第 28 条裁定一落地，
   "每条裁定恰好一条腿" 就在一份**过期夹具**上判红（夹具会随数据过期，钉它的字面数更是雪上加霜）。
   载具自己在 GUEST_LAND_WARN 里就写了正确用法："本轮多条执行腿必须 --triage a,b 传并集"。 */
const GUEST_LEG_corpus = resolve(REPO, "reports/audit/round-7/exec-guest-real-guard-r10/exec-results.json");
const TRIAGE2 = resolve(TMP, "triage-r10-guest.json");
if (existsSync(GUEST_LEG_corpus)) {
  const g = spawnSync(process.execPath, [resolve(REPO, "scripts/qa/triage-exec-failures.mjs"),
    "--results", GUEST_LEG_corpus, "--out", TRIAGE2], { cwd: REPO, encoding: "utf8", timeout: 300000 });
  if (g.status !== 0 || !existsSync(TRIAGE2 + ".json")) {
    console.log("FAIL 派生第二条游客腿的 triage 没成功 :: exit=" + g.status + " " + String(g.stdout + g.stderr).slice(0, 200));
    fail++; checks++;
  } else { renameSync(TRIAGE2 + ".json", TRIAGE2); }
}
/* 并集组数：两语料各自 "page → landed" 的去重并（与载具的 SOURCES 轴同口径），
   用来替掉原先钉死的 26 / 239 / 27 —— 那些字面数每加一条合法裁定就必然假红。 */
const unionGroupsOf = (...docs) => {
  const s = new Set();
  for (const d of docs) for (const k of Object.keys(d.landingGroups || {})) s.add(k);
  return s;
};
const UNION_GROUPS = unionGroupsOf(
  JSON.parse(readFileSync(TRIAGE, "utf8")),
  existsSync(TRIAGE2) ? JSON.parse(readFileSync(TRIAGE2, "utf8")) : { results: [] },
).size;
const OPS_DIR = resolve(REPO, "reports/audit/round-6/ops");
const NODE = process.execPath;
const realTriage = JSON.parse(readFileSync(TRIAGE, "utf8"));
const realPolicy = readFileSync(POLICY, "utf8");
const polObj = JSON.parse(realPolicy);

let checks = 0, fail = 0;
const t = (name, cond, got) => {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${String(got).slice(0, 240)}`); }
  else console.log(`ok   ${name}`);
};
function run(label, args) {
  const r = spawnSync(NODE, [SCRIPT, ...args, "--out", resolve(TMP, label + "-booked.json")], { cwd: REPO, encoding: "utf8", timeout: 120000 });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
function writeJson(p, o) { writeFileSync(p, JSON.stringify(o)); return p; }
/** 按前缀挑出载具的那一行判决；挑不到就把"没有这一行"本身交回给断言去红（不许静默当 0）。 */
const lineWith = (out, prefix) => out.split(/\r?\n/).find((l) => l.startsWith(prefix)) || "(输出里没有以 " + prefix + " 开头的行)";
let realOut = ""; // 块 1 存一份真数据 stdout，块 3 的守恒可见性要用它做基线

/* 1) 真数据必须绿，且数字不能是空集凑出来的
   2026-09-29 改期望（口径搬家 = 真数据/真设计变了，不是门坏）：这里原来只有一条
     /groups=26 覆盖欠款行=239/
   —— 把**两条互不相同的轴**钉在同一个数上。#67（commit d480461c "fix(qa): #67 GG-* 成员账改由
   判据台派生"，2026-09-28）之后载具印的是两行两个数：
     GUEST_LAND_SOURCES=…（组=26，行次=239） ⇒ 并集组数=26 并集行数=239  ← 跑测观察到的落地对（在册实测：26 组 / 239 落点）
     GUEST_LANDING groups=26 覆盖欠款行=434 …                             ← 成员账，改由 ops 判据台派生
   处理：26/239 按字面继续钉住，但钉回它所属的那条轴（SOURCES 行）；434 这个随 ops 挪动的数
   **不再钉死快照值**，改成"载具印的数 == 载具自己写的账本头 == 账本逐组相加"三方互算，任一不一致就红。
   这是收紧不是放宽：原写法只能发现"数字变了"，新写法能发现"哪两条腿对不上"，而且 ops 一动不会假红。 */
{
  const triageArg = existsSync(TRIAGE2) ? TRIAGE + "," + TRIAGE2 : TRIAGE;
  const r = run("real", ["--policy", POLICY, "--triage", triageArg]);
  realOut = r.out;
  t("真数据 exit 0", r.code === 0, "exit=" + r.code + "\n" + r.out);
  const srcLine = lineWith(r.out, "GUEST_LAND_SOURCES=");
  /* 原来钉的是字面串 "（组=26，行次=239） ⇒ 并集组数=26 并集行数=239" —— 一句话里钉了三个数，
     且钉的是"某一次夹具快照"。改成两条真守恒：① 行内自述的组数必须等于它自己算出的并集组数
     （载具内部两轴对不上就红）；② 该并集组数必须等于我从输入语料按同一口径独立算出的数
     （载具少收一条腿/多并一份语料就红）。行次只断言正数，防空集凑绿。 */
  const mSrcAll = [...srcLine.matchAll(/（组=(\d+)，行次=(\d+)）/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const mUni = /并集组数=(\d+) 并集行数=(\d+)/.exec(srcLine);
  /* 原来钉的是字面串 "（组=26，行次=239） ⇒ 并集组数=26 并集行数=239"：一句话里钉了三个数，
     钉的还是"某一次夹具的快照"。传第二条腿以后这行变成两段（组=26）;（组=1）⇒ 并集=27，
     那条字面正则本身就必然失配 —— 所以改成两条与输入无关的守恒：
     ① 并集不得小于任何一路输入（少收一条腿/悄悄丢一份语料就红），且各路都得是正数（防空集凑绿）；
     ② 并集组数必须等于我按同一口径（各 triage 的 landingGroups 去重并）独立复算的数。 */
  t("跑测观察轴守恒：并集 ≥ 每一路输入、每路组/行皆正（不许空集凑绿、不许悄悄丢语料）",
    !!mUni && mSrcAll.length >= 1 && mSrcAll.every(([g, n]) => g > 0 && n > 0) &&
      Number(mUni[1]) >= Math.max(...mSrcAll.map(([g]) => g)) &&
      Number(mUni[2]) >= Math.max(...mSrcAll.map(([, n]) => n)) && Number(mUni[2]) > 0,
    "并集=" + (mUni ? mUni[1] + "组/" + mUni[2] + "行" : "(读不到)") + " 各路=" + JSON.stringify(mSrcAll) + " ｜ " + srcLine.slice(0, 200));
  t("跑测观察轴 == 按同一口径独立复算的并集组数（" + UNION_GROUPS + "）",
    !!mUni && Number(mUni[1]) === UNION_GROUPS,
    "载具并集组数=" + (mUni ? mUni[1] : "(读不到)") + " 独立复算=" + UNION_GROUPS + " ｜ " + srcLine.slice(0, 160));
  const finalLine = lineWith(r.out, "GUEST_LANDING groups=");
  const mDebt = /groups=(\d+) 覆盖欠款行=(\d+)/.exec(finalLine);
  t("成员账轴：groups == 独立复算的并集组数 且覆盖欠款行为正数（不许是空集凑出来的绿）",
    !!mDebt && Number(mDebt[1]) === UNION_GROUPS && Number(mDebt[2]) > 0, finalLine);
  const booked = JSON.parse(readFileSync(resolve(TMP, "real-booked.json"), "utf8"));
  const sumDebt = booked.rows.reduce((a, x) => a + (x.debtRows || 0), 0);
  t("成员账三方互算：载具印的数 == 账本头 == 账本逐组相加",
    !!mDebt && Number(mDebt[2]) === booked.debtRows && booked.debtRows === sumDebt,
    "印=" + (mDebt ? mDebt[2] : "(读不到)") + " 账本头=" + booked.debtRows + " 逐组相加=" + sumDebt);
  t("真数据锚点全可核", /锚点可核=11（不可核 0）/.test(r.out), finalLine);
  /* 「出例数 = 组数」这条 2026-09-29 换判法：#67 之前名册遍历**跑测观察到的组**（那时两个数同为 26），
     之后名册遍历 **policy 裁定条数**（27），旧断言 rows.length===26 于是变成设计搬家的假红
     （实跑 rows=27、groups=26，两者本就不是一个东西）。现在两轴各钉一条，并补一条真正要守的东西：
     每条裁定恰好一条腿、groupKey 不重不漏 —— 载具里那两个 `continue`（成员为空 / family 无 markers 口径）
     会静默吞掉整组的腿，旧写法只比总数，吞一组与多一组相互抵掉时看不见。 */
  t("出例数 = policy 裁定条数（#67 后名册遍历 policy；这个数由 policy 派生，不钉字面值）",
    booked.rows.length === polObj.rows.length,
    "rows=" + booked.rows.length + " policy.rows=" + polObj.rows.length);
  const polKeys = new Set(polObj.rows.map((x) => x.page + " → " + x.landing));
  const gotKeys = booked.rows.map((x) => x.groupKey);
  t("每条裁定恰好一条腿（groupKey 不重、不漏、不多）",
    new Set(gotKeys).size === gotKeys.length && polKeys.size === booked.rows.length &&
      gotKeys.every((k) => polKeys.has(k)) && [...polKeys].every((k) => gotKeys.includes(k)),
    "腿=" + gotKeys.length + " 唯一=" + new Set(gotKeys).size + " policy 组=" + polKeys.size);
  t("每组都带 caseIds（欠款可归属）", booked.rows.every((x) => Array.isArray(x.caseIds) && x.caseIds.length), "有空 caseIds");
  t("跑测组数与裁定条数不相等时必须说得出为什么（NO_RUN_WITNESS 具名读数存在且等于两轴之差）",
    /GUEST_LAND_NO_RUN_WITNESS=(\d+)/.test(r.out) && Number(/GUEST_LAND_NO_RUN_WITNESS=(\d+)/.exec(r.out)[1]) === polObj.rows.length - UNION_GROUPS,
    lineWith(r.out, "GUEST_LAND_NO_RUN_WITNESS="));
}
/* 2) triage 多出一组（新落点没裁定）必须红 */
{
  const tri = JSON.parse(JSON.stringify(realTriage));
  tri.landingGroups["subpackages/ghost/page → pages/login/index"] = ["GH01"];
  const p = writeJson(resolve(TMP, "extra-triage.json"), tri);
  const r = run("extra", ["--policy", POLICY, "--triage", p]);
  t("新落点无裁定 ⇒ 红", r.code === 2 && /policy 缺这几组/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 3) 失效裁定 ⇒ 红：2026-09-29 重新武装（先证明旧注入【没有能力】变红，再改注入，不改判据）
   旧写法只做一件事：从 triage 里删掉一组落地对，指望载具喊「policy 里这几组……没有对应落地对」。
   那句话随 #67（commit d480461c）整条换成了双向守恒：
     跑测少一组 + ops 判据台有"被收窄出游客腿"的成员 ⇒ 只记 GUEST_LAND_NO_RUN_WITNESS 具名读数（不判红）
     跑测少一组 + ops 也没有成员                    ⇒ 红（"这一组没有任何证人"）
   实测 policy 的 27 个页在 reports/audit/round-6/ops 里【全部】有被收窄的成员（27/27 非零；
   派生口径同载具 guestNoLongerClaims）⇒ 旧注入结构上只可能落在"不判红"那一支，
   所以它 exit=0 是**负例失去红能力**，不是门坏（门的红分支还在，只是换了触发条件）。
   重新武装 = 按载具现在认定的"裁定失效"形态把两把尺一起撤：
     ① 从 triage 删掉这一组（跑测证人没了）
     ② 在 ops 的 scratch 副本里把这一页的用例改回"游客腿也认领"（判据台证人也没了）
   并且先跑一条"只换 ops 目录、内容逐条相同"的控制腿：红必须只由 ② 引起，不许是搬目录造成的。
   注入的落点自己打印（mutated=N），N=0 视为负例空转。 */
{
  const TARGET = "subpackages/tools/search/index → pages/login/index";
  const TARGET_PAGE = "subpackages/tools/search/index";
  const copyOps = (dir, regrantGuest) => {
    mkdirSync(dir, { recursive: true });
    let mutated = 0, copied = 0;
    for (const f of readdirSync(OPS_DIR).filter((x) => x.endsWith(".json"))) {
      const j = JSON.parse(readFileSync(join(OPS_DIR, f), "utf8"));
      for (const c of j.cases || []) {
        if (String(c.page || "").trim() !== TARGET_PAGE) continue;
        if (regrantGuest) { c.identities = ["guest"]; mutated++; } // 游客腿重新认领 ⇒ 该页在 ops 里不再记账
      }
      writeFileSync(join(dir, f), JSON.stringify(j));
      copied++;
    }
    return { mutated, copied };
  };
  const ctl = copyOps(resolve(TMP, "ops-pristine"), false);
  const tam = copyOps(resolve(TMP, "ops-stripped"), true);
  const tri = JSON.parse(JSON.stringify(realTriage));
  const keyWasThere = TARGET in tri.landingGroups;
  delete tri.landingGroups[TARGET];
  const pLess = writeJson(resolve(TMP, "less-triage.json"), tri);
  /* 2026-09-30：这两条腿的 --triage 现在传并集（与基线 realOut 同一份输入）。
     原来只传单份 TRIAGE，于是"跑测少一组"这个变量上同时混着两件事：
     被检的 tools/search 没了 + 真语料里 subpackages/setup/recommend-pref/index 本来就不在这份 2026-09-27
     的单切片里 ⇒ 删一组后读数从 +1 变成 +2，测的就不再是"少一组"这一个变量
     （载具自己在 GUEST_LAND_WARN 里就要求多条执行腿传并集，这里只是把夹具对齐它写的正确用法，
     判据一个字没松）。 */
  const triageArg = existsSync(TRIAGE2) ? pLess + "," + TRIAGE2 : pLess;
  t("注入本身落在被检的那一行上（triage 里本来有这一组、ops 里本来有这一页的成员）",
    keyWasThere && tam.mutated > 0 && ctl.copied > 0,
    "triage 命中=" + keyWasThere + " ops 改写条数=" + tam.mutated + " ops 文件拷贝=" + ctl.copied + "（N=0 = 负例空转）");
  /* 3a 控制腿：换 ops 目录（内容与权威目录逐条相同）+ 删掉跑测那一组 ⇒ 按 #67 口径不判红，
        但必须把这一组记成具名读数（读数比基线多 1，不许静默） */
  const rc = run("less-control", ["--policy", POLICY, "--triage", triageArg, "--ops", resolve(TMP, "ops-pristine")]);
  const rwOf = (out) => { const m = /GUEST_LAND_NO_RUN_WITNESS=(\d+)/.exec(out); return m ? Number(m[1]) : null; };
  const rwBase = rwOf(realOut);
  t("跑测少一组而判据台仍认账 ⇒ 具名读数 +1（不许静默吞掉失效裁定）",
    rwBase !== null && rwOf(rc.out) === rwBase + 1, "基线=" + rwBase + " 删一组后=" + rwOf(rc.out) + "\n" + rc.out.slice(0, 300));
  /* 3b 重武装后的负例：两把尺同时撤 ⇒ 必须红，且红句点名这一组 */
  const rr = run("less-stripped", ["--policy", POLICY, "--triage", triageArg, "--ops", resolve(TMP, "ops-stripped")]);
  t("失效裁定 ⇒ 红（跑测证人 + 判据台证人同时撤）",
    rr.code === 2 && /这一组没有任何证人/.test(rr.out) && rr.out.includes(TARGET),
    "exit=" + rr.code + "\n" + rr.out.slice(0, 400));
}
/* 4) 空集不许判绿：一个"没有欠款"的读法会把整门变成永真
   2026-09-29：这条此前 exit=0 是**载具真的坏了** —— 空并集判红那条 guard 本来就在
   （verify-guest-landing.mjs 的多源注释也还写着"并集为空仍判红"），却在 #67 改写（commit d480461c）
   里被连带删掉；成员账改由 ops 派生之后，喂进 {landingGroups:{}} 仍能凑出 27 条腿 / 422 行成员而判绿。
   处置 = 恢复载具那条 guard（收紧，不是放宽），本断言一字未改。 */
{
  const p = writeJson(resolve(TMP, "empty-triage.json"), { landingGroups: {} });
  const r = run("empty", ["--policy", POLICY, "--triage", p]);
  t("空集 ⇒ 红", r.code === 2 && /空集/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 5) 锚点行漂移必须红（改了代码没改依据） */
{
  const pol = JSON.parse(realPolicy);
  pol.anchors[0].line = 1;
  const p = writeJson(resolve(TMP, "drift-policy.json"), pol);
  const r = run("drift", ["--policy", p, "--triage", resolve(REPO, ".zcode/tmp/triage-r7-guest.json")]);
  t("锚点行漂移 ⇒ 红", r.code === 2 && /行漂移/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 6) guardCaseId 撞号必须红（subpackages/a/b-c 与 subpackages/a-b/c 归一化后同号 ⇒ 复测腿归属不清） */
{
  const pol = JSON.parse(realPolicy);
  pol.rows = pol.rows.filter((x) => x.page !== "subpackages/tools/search/index").concat([
    { page: "subpackages/coll/ide-x", landing: "pages/login/index", family: "guide-401", entry: "内容浏览" },
    { page: "subpackages/coll-ide/x", landing: "pages/login/index", family: "guide-401", entry: "内容浏览" },
  ]);
  const tri = JSON.parse(JSON.stringify(realTriage));
  delete tri.landingGroups["subpackages/tools/search/index → pages/login/index"];
  tri.landingGroups["subpackages/coll/ide-x → pages/login/index"] = ["CL01"];
  tri.landingGroups["subpackages/coll-ide/x → pages/login/index"] = ["CL02"];
  const r = run("dup", ["--policy", writeJson(resolve(TMP, "dup-policy.json"), pol), "--triage", writeJson(resolve(TMP, "dup-triage.json"), tri)]);
  t("guardCaseId 撞号 ⇒ 红", r.code === 2 && /撞号/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 300));
}
/* 7) landingStatus 五态各自成立（这函数决定 triage 门禁说什么话）
   2026-10-01 §35(4) 收紧落点稳定性判据 ⇒ 四态变五态：新增 MEASURED-UNSTABLE。
   这次改的是**夹具**与**态数**，不是判据的松紧：
     - 原 `mk()` 造的行没有 samples 字段。旧判据看不见 samples，所以它照样 CLOSED；
       新判据"没有第二次测量就不算稳定"于是把那行打成 MEASURED-UNSTABLE —— 这不是门坏了，
       是那条夹具本来就不满足"稳定"的前提。补齐两样本让"全中 = CLOSED"这一格测的仍是它声称的那一格，
       并另加两格负例把"单样本不许算 CLOSED"钉住（少这两格，收紧就等于没测）。
     - 态数从 4 钉到 5 是可归因的决定，不是把红数改小：新增的那两格负例保证
       "谁把 MEASURED-UNSTABLE 从 LANDING_UNCLOSED 里摘掉"或"把 n=1 折成稳定"都会立刻变红。 */
{
  const booked = { rows: [{ groupKey: "g1", landing: "pages/login/index", landingMarker: ".login-page__brand", registerEntry: ".login-register-entry", guardCaseId: "GG-1", debtRows: 3 }] };
  const same2 = [{ landing: "pages/login/index" }, { landing: "pages/login/index" }];
  const mk = (over) => ({ repeat: 2, rows: [{ groupKey: "g1", measuredLanding: "pages/login/index", identity: "not-logged-in", markers: { ".login-page__brand": "1", ".login-register-entry": "1" }, samples: same2, repeatDeclared: 2, measuredAt: "x", band: "real@1", ...over }] });
  t("无实测 = BOOKED（不算结案）", landingStatus(booked, null)[0].status === "BOOKED", landingStatus(booked, null)[0].status);
  t("落点变了 = MEASURED-DRIFT", landingStatus(booked, mk({ measuredLanding: "pages/home/index" }))[0].status === "MEASURED-DRIFT", "x");
  t("身份不是游客 = MEASURED-INVALID", landingStatus(booked, mk({ identity: "logged-in userId=7" }))[0].status === "MEASURED-INVALID", "x");
  t("注册入口不在 = MEASURED-FAIL（产品缺口，不许改判据）", landingStatus(booked, mk({ markers: { ".login-page__brand": "1", ".login-register-entry": "0" } }))[0].status === "MEASURED-FAIL", "x");
  t("探针答 ERR 也算不过（不许把探针坏了折成 absent）", landingStatus(booked, mk({ markers: { ".login-page__brand": "1", ".login-register-entry": "ERR:timeout" } }))[0].status === "MEASURED-FAIL", "x");
  t("全中且有第二次测量 = CLOSED", landingStatus(booked, mk({}))[0].status === "CLOSED", "x");
  /* 7a 收紧买到的东西：n=1 的行（就是账本里那 17 行的形状）不许再被读成已结案。
     旧判据在这里会判 CLOSED —— 这条断言就是那把能量出红的尺。 */
  const one = landingStatus(booked, mk({ samples: [{ landing: "pages/login/index" }], repeatDeclared: 1 }))[0];
  t("7a 单样本 + 顶层声明 repeat=2 ⇒ MEASURED-UNSTABLE（未结案，不算 CLOSED）",
    one.status === "MEASURED-UNSTABLE" && /^未结案/.test(one.statusText), one.status + " ｜ " + one.statusText);
  t("7a 降级原因写成字段：样本数不足（SHORT_SAMPLES），且话说清是「没测够」而不是「落点变了」",
    one.stability && one.stability.stableDefect === "SHORT_SAMPLES" && one.stability.stableSamples === 1 &&
      one.stability.stableRequiredSamples === 2 && /单样本|样本数不足/.test(one.stability.stableWhy || "") &&
      !/落点不一致/.test(one.stability.stableWhy || ""),
    JSON.stringify(one.stability && { d: one.stability.stableDefect, b: one.stability.stableBasis, w: one.stability.stableWhy }));
  /* 7b 另一类降级：够数但落点不一致，原因必须与 7a 分得开（两类分开计数是报数行的前提） */
  const diff = landingStatus(booked, mk({ samples: [{ landing: "pages/login/index" }, { landing: "pages/home/index" }] }))[0];
  t("7b 两次测量落点不一致 ⇒ MEASURED-UNSTABLE 且原因点名「落点不一致」",
    diff.status === "MEASURED-UNSTABLE" && diff.stability.stableDefect === "LANDING_DISAGREE" &&
      /落点不一致/.test(diff.stability.stableWhy) && diff.stability.stableWhy.includes("pages/home/index"),
    JSON.stringify(diff.stability && { d: diff.stability.stableDefect, w: diff.stability.stableWhy }));
  /* 7c 读取侧不信行里那个 stable=true：合并账里旧行的字段与现算矛盾时必须以现算为准 */
  const stale = landingStatus(booked, mk({ samples: [{ landing: "pages/login/index" }], stable: true, repeatDeclared: undefined }))[0];
  t("7c 旧行写着 stable=true 但只有 1 个样本 ⇒ 以现算为准（未结案），不许拿字段冒充证据",
    stale.status === "MEASURED-UNSTABLE" && stale.stability.recordedStable === true && stale.stability.stable === false,
    "status=" + stale.status + " 字段=" + stale.stability.recordedStable + " 现算=" + stale.stability.stable);
  /* 7d 没有 samples 数组的行（更早那批形状）= 无从复核 = 不算稳定 */
  t("7d 行内没有 samples 数组 ⇒ 不算稳定（不许把「读不到样本」折成「没问题」）",
    landingStatus(booked, mk({ samples: undefined }))[0].status === "MEASURED-UNSTABLE", "x");
  t("五态里除 CLOSED 都算未结案（MEASURED-UNSTABLE 必须在这把尺上，态数是可归因的决定不是随手加的）",
    LANDING_UNCLOSED.length === 5 && LANDING_UNCLOSED.includes("MEASURED-UNSTABLE") &&
      !LANDING_UNCLOSED.includes("CLOSED"), LANDING_UNCLOSED.join(","));
}
/* 9) 2026-09-30 裁定 (a)：成员来源只许一条规则，而新路线的窄条件必须还能变红。
   病灶（followups-v33.md §11）：某页 ops 行**整页没有 identities 声明**（= 游客腿一行都没被收窄，
   按 r-exec-cli.mjs:161 这些行仍归游客腿认领）时，#67 的"被收窄才算成员"路线给出零成员 ⇒
   预检拦腿，而在册账本却凭跑测证人把那组记成有 4 名成员 ⇒ "booked 却拍不了"。
   裁定 (a) 允许整页游客断言自己当证人；红线是它**只**允许"整页都没声明"：
     9a 整页未声明 + 跑测证人缺席 ⇒ 必须绿，且具名说出这一组靠哪条路线进的账；
     9b 同一页只要**有一行声明了** identities:["guest"]（= 判据台明写这些行归游客执行腿自己判）
        ⇒ 新路线一律不生效 ⇒ 必须照旧 exit 2（第 3 条负例钉的是"整页声明 guest"，这条钉"部分声明"）；
     9c 结构检查：载具只算一次名册（一个 buildPlan），且 measure 的拦门在取租约之前。
   9b 就是那把能变红的尺：把"整页"松成"有任意一行是游客断言"，9b 立刻 exit 0 ⇒ 本条判红。 */
{
  const PAGE = "subpackages/tools/search/index";
  const PAIR = PAGE + " → pages/login/index";
  const buildOps = (dir, declaredGuestIds) => {
    mkdirSync(dir, { recursive: true });
    let pageRows = 0, stripped = 0, declared = 0;
    for (const f of readdirSync(OPS_DIR).filter((x) => x.endsWith(".json"))) {
      const j = JSON.parse(readFileSync(join(OPS_DIR, f), "utf8"));
      for (const c of j.cases || []) {
        if (String(c.page || "").trim() !== PAGE) continue;
        pageRows++;
        delete c.identities; delete c.identitiesFrom; delete c.identitiesWhy; stripped++;
        if (declaredGuestIds.includes(String(c.id))) { c.identities = ["guest"]; c.identitiesFrom = "test-guest-landing.mjs#9b"; declared++; }
      }
      writeFileSync(join(dir, f), JSON.stringify(j));
    }
    return { pageRows, stripped, declared };
  };
  const idsOnPage = new Set();
  for (const f of readdirSync(OPS_DIR).filter((x) => x.endsWith(".json"))) {
    const j = JSON.parse(readFileSync(join(OPS_DIR, f), "utf8"));
    for (const c of j.cases || []) if (String(c.page || "").trim() === PAGE) idsOnPage.add(String(c.id));
  }
  const FIRST_ID = [...idsOnPage].sort()[0];
  const tri = JSON.parse(JSON.stringify(realTriage));
  const keyWasThere = PAIR in tri.landingGroups;
  delete tri.landingGroups[PAIR];
  const pTri = writeJson(resolve(TMP, "less9-triage.json"), tri);
  const a = buildOps(resolve(TMP, "ops9-all-undeclared"), []);
  const b = buildOps(resolve(TMP, "ops9-partial-declared"), [FIRST_ID]);
  t("9 的夹具不空转（这一页在 ops 里有行、在 triage 里本来有这一组；9b 恰好只有 1 行被声明）",
    a.pageRows > 1 && keyWasThere && a.stripped === a.pageRows && b.declared === 1 && b.pageRows === a.pageRows,
    "页行数=" + a.pageRows + " 去标=" + a.stripped + " 9b声明=" + b.declared + " triage 命中=" + keyWasThere);
  /* 9a 整页未声明 ⇒ 新路线生效 */
  const ra = run("entire", ["--policy", POLICY, "--triage", pTri, "--ops", resolve(TMP, "ops9-all-undeclared")]);
  const entLine = lineWith(ra.out, "GUEST_LAND_OPS_ENTIRE_GUEST=");
  t("9a 整页未声明 + 跑测证人缺席 ⇒ 绿（这一组有证人，腿拍得出来）",
    ra.code === 0, "exit=" + ra.code + "\n" + ra.out.slice(0, 400));
  /* 计数不钉死：真语料里 subpackages/setup/recommend-pref/index 本来就整页没声明（那是裁定 (a) 的对象），
     夹具里 tools/search 又被剥成整页没声明 ⇒ 命中面是"这些页的和"。钉的是：读数得是个正数、
     并且**点名到夹具这一页**（说不出页名的读数等于没说）。 */
  const mEnt = /GUEST_LAND_OPS_ENTIRE_GUEST=(\d+) 组 \/ (\d+) 行/.exec(entLine);
  t("9a 具名读数说得出这一组靠哪条路线进的账（组数/行数为正且点名到夹具页）",
    !!mEnt && Number(mEnt[1]) >= 1 && Number(mEnt[2]) >= a.pageRows && entLine.includes(PAGE), entLine);
  {
    const bk = JSON.parse(readFileSync(resolve(TMP, "entire-booked.json"), "utf8"));
    const g = bk.rows.find((x) => x.groupKey === PAIR);
    t("9a 账本把成员来源写成机器可读字段（memberBasis / memberSource.fromOpsEntireGuest / memberBasisEvidence）",
      !!g && g.memberBasis === "ops-entirely-undeclared-guest-assertions" &&
        g.memberSource.fromOpsEntireGuest === a.pageRows && g.memberSource.fromOpsNarrowed === 0 &&
        g.memberBasisEvidence.rowsWithoutIdentityDeclaration === a.pageRows &&
        g.memberBasisEvidence.rowsScopedOutOfGuestLeg === 0,
      JSON.stringify(g && { m: g.memberBasis, s: g.memberSource, e: g.memberBasisEvidence }).slice(0, 300));
    t("9a 证人 = 该页 ops 全部行（没有凭空多、没有少）",
      !!g && [...idsOnPage].sort().join(",") === [...g.caseIds].sort().join(","),
      "账本=" + (g ? g.caseIds.join(",") : "(无)") + " 该页 ops=" + [...idsOnPage].join(","));
    const polKeys2 = new Set(polObj.rows.map((x) => x.page + " → " + x.landing));
    const gotKeys2 = new Set(bk.rows.map((x) => x.groupKey));
    t("9a 落地对集合不因新规则而变（既不许多也不许丢：与 policy 逐组相等，且 28 组都在）",
      gotKeys2.size === polKeys2.size && [...polKeys2].every((k) => gotKeys2.has(k)),
      "账本组=" + gotKeys2.size + " policy 组=" + polKeys2.size);
  }
  /* 9b 部分声明（有一行明写 guest）⇒ 新规则不得生效，必须照旧拦腿 */
  const rb = run("partial", ["--policy", POLICY, "--triage", pTri, "--ops", resolve(TMP, "ops9-partial-declared")]);
  t("9b 整页里只要有一行声明了 guest ⇒ 新路线不生效：跑测证人也缺席时仍 exit 2（不许被新规则悄悄放行）",
    rb.code === 2 && /一名成员都没有/.test(rb.out) && /这一组没有任何证人/.test(rb.out) && rb.out.includes(PAIR),
    "exit=" + rb.code + "\n" + rb.out.slice(0, 500));
  t("9b 读数不点名夹具页（整页未声明的计数里没有这一页 ⇒ 有一行声明了 guest 就不许走新路线）",
    (() => { const l = lineWith(rb.out, "GUEST_LAND_OPS_ENTIRE_GUEST="); return /GUEST_LAND_OPS_ENTIRE_GUEST=\d+ 组/.test(l) && !l.includes(PAGE); })(),
    lineWith(rb.out, "GUEST_LAND_OPS_ENTIRE_GUEST="));
  {
    const bk = JSON.parse(readFileSync(resolve(TMP, "partial-booked.json"), "utf8"));
    t("9b 拍不了的组不许进账本（booked 里不得出现这一组 ⇒ 不存在「booked 却拒拍」）",
      !bk.rows.some((x) => x.groupKey === PAIR),
      "账本组=" + bk.rows.length + " 含这一组=" + bk.rows.some((x) => x.groupKey === PAIR));
  }
  /* 9c 结构：名册只算一次；measure 的拦门在拿租约之前（本文件全程离线，绝不真去跑 measure） */
  {
    const src = readFileSync(SCRIPT, "utf8");
    const calls = (src.match(/=\s*buildPlan\(\)/g) || []).length;
    const iProb = src.indexOf('if (problems.length) { console.log("GUEST_LANDING=FAIL');
    const iAcq = src.indexOf("acquireUi({");
    t("9c 名册只有一个来源（buildPlan() 只被调用一次 ⇒ book 与 measure 共用同一份成员账）",
      calls === 1, "buildPlan() 调用次数=" + calls);
    t("9c measure 的带病拦门排在 acquireUi 之前（预检不过时结构上拿不到租约）",
      iProb > 0 && iAcq > iProb, "problems 检查@" + iProb + " acquireUi@" + iAcq);
  }
}
/* 10) 真数据的成员账：每组都必须有 ops 派生的证人，且新路线的命中面必须恒为"整页未声明"那一类
   （这一条钉的是"改动面"：现在实测 policy 28 页里恰好 1 页走新路线、27 页走 #67 老路线。
     别的页一旦开始整页掉 identities 声明，这里会先变红，而不是悄悄多发几条 GG-* 腿。） */
{
  const triageArg = existsSync(TRIAGE2) ? TRIAGE + "," + TRIAGE2 : TRIAGE;
  const r = run("real-memb", ["--policy", POLICY, "--triage", triageArg]);
  const bk = JSON.parse(readFileSync(resolve(TMP, "real-memb-booked.json"), "utf8"));
  const kinds = {};
  for (const x of bk.rows) kinds[x.memberBasis || "(缺字段)"] = (kinds[x.memberBasis || "(缺字段)"] || 0) + 1;
  t("10 真数据：每一组都有 ops 证人（fromOps>0 ⇒ 成员不再随 --triage 喂哪份切片而消失）",
    r.code === 0 && bk.rows.length === polObj.rows.length && bk.rows.every((x) => x.memberSource.fromOps > 0),
    "exit=" + r.code + " 组=" + bk.rows.length + " policy=" + polObj.rows.length +
      " 没有 ops 证人的组=" + bk.rows.filter((x) => !x.memberSource.fromOps).map((x) => x.page).join(","));
  t("10 真数据：新路线命中面 == 整页未声明的那一类页（分布可核，不是一句「都好了」）",
    (kinds["ops-entirely-undeclared-guest-assertions"] || 0) === 1 &&
      (kinds["ops-narrowed-out-of-guest-leg"] || 0) === polObj.rows.length - 1,
    JSON.stringify(kinds));
  t("10 真数据：booked 的落地对集合 == measured 的落地对集合（在册账本与实测腿同一批组）",
    existsSync(resolve(REPO, "reports/audit/round-7/guest-landing-measured.json")) &&
      (() => {
        const mm = JSON.parse(readFileSync(resolve(REPO, "reports/audit/round-7/guest-landing-measured.json"), "utf8"));
        const ks = new Set(mm.rows.map((x) => x.groupKey));
        return ks.size === bk.rows.length && bk.rows.every((x) => ks.has(x.groupKey));
      })(),
    "measured 组=" + (existsSync(resolve(REPO, "reports/audit/round-7/guest-landing-measured.json"))
      ? JSON.parse(readFileSync(resolve(REPO, "reports/audit/round-7/guest-landing-measured.json"), "utf8")).rows.length : "(读不到)") +
      " booked 组=" + bk.rows.length);
}

/* 11) 依据写成裸文字（没有 anchors）必须红：那是一条谁都没复核过的「理由」
   （原编号 8；9/10 是 2026-09-30 裁定 (a) 新增的两块，为了不重排既有编号把它挪到最后，判据一字未改。） */
{
  const pol = JSON.parse(realPolicy);
  delete pol.anchors;
  const r = run("noanchor", ["--policy", writeJson(resolve(TMP, "noanchor-policy.json"), pol), "--triage", resolve(REPO, ".zcode/tmp/triage-r7-guest.json")]);
  t("无 anchors ⇒ 红", r.code === 2 && /anchors 字段/.test(r.out), "exit=" + r.code + "\n" + r.out.slice(0, 260));
}
console.log(`\nSUMMARY: checks=${checks} assertion failures = ${fail}`);
console.log(fail ? "GL_TEST=FAIL" : "GL_TEST=PASS");
process.exit(fail ? 1 : 0);
