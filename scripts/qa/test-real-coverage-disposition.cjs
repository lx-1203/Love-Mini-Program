#!/usr/bin/env node
/**
 * test-real-coverage-disposition.cjs —— 去向册核对门的双向负例（L19 车道，2026-09-30）。
 *
 * 为什么要有这份文件（缺口实测）：`verify-real-coverage` 那 10 条欠账的去向只有散文
 * （reports/audit/round-7/uncovered10-disposition-r14.md §3 汇总表），仓里**没有任何工具消费它**
 * （grep NEEDS_CAPABILITY|NEEDS_BAND_CHANGE|NEEDS_IDENTITY_IMPOSSIBLE|DISPATCHABLE_NOW 在 scripts/ = 0 个文件），
 * 也没有任何门在核「条条有去向」⇒ 下一轮丢一条去向不会有任何东西变红。
 * 载体 scripts/qa/emit-real-coverage-disposition.mjs + 核对门 scripts/qa/verify-real-coverage-disposition.mjs
 * 补的就是这一格。本文件钉住它们**能红**——一条不会红的门等于没有门。
 *
 * 全程离线：门的读数用 --gate-out 喂一份固定样本（不依赖盘上 exec-* 目录，避开并发车道的 torn read）；
 * 册子与判决表写在 os.tmpdir()；仓内 tmp/ 只放变异体，跑完即删并复核不存在。
 * 判据本体 scripts/qa/verify-real-coverage.mjs 一个字节都不改、不写。
 *
 * 聚合器接线：文件名匹配 scripts/qa/run-qa-selftests.mjs:25 的 ^test-.+\.(cjs|mjs)$ ⇒ 自动收件。
 * 输出纪律：被抓出来的子进程输出一律经 san() 把 `RESULT=` / `_TEST=` 改成 `RESULT≡`，
 * 否则聚合器 :52 的 selfVerdict 正则会先咬到子进程那行 RCD_RESULT=FAIL，把绿测试读成红。
 *
 * 用法：node scripts/qa/test-real-coverage-disposition.cjs
 *      RCD_VERIFIER_UNDER_TEST 只供人工复现时指定被测体；默认永远是仓里那一份。
 */
const { spawnSync } = require("node:child_process");
const { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const os = require("node:os");

const REPO = resolve(__dirname, "..", "..");
const VERIFIER = resolve(__dirname, "verify-real-coverage-disposition.mjs");
const CARRIER = resolve(__dirname, "emit-real-coverage-disposition.mjs");
const UNDER_TEST = process.env.RCD_VERIFIER_UNDER_TEST ? resolve(process.env.RCD_VERIFIER_UNDER_TEST) : VERIFIER;
const T = join(os.tmpdir(), "qoder-l19-real-cov-disposition");
const MUTDIR = resolve(REPO, "tmp", "l19-rcd-mutant");

let total = 0, fails = 0;
const notes = [];
function t(name, cond, detail) {
  total++;
  if (cond) return true;
  fails++;
  console.log("  FAIL " + name + (detail ? "  <<" + detail + ">>" : ""));
  return true;
}
/* 子进程判据行不许混进本文件的判据行（见文件头「输出纪律」）。 */
const san = (s) => String(s).replace(/\b([A-Z]{2,10}_(?:TEST|RESULT))=/g, "$1≡");
const lineWith = (out, re) => (String(out).split(/\r?\n/).find((l) => re.test(l)) || "(没有这一行)");
const run = (script, args) => {
  const r = spawnSync(process.execPath, [script].concat(args), { cwd: REPO, encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
  return { rc: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
};

/* ---------------- 固定样本：门自己的 stdout（两条欠账；形状逐字抄自真实读数） ---------------- */
const GATE_OUT = [
  "REALCOV_CASES=236 EXEC_ROWS=15363 结果目录=reports/audit/round-7",
  "REALCOV_NEVER_ON_REAL=0 REAL_BAND_BUT_ALL_SKIPPED=2 JUDGED_MISSING_A=2 JUDGED_MISSING_GUEST=1",
  "REALCOV_AUTOMATABLE_EXEMPT=28（其中 real 档有行但全被 SKIPPED=13）来源=ops 用例声明字段 c.automatable===false",
  "REALCOV_COVERED=198",
  "REALCOV_UNCOVERED=2／236（阈值同旧：非免检欠账 =0 才绿）",
  "REALCOV_UNCOVERED_LIST=2（逐条点名，排序=suite→id；轴词表 never-on-real|login|guest，两轴同缺写 login+guest）",
  "  UNCOVERED 轴口径 never-on-real=real 档一行都没有；login=登录轴 A/B 无判过的行；guest=游客轴无判过的行",
  "  UNCOVERED PAGES-PROFILE-INDEX|PFI25 缺=login",
  "  UNCOVERED 次要20|OT06 缺=login+guest",
  "REALCOV_CONSERVATION=OK 免检=28 + 覆盖=198 + 欠账=2 = 236／236",
  "REALCOV_UNCOVERED_LEDGER=OK 点名=2 欠账=2 判据外=0",
  "REALCOV_RESULT=FAIL（真实模式覆盖守恒：跳过不算量到，单身份不算双身份）",
].join("\n") + "\n";

const K1 = "PAGES-PROFILE-INDEX|PFI25";
const K2 = "次要20|OT06";
const K3 = "次要22|VB03";
const VOCAB = ["NEEDS_CAPABILITY", "NEEDS_BAND_CHANGE", "NEEDS_IDENTITY_IMPOSSIBLE", "DISPATCHABLE_NOW", "NOT_SHOOTABLE"];
const provOf = (extra) => Object.assign({
  generatedAt: "2026-09-30T04:00:00.000Z", gitSha: "deadbeef",
  gateCmd: "scripts/qa/verify-real-coverage.mjs --round round-7", gateExit: 1,
  rulingsFile: "reports/audit/round-7/uncovered10-disposition-r14.md",
}, extra || {});
const entry = (key, word, extra) => Object.assign({
  case: key, disposition: word, qualifier: "", axesAtRuling: key === K2 ? "login+guest" : "login",
  axesAtEmit: key === K2 ? "login+guest" : "login",
  blocker: "具名的挡路原语（离线样例）", cost: "1 项能力；到位后 1 腿 ≈ 20 s（离线样例）", stillUncovered: true,
  basis: "离线样例判决表第 N 行（不引盘上文件）",
}, extra || {});
const regOf = (dispositions, extra) => Object.assign({
  kind: "real-coverage-disposition", note: "离线夹具", vocab: VOCAB,
  polarity: { undisposedDebt: "blocking", offVocabWord: "blocking", hollowEntry: "blocking", staleDisposition: "advisory" },
  gateReading: { cases: 236, uncovered: 2, covered: 198, exempt: 28, neverOnReal: 0, realBandButAllSkipped: 2, listed: 2, result: "FAIL" },
  provenance: provOf(), dispositions,
}, extra || {});

rmSync(T, { recursive: true, force: true });
mkdirSync(T, { recursive: true });
const GATE = join(T, "gate-live.txt");
writeFileSync(GATE, GATE_OUT, "utf8");

let regSeq = 0;
function check(registerJson, extraArgs) {
  const rp = join(T, "reg-" + (++regSeq) + ".json");
  writeFileSync(rp, typeof registerJson === "string" ? registerJson : JSON.stringify(registerJson, null, 1) + "\n", "utf8");
  return { path: rp, res: run(UNDER_TEST, ["--register", rp, "--gate-out", GATE].concat(extraArgs || [])) };
}

/* ================= 1. 阴性对照：条条有去向 ⇒ 必须绿，且绿里要说清「没减上游的红」 ================= */
{
  const { res: r } = check(regOf([entry(K1, "NEEDS_CAPABILITY"), entry(K2, "NEEDS_CAPABILITY")]));
  t("阴性对照 完整去向 ⇒ exit 0", r.rc === 0, "rc=" + r.rc + " " + san(lineWith(r.out, /RCD_RESULT=/)).slice(0, 180));
  t("阴性对照 判绿行确实印了 RCD_RESULT=PASS", /RCD_RESULT=PASS/.test(r.out), san(lineWith(r.out, /RCD_RESULT=/)));
  const chk = lineWith(r.out, /^RCD_CHECK /);
  t("阴性对照 对账读数：欠账=2 有去向=2 无去向=0 册外词=0 空条目=0", /门欠账=2 有去向=2 无去向=0 册外词=0 空条目=0/.test(chk), san(chk));
  const nr = lineWith(r.out, /^RCD_NO_REDUCTION /);
  t("不减红承诺印进机器行（且数值就是门那一个数）", /REALCOV_UNCOVERED 仍=2/.test(nr), san(nr));
  t("绿的时候仍如实带出上游 FAIL 读数（两本账不合并不折抵）",
    /SOURCE=captured-file/.test(lineWith(r.out, /^RCD_GATE /)) && /RESULT=FAIL exit=\(取样\)/.test(r.out) && /UNCOVERED=2/.test(r.out),
    san(lineWith(r.out, /^RCD_GATE /)).slice(0, 200));
}

/* ================= 2. 阳性对照 A：一条欠账没有去向 ⇒ 必须红（本门的主案） ================= */
{
  const { res: r } = check(regOf([entry(K1, "NEEDS_CAPABILITY")]));
  t("阳性A 少一条去向 ⇒ exit 1", r.rc === 1, "rc=" + r.rc);
  t("阳性A 判红行点名「无去向欠账 1 条」", /RCD_RESULT=FAIL（无去向欠账 1 条）/.test(r.out), san(lineWith(r.out, /RCD_RESULT=/)));
  t("阳性A 逐条点名是哪一条（含它的轴）", new RegExp("UNDISPOSED " + K2.replace(/\|/g, "\\|") + " 缺=login\\+guest").test(r.out), san(lineWith(r.out, /UNDISPOSED/)));
  t("阳性A 守恒仍成立（有去向1 + 无去向1 = 2 ⇒ 出事的是「没记」不是「没数」）",
    /门欠账=2 有去向=1 无去向=1.*守恒=OK/.test(lineWith(r.out, /^RCD_CHECK /)), san(lineWith(r.out, /^RCD_CHECK /)));
}

/* ================= 3. 阳性对照 B：去向词不在册内词表 ⇒ 必须红 ================= */
{
  const { res: r } = check(regOf([entry(K1, "NEEDS_SUNLIGHT"), entry(K2, "NEEDS_CAPABILITY")]));
  t("阳性B 册外词 ⇒ exit 1", r.rc === 1, "rc=" + r.rc);
  t("阳性B 判红行列出「册外去向词 1 条」", /册外去向词 1 条/.test(lineWith(r.out, /RCD_RESULT=/)), san(lineWith(r.out, /RCD_RESULT=/)));
  t("阳性B 点出那个词本身", /BAD_WORD .*NEEDS_SUNLIGHT/.test(r.out), san(lineWith(r.out, /BAD_WORD/)));
  t("阳性B 册外词同时算成无去向（不许用生造词冒充有账）",
    /门欠账=2 有去向=1 无去向=1/.test(lineWith(r.out, /^RCD_CHECK /)), san(lineWith(r.out, /^RCD_CHECK /)));
  const { res: r2 } = check(regOf([entry(K1, "NEEDS_SUNLIGHT"), entry(K2, "NEEDS_CAPABILITY")], { vocab: ["NEEDS_SUNLIGHT", "NEEDS_CAPABILITY"] }));
  t("阳性B′ 册子自带一套词表也覆盖不了本门词表（仍判红 + 点出漂移）", r2.rc === 1 && /VOCAB_DRIFT/.test(r2.out), "rc=" + r2.rc + " " + san(lineWith(r2.out, /VOCAB_DRIFT/)));
}

/* ================= 4. 阳性对照 C：空条目（只有键没有去向／没有出处）⇒ 必须红 ================= */
{
  const { res: r } = check(regOf([Object.assign(entry(K1, "NEEDS_CAPABILITY"), { disposition: "  " }), entry(K2, "NEEDS_CAPABILITY")]));
  t("阳性C 空 disposition ⇒ exit 1", r.rc === 1, "rc=" + r.rc);
  t("阳性C 报 HOLLOW 并指名缺哪个字段", /HOLLOW .*缺 disposition/.test(r.out), san(lineWith(r.out, /HOLLOW/)));
  const { res: r2 } = check(regOf([Object.assign(entry(K1, "NEEDS_CAPABILITY"), { basis: "" }), entry(K2, "NEEDS_CAPABILITY")]));
  t("阳性C′ 没有出处（basis）也算空条目 ⇒ exit 1", r2.rc === 1 && /HOLLOW .*缺 basis/.test(r2.out), "rc=" + r2.rc + " " + san(lineWith(r2.out, /HOLLOW/)));
}

/* ================= 5. 阳性对照 D：缺 provenance ⇒ 必须红（不知道哪来的册子不能当账） ================= */
{
  const { res: r } = check(regOf([entry(K1, "NEEDS_CAPABILITY"), entry(K2, "NEEDS_CAPABILITY")], { provenance: { gitSha: "abc1234" } }));
  t("阳性D provenance 缺 generatedAt/gateCmd/rulingsFile ⇒ exit 1", r.rc === 1, "rc=" + r.rc);
  const n = (r.out.match(/NO_PROVENANCE/g) || []).length;
  t("阳性D 缺几项就点几条（这里应恰为 3）", n === 3, "NO_PROVENANCE 行=" + n);
}

/* ================= 6. 陈旧去向的极性：必须 advisory（点名不判红）且极性印进机器行 ================= */
{
  const { res: r } = check(regOf([entry(K1, "NEEDS_CAPABILITY"), entry(K2, "NEEDS_CAPABILITY"),
    entry(K3, "NEEDS_BAND_CHANGE", { axesAtEmit: null, stillUncovered: false })]));
  t("陈旧去向 ⇒ 不判红（exit 0；收账不是出事）", r.rc === 0, "rc=" + r.rc + " " + san(lineWith(r.out, /RCD_RESULT=/)));
  t("陈旧被逐条点名 + 计数", /STALE 次要22\|VB03/.test(r.out) && /陈旧=1/.test(lineWith(r.out, /^RCD_CHECK /)), san(lineWith(r.out, /STALE/)));
  const pol = lineWith(r.out, /^RCD_STALE_POLICY=/);
  t("极性与理由显式印进机器行（advisory，不许两可）", /^RCD_STALE_POLICY=advisory（.+理由/s.test(pol), san(pol).slice(0, 140));
  const { res: r2 } = check(regOf([entry(K1, "NEEDS_CAPABILITY"), entry(K2, "NEEDS_CAPABILITY"), entry(K3, "NEEDS_BAND_CHANGE")],
    { polarity: { undisposedDebt: "blocking", offVocabWord: "blocking", hollowEntry: "blocking", staleDisposition: "blocking" } }));
  t("册子把 stale 自己声明成 blocking 也改不动本门极性（判定权威在门里）", r2.rc === 0 && /^RCD_STALE_POLICY=advisory/.test(lineWith(r2.out, /^RCD_STALE_POLICY=/)), "rc=" + r2.rc);
}

/* ================= 7. 前置件失败：没记过 / 读不出 / 上游不可用 ⇒ 一律 exit 2，不许判绿 ================= */
{
  const r = run(UNDER_TEST, ["--register", join(T, "no-such-register.json"), "--gate-out", GATE]);
  t("册子不存在 ⇒ exit 2 且明说「别把没记过读成没有欠账」", r.rc === 2 && /别把"没记过"读成"没有欠账"/.test(r.out), "rc=" + r.rc + " " + san(lineWith(r.out, /RCD_RESULT=/)).slice(0, 160));
  writeFileSync(join(T, "broken.json"), "{ this is not json", "utf8");
  const r2 = run(UNDER_TEST, ["--register", join(T, "broken.json"), "--gate-out", GATE]);
  t("册子读不出 JSON ⇒ exit 2", r2.rc === 2, "rc=" + r2.rc);
  writeFileSync(join(T, "gate-noise.txt"), "some unrelated output\n", "utf8");
  const r3 = run(UNDER_TEST, ["--register", join(T, "broken.json"), "--gate-out", join(T, "gate-noise.txt")]);
  t("上游门输出里没有 REALCOV_UNCOVERED ⇒ exit 2（上游不可用时本门无权判绿）", r3.rc === 2 && /跑不出来|少字段/.test(r3.out), "rc=" + r3.rc + " " + san(lineWith(r3.out, /RCD_RESULT=/)).slice(0, 160));
  const r4 = run(UNDER_TEST, ["--gate-out", join(T, "no-such-gate-sample.txt")]);
  t("--gate-out 指到不存在的样本 ⇒ exit 2", r4.rc === 2, "rc=" + r4.rc);
  writeFileSync(join(T, "gate-partial.txt"), "REALCOV_CASES=236 REALCOV_UNCOVERED=2\n", "utf8");
  const r5 = run(UNDER_TEST, ["--register", join(T, "broken.json"), "--gate-out", join(T, "gate-partial.txt")]);
  t("上游机器行少字段 ⇒ exit 2 并列出少了哪几个", r5.rc === 2 && /少字段/.test(r5.out), "rc=" + r5.rc + " " + san(lineWith(r5.out, /RCD_RESULT=/)).slice(0, 160));
}

/* ================= 8. 未知旗标必须响（拼错旗标 = 静默少读一路输入 = 假绿） ================= */
{
  const r = run(UNDER_TEST, ["--regsiter", "x.json"]);
  t("旗标拼错 ⇒ exit 2 并点名未知旗标", r.rc === 2 && /未知旗标/.test(r.out), "rc=" + r.rc + " " + san(lineWith(r.out, /RCD_RESULT=/)).slice(0, 140));
}

/* ================= 9. 载具：默认干跑 / --apply 才写 / 幂等 / 备份先于覆写 / 不合规则一条不改 ================= */
const RULINGS_OK = [
  "## 3. 汇总表（去向 + 闭合成本）",
  "",
  "| # | 行 | 门的轴 | 去向 | 挡路的东西（具名） | 闭合成本 |",
  "|---|---|---|---|---|---|",
  "| 1 | `PAGES-PROFILE-INDEX\\|PFI25` | login | `NEEDS_CAPABILITY` | nativeModal 驱动原语 | 1 项能力；到位后 1 腿 ≈ 20 s |",
  "| 2 | `次要20\\|OT06` | **login+guest** | `NEEDS_CAPABILITY` | 逐例 userId + WS 组件子树 | 2 条腿 ≈ 40 s |",
  "",
].join("\n") + "\n";
const RP = join(T, "rulings-ok.md");
writeFileSync(RP, RULINGS_OK, "utf8");
const OUTJSON = join(T, "reg-carrier-out.json");
const CARGS = ["--gate-out", GATE, "--rulings", RP, "--out", OUTJSON];
{
  rmSync(OUTJSON, { force: true });
  const dry = run(CARRIER, CARGS);
  t("载具 默认干跑 ⇒ exit 0 且不写盘", dry.rc === 0 && !existsSync(OUTJSON), "rc=" + dry.rc + " 文件存在=" + existsSync(OUTJSON));
  t("载具 干跑印出拟写内容与「加 --apply 才落盘」", /RCDEMIT_RESULT=DRY 拟写 2 条/.test(dry.out) && /加 --apply 才落盘/.test(dry.out), san(lineWith(dry.out, /RCDEMIT_RESULT=/)));
  t("载具 去向计数与判决表逐字对齐（NEEDS_CAPABILITY=2 其余 0）",
    /RCDEMIT_TALLY NEEDS_CAPABILITY=2 NEEDS_BAND_CHANGE=0 NEEDS_IDENTITY_IMPOSSIBLE=0 DISPATCHABLE_NOW=0 NOT_SHOOTABLE=0/.test(dry.out),
    san(lineWith(dry.out, /RCDEMIT_TALLY/)));
  t("载具 复合 id 逐字保留（不自己拆键，轴也带上）",
    new RegExp("RCDEMIT_DRY " + K2 + " 去向=NEEDS_CAPABILITY 轴=login\\+guest").test(dry.out), san(lineWith(dry.out, /RCDEMIT_DRY 次要20/)));

  const ap = run(CARRIER, CARGS.concat(["--apply"]));
  t("载具 --apply ⇒ exit 0 且落盘", ap.rc === 0 && existsSync(OUTJSON), "rc=" + ap.rc);
  t("载具 首次落盘如实报备份 none（首次落盘）", /RCDEMIT_BACKUP=none（首次落盘）/.test(ap.out), san(lineWith(ap.out, /RCDEMIT_BACKUP=/)));
  const written = existsSync(OUTJSON) ? readFileSync(OUTJSON, "utf8") : "";
  t("载具 产物带 provenance 三件套（HEAD / 来源门命令行 / generatedAt）",
    /"gitSha": /.test(written) && /"gateCmd": "scripts\/qa\/verify-real-coverage\.mjs --round round-7"/.test(written) && /"generatedAt": "2\d{3}-/.test(written),
    written.slice(0, 160).replace(/\n/g, " ⏎ "));
  t("载具 产物把自己也写进出处（emittedBy），并带门的 stdout 指纹",
    /"emittedBy": "scripts\/qa\/emit-real-coverage-disposition\.mjs"/.test(written) && /"gateStdoutSha256": "[0-9a-f]{64}"/.test(written), "(缺 emittedBy 或 gateStdoutSha256)");
  t("载具 落盘的键就是门印出来的复合 id（逐字）", written.includes(K2) && written.includes(K1), "(键被改写)");

  const again = run(CARRIER, CARGS.concat(["--apply"]));
  t("载具 幂等复跑不覆写（RCDEMIT_NOCHANGE）", /RCDEMIT_NOCHANGE=/.test(again.out) && again.rc === 0, san(lineWith(again.out, /RCDEMIT_NOCHANGE=|RCDEMIT_RESULT=/)));
  t("载具 幂等复跑不制造备份（不刷时间戳假装有新账）",
    !/RCDEMIT_BACKUP=(?!none)/.test(again.out) && readdirSync(T).filter((f) => f.includes("pre-real-cov-disposition")).length === 0,
    "备份数=" + readdirSync(T).filter((f) => f.includes("pre-real-cov-disposition")).length);

  /* 内容真的变了 ⇒ 必须先备份再覆写，且备份逐字节等于旧件（丢基线事故的补法，同 verify-ops-corpus-stamp.mjs:427-435） */
  writeFileSync(RP, RULINGS_OK.replace("`NEEDS_CAPABILITY` | nativeModal", "`NEEDS_BAND_CHANGE` | nativeModal"), "utf8");
  const changed = run(CARRIER, CARGS.concat(["--apply"]));
  const baks = readdirSync(T).filter((f) => f.includes("pre-real-cov-disposition"));
  t("载具 内容变更 ⇒ 留下恰好 1 个备份", changed.rc === 0 && baks.length === 1, "备份=" + baks.join(",") + " rc=" + changed.rc);
  t("载具 备份内容逐字节等于覆写前的那一份", baks.length === 1 && readFileSync(join(T, baks[0]), "utf8") === written, "(备份与旧件不同或没有备份)");
  t("载具 覆写后现件已经不是旧件", existsSync(OUTJSON) && readFileSync(OUTJSON, "utf8") !== written, "(没写进去)");
  const printed = lineWith(changed.out, /RCDEMIT_BACKUP=/).slice("RCDEMIT_BACKUP=".length).split(/[/\\]/).pop();
  t("载具 打印的备份路径就是盘上那一个", printed === baks[0], "printed=" + printed + " 盘上=" + (baks[0] || "无"));

  const before = readFileSync(OUTJSON, "utf8");
  writeFileSync(join(T, "rulings-badword.md"), RULINGS_OK.replace("NEEDS_CAPABILITY", "NEEDS_SUNLIGHT"), "utf8");
  const bad = run(CARRIER, ["--gate-out", GATE, "--rulings", join(T, "rulings-badword.md"), "--out", OUTJSON, "--apply"]);
  t("载具 册外词 ⇒ exit 1 且册子一个字都不改", bad.rc === 1 && readFileSync(OUTJSON, "utf8") === before && /REFUSE .*不在册内词表/.test(bad.out),
    "rc=" + bad.rc + " " + san(lineWith(bad.out, /RCDEMIT_RESULT=/)));
  writeFileSync(join(T, "rulings-empty.md"), "# 没有汇总表\n\n| 别的 | 表 |\n|---|---|\n| a | b |\n", "utf8");
  const empty = run(CARRIER, ["--gate-out", GATE, "--rulings", join(T, "rulings-empty.md"), "--out", join(T, "never.json")]);
  t("载具 解析出 0 行 ⇒ exit 2（宁可停手也不手抄名单）", empty.rc === 2 && /一行都没解析出来/.test(empty.out), "rc=" + empty.rc);
  t("载具 0 行时不写任何件", !existsSync(join(T, "never.json")), "写了");
}

/* ================= 10. 端到端：载具产的册子喂核对门（不是影子实现） ================= */
{
  const r = run(UNDER_TEST, ["--register", OUTJSON, "--gate-out", GATE]);
  t("端到端：载具产的册子（去向已被改成 NEEDS_BAND_CHANGE）喂核对门 ⇒ 判绿",
    r.rc === 0 && /门欠账=2 有去向=2 无去向=0/.test(lineWith(r.out, /^RCD_CHECK /)),
    "rc=" + r.rc + " " + san(lineWith(r.out, /^RCD_CHECK |RCD_RESULT=/)).slice(0, 220));
  const r2 = run(UNDER_TEST, ["--register", join(T, "still-never.json"), "--gate-out", GATE]);
  t("端到端反查：载具拒绝写的件确实没被凭空补上（册子仍不存在 ⇒ exit 2 不判绿）", r2.rc === 2 && !existsSync(join(T, "still-never.json")), "rc=" + r2.rc);
}

/* ================= 11. 现跑通路的接线自证（不断言判决，只断言真能现跑那条门） ================= */
{
  const r = run(UNDER_TEST, []);
  t("默认现跑：印出 SOURCE=live 与上游命令行（不吃夹具的那条路也接得上）",
    /SOURCE=live CMD="scripts\/qa\/verify-real-coverage\.mjs --round round-7"/.test(lineWith(r.out, /^RCD_GATE /)),
    san(lineWith(r.out, /^RCD_GATE /)).slice(0, 200));
  t("默认现跑：一定给出读数行，退出码只可能是 0/1/2（没有静默 3+ 或空输出）",
    [0, 1, 2].includes(r.rc) && /^RCD_/m.test(r.out), "rc=" + r.rc + " 行数=" + (r.out.match(/^RCD_/gm) || []).length);
  notes.push("现跑那一发的【判决】不在本文件断言范围内：盘上 exec-* 目录是并发车道在写的读物，钉死判决会造出不可归因的假红（本轮已实测过这类污染）。");
}

/* ================= 12. 变异证明：拆掉「无去向」这一项判定 ⇒ 同一套 battery 必须漏抓 ================= */
{
  rmSync(MUTDIR, { recursive: true, force: true });
  mkdirSync(MUTDIR, { recursive: true });
  const src = readFileSync(VERIFIER, "utf8");
  const mutPath = join(MUTDIR, "verify-real-coverage-disposition.mut.mjs");
  const mutated = src.replace("const blocking = undisposed.length ||", "const blocking = 0 && undisposed.length ||");
  let mutantWritten = false;
  if (mutated !== src) { writeFileSync(mutPath, mutated, "utf8"); mutantWritten = existsSync(mutPath) && readFileSync(mutPath, "utf8") !== src; }
  t("变异体真的落到盘上且与活体不同（否则这一节是空转）", mutantWritten, "mutantWritten=" + mutantWritten);
  const battery = [
    { n: "少一条去向", reg: regOf([entry(K1, "NEEDS_CAPABILITY")]) },
    { n: "册外词", reg: regOf([entry(K1, "NEEDS_SUNLIGHT"), entry(K2, "NEEDS_CAPABILITY")]) },
    { n: "空 disposition", reg: regOf([Object.assign(entry(K1, "NEEDS_CAPABILITY"), { disposition: "" }), entry(K2, "NEEDS_CAPABILITY")]) },
    { n: "缺 provenance", reg: regOf([entry(K1, "NEEDS_CAPABILITY"), entry(K2, "NEEDS_CAPABILITY")], { provenance: { gitSha: "a" } }) },
  ];
  let liveBad = 0, mutBad = 0;
  for (const c of battery) {
    const rp = join(T, "mut-reg-" + (++regSeq) + ".json");
    writeFileSync(rp, JSON.stringify(c.reg, null, 1) + "\n", "utf8");
    const a = run(UNDER_TEST, ["--register", rp, "--gate-out", GATE]);
    const b = run(mutPath, ["--register", rp, "--gate-out", GATE]);
    if (a.rc !== 1) { liveBad++; console.log("  变异对照 " + c.n + " 活体没判红 rc=" + a.rc); }
    if (b.rc !== 1) mutBad++;
    notes.push(`变异对照 ${c.n}：活体 rc=${a.rc} 变异体 rc=${b.rc}（破损件应 rc=1）`);
  }
  console.log(`RCDTEST_NEGATIVE_PROOF live_bad=${liveBad} mutant_bad=${mutBad}（放宽「无去向判红」那一项后，变异体必须至少放走一条）`);
  t("活体：四类破损全部判红", liveBad === 0, "漏=" + liveBad);
  t("变异体比活体多漏 ⇒ 证明这些断言真在受力、不是摆设", mutantWritten && mutBad > liveBad, `live_bad=${liveBad} mutant_bad=${mutBad}`);
  try { rmSync(MUTDIR, { recursive: true, force: true }); } catch (e) { console.log("MUT_CLEANUP_ERR " + e.message); }
  t("收尾：变异体不留盘", !existsSync(MUTDIR) && !existsSync(mutPath), "还在盘上=" + existsSync(MUTDIR) + "/" + existsSync(mutPath));
  t("收尾：仓里那份核对门字节未变（活文件全程未被改动）", readFileSync(VERIFIER, "utf8") === src, "(活文件被改过)");
}

/* ================= 13. 本仓那条「不许把红读小」的反例：不许有人往词表里加销账词 ================= */
{
  for (const w of ["DONE", "CLOSED", "RESOLVED", "EXEMPT", "COVERED"]) {
    const { res: r } = check(regOf([entry(K1, w), entry(K2, "NEEDS_CAPABILITY")]));
    t("销账类词「" + w + "」在册外 ⇒ 判红（词表里没有销账通道 ⇒ 分流关不掉红）", r.rc === 1 && /BAD_WORD/.test(r.out), "rc=" + r.rc);
  }
}

for (const n of notes) console.log("  NOTE " + n);
console.log(`RCDTEST_COVERAGE 断言=${total} 失败=${fails} 被测体=${UNDER_TEST === VERIFIER ? "仓里那份核对门（默认）" : "外部指定 " + UNDER_TEST} 夹具=${T}`);
console.log(`assertion failures = ${fails}`);
console.log(fails ? "RCDTEST_TEST=FAIL" : "RCDTEST_TEST=PASS");
try { rmSync(T, { recursive: true, force: true }); } catch (e) { console.log("FIXTURE_CLEANUP_ERR " + e.message); }
process.exit(fails ? 1 : 0);
