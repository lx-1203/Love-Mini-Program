#!/usr/bin/env node
/* LG31 非帧载体的自检（车道 r10b，判据台 round-7/ops/PAGES-LOGIN-INDEX.json#LG31）。
 *
 * 为什么单开一个而不是并进 test-source-shape-absence.mjs：
 *   那 7 条 A 类行的判点是「某物不存在」，本条的判点是「某物不存在 ＋ 长度校验这一事实仍在盘上」，
 *   后者要同时钉正反两半（缺席的 #login-sms-code 与六位谓词），负例形状也不同：
 *   本条最有价值的负例是"照判据字面把被 015 删掉的验证码框补回来"——那正是裁定禁止的动作，
 *   载体必须能把它读成红。
 * 三条纪律（沿用 test-source-shape-absence.mjs 的口径，一条都不松）：
 *   1. 判据正文不许动 ⇒ 只读 reports/audit/round-7/ops/**，一个字节都不写；
 *      ops 行少了/换了形状/载体指的 caseId 不对 ⇒ 判红。
 *   2. 变异只在 os.tmpdir()（不是仓内 .zcode/tmp）⇒ 每条负例都把注入后的内存副本落成
 *      tmp 里的**变异副本**，再用真门的 --spec-extra 指过去，必须 exit 1；
 *      收测时全部承载文件 sha256 逐一比对，不等就说明"负例"其实是把产品改了。
 *   3. 红要传到门的名义上 ⇒ 自测件里自己算出来的"红"不算，spawn 真 CLI 的退出码才算；
 *      同时另跑一次干净的门，必须 exit 0（绿的是活树，不是变异副本）。
 * 用法：node scripts/qa/test-source-shape-lg31.mjs [--keep]
 * 标签规矩：说明文字里不要出现 `LG31_RESULT=FAIL` 原形，聚合器抓的是输出里第一个 *_TEST|RESULT=(PASS|FAIL)。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

process.env.QA_SHAPE_LIB = "1";              // 只借引擎，不在 import 时跑 CLI
const REPO = resolve(import.meta.dirname, "..", "..");
const CARRIER = resolve(REPO, "scripts/qa/verify-source-shape.mjs");
const GATE = "scripts/qa/verify-source-shape.mjs";
const OPS = "reports/audit/round-7/ops/PAGES-LOGIN-INDEX.json";
const KEEP = process.argv.includes("--keep");
const { SPEC, CRIT_ROWS, stripComments, templateOf, inject, runRow, BANDS, bandOf } = await import(pathToFileURL(CARRIER).href);

/* 变异副本放仓外：os.tmpdir()，绝不落在 REPO 里（本项目在册教训是"临时件混进仓库就被当成产物"）。 */
const TMP = join(tmpdir(), "lg31-nonframe-r10b");
if (TMP.startsWith(REPO)) { console.log("LG31_TEST=NOTRUN reason=临时目录落在仓库内（" + TMP + "）⇒ 本测试的前提破了"); process.exit(2); }
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

let cases = 0, fail = 0;
const ok = (cond, label, detail) => {
  cases++;
  if (cond) console.log(`  ok   ${label}`);
  else { fail++; console.log(`  FAIL ${label}${detail ? "  «" + String(detail).slice(0, 240) + "»" : ""}`); }
};

const row = SPEC.find((s) => s.caseId === "LG31");
const carriersOf = (s) => (s.files || (s.file ? [{ file: s.file, checks: s.checks }] : []));
const carrierFiles = [...new Set(SPEC.flatMap((s) => carriersOf(s).map((t) => t.file)))];
const sha = (p) => { try { return createHash("sha256").update(readFileSync(resolve(REPO, p))).digest("hex").slice(0, 16); } catch { return "NOFILE"; } };
const before = new Map(carrierFiles.map((p) => [p, sha(p)]));

/* ── A. 接线：判据台里那条 LG31 还在、载体指的就是它、正文一字未改 ── */
ok(!!row, "A1 载体里有 LG31 条目（没有＝这条行仍未去向）");
if (!row) { console.log("LG31_TEST=NOTRUN"); process.exit(2); }
ok(row.criteria === true, "A2 LG31 标了 criteria:true ⇒ 不进台账补丁（混进 patches 会把整份 cellplan 打死）", row.criteria);
ok(!!CRIT_ROWS.find((r) => r.caseId === "LG31"), "A3 CRIT_ROWS 认得这条（判据台侧盖章取的就是这份名单）");
ok(!!existsSync(resolve(REPO, OPS)), "A4 判据台文件在盘上", OPS);
const ops = JSON.parse(readFileSync(resolve(REPO, OPS), "utf8"));
const src143 = (ops.cases || []).find((x) => String(x.id) === "LG31");
ok(!!src143, "A5 ops 里 LG31 还在（正文被换过＝载体指错了行）");
ok(row.manifest === basename(OPS), "A6 manifest 指对", row.manifest);
ok(row.page === src143.page, "A7 page 未被迁移（迁移要主编排层裁，本车道不动）", row.page + " vs " + (src143 || {}).page);
const verbatim = [src143.title, src143.pre, src143.action, src143.expected].join(" ");
ok(/#login-sms-code/.test(src143.action), "A8 判据 action 仍点名 #login-sms-code（缺席判点钉的就是它）", src143.action.slice(0, 60));
ok(/长度恰为 6/.test(src143.expected) && /index\.vue:143/.test(src143.expected), "A9 判据 expected 仍引 :143「恰为 6」（漂移的行号由载体在证据里写明，不改判据）", src143.expected.slice(0, 60));
ok(/验证码长度边界/.test(src143.title) && /.slice\(0, 6\)/.test(row.claim), "A10 title 与截断断言都在，claim 写清了换成什么谓词", row.claim.slice(0, 60));
ok(verbatim.length > 100, "A11 判据正文取全（四条字段拼接长度 " + verbatim.length + "）");

/* ── B. 谓词词汇：只用四种，不许新造 ── */
const ALLOWED = ["absent", "present", "countEq", "countTemplateEq"];
const kinds = carriersOf(row).flatMap((t) => (t.checks || []).map((c) => c.kind));
ok(kinds.every((k) => ALLOWED.includes(k)), "B1 新增判点只用 absent/present/countEq/countTemplateEq", [...new Set(kinds)].join(","));
ok(kinds.length >= 10, "B2 判点数量 " + kinds.length + "（一屏事实要能拆开判）", kinds.length);
{
  /* 词表出处原来按行号窗口取（读判据台第 25-29 行）：判据台头部一插注释，窗口就漂成别的段落，
     本轮给 bands 加单一来源后 B3 就假红了一次——和 D5 那个「行号恰为 129」同一种病。
     改成按内容定位：恰有一行声明「谓词只允许四种」，且那一行把四种都点齐。 */
  const vocab = readFileSync(CARRIER, "utf8").split(/\r?\n/).filter((l) => /谓词只允许/.test(l));
  ok(vocab.length === 1, "B3a 判据台里恰有一行声明谓词词表（两行＝有人另开了第二张词表）", vocab.length);
  ok(vocab.length === 1 && ALLOWED.every((k) => vocab[0].includes(k)), "B3b 词表出处仍在、四种谓词都在（SPEC 头部注释未被人改写以放行新谓词）", vocab[0] || "");
}

/* ── C. 正例锚点：每个承载层都要有一条能变绿的判点（规则 3） ── */
for (const t of carriersOf(row)) {
  const pos = (t.checks || []).filter((c) => c.kind === "present" || (c.kind === "countEq" && c.n > 0) || (c.kind === "countTemplateEq" && c.n > 0));
  ok(pos.length > 0, "C " + basename(t.file) + " 有正例锚点 " + pos.length + " 条（只有 absent 就是『读不到=成立』）");
}
{
  /* 产物档不再在测试里抄一张两档表：档名→构建根的表由判据台 import（BANDS），
     声明了几档就核几档（行上 bands 与 files 实读的档是否对得上，判据台开跑前已经对过账，
     见 verify-source-shape.mjs 的 SRC_SHAPE_BANDS）。 */
  const declared = [...new Set(row.bands || [])].sort();
  const read = [...new Set(carriersOf(row).map((t) => bandOf(t.file)).filter(Boolean))].sort();
  ok(declared.length > 0, "C2a 本行声明了要验的产物档", declared.join(",") || "空");
  ok(declared.join(",") === read.join(","), "C2b 声明档＝实读档（" + (declared.join("+") || "空") + " vs " + (read.join("+") || "无产物承载") + "）");
  for (const band of declared) {
    const hit = carriersOf(row).map((t) => t.file).filter((f) => bandOf(f) === band);
    ok(hit.length > 0, "C3a " + band + " 档有产物承载 " + hit.length + " 个");
    for (const f of hit) ok(existsSync(resolve(REPO, f)) && statSync(resolve(REPO, f)).size > 0, "C3b 产物承载在盘上且非空（" + f + "）");
  }
}

/* ── D. 活树必须绿：判据点名的物件确实不在，六位谓词确实在 ── */
{
  const bad = runRow(row);
  ok(!bad, "D1 LG31 判点在今天的盘上全部成立", bad ? bad.where + " :: " + bad.why : "");
  const lg = readFileSync(resolve(REPO, "apps/client/src/pages/login/index.vue"), "utf8");
  ok((stripComments(lg).match(/login-sms-code/g) || []).length === 0, "D2 登录页剥注释后 login-sms-code 0 命中");
  ok((lg.match(/login-sms-code/g) || []).length === 0, "D3 连 HTML 注释里都没有 login-sms-code（不是『剥掉了才看不见』）");
  ok(/password\.value\.length >= 6 && password\.value\.length <= 64/.test(lg), "D4 六位谓词真在登录页源码里（判据引的 :143 已漂到这里）");
  /* D5 原来钉的是「行号恰为 129」。行号不是形状：多一个 import、多一行注释它就漂，
     而这条判据要的是"六位谓词长在 isCodeValid 这个 computed 里"（放行口径只有这一处）。
     所以改成结构判定：找出 isCodeValid 这条 computed 的**唯一**声明行，再从它往下取三行
     看谓词在不在它的体内；行号只当读数打进证据，不参与判等。 */
  const lines = lg.split(/\r?\n/);
  const heads = lines.reduce((acc, l, i) => (/const isCodeValid = computed/.test(l) ? acc.concat(i + 1) : acc), []);
  ok(heads.length === 1, "D5a 登录页恰一处 isCodeValid computed（多一处＝又开了一个放行口径）", heads.join(","));
  const body = heads.length === 1 ? lines.slice(heads[0] - 1, heads[0] + 3).join("\n") : "";
  ok(/password\.value\.length >= 6 && password\.value\.length <= 64/.test(body), "D5b 六位谓词就长在 isCodeValid 的 computed 体内（实测 :" + heads[0] + "，读数不参与判等）", body.replace(/\n/g, "\\n").slice(0, 160));
  ok((lg.match(/password\.value\.length >= 6/g) || []).length === 1, "D6 六位比较全页只此一处（第二处等于又开了一条放行判据）", (lg.match(/password\.value\.length >= 6/g) || []).length);
}

/* ── E. 负例：内存注入必须红，且红在被注入的那个承载上 ── */
const negs = row.neg || [];
ok(negs.length >= 6, "E1 挂了 " + negs.length + " 处命中注入（判据台 A 类批次的同款纪律）", negs.length);
const mutants = [];
for (let i = 0; i < negs.length; i++) {
  const ng = negs[i];
  const targets = carriersOf(row);
  if (!targets.some((t) => t.file === ng.file)) { ok(false, "E2 neg#" + i + " 指到本条判点没读的承载", ng.file); continue; }
  const raw = readFileSync(resolve(REPO, ng.file), "utf8");
  const inj = inject(raw, ng);
  if (inj.why) { ok(false, "E3 neg#" + i + " 注入落地（" + basename(ng.file) + "）", inj.why); continue; }
  ok(inj.text.length !== raw.length, "E4 neg#" + i + " 注入真的改变了文本（" + basename(ng.file) + " Δ" + (inj.text.length - raw.length) + "B）");
  const after = runRow(row, ng.file, inj.text);
  ok(!!after, "E5 neg#" + i + " 注入后判点变红（" + basename(ng.file) + " ← " + (inj.inserted || inj.removed || "").replace(/\n/g, "\\n").slice(0, 46) + "）", "整条仍然成立 ⇒ 这是一道恒绿门");
  ok(!!after && after.where === ng.file, "E6 neg#" + i + " 红来自被注入的那个承载，不是别处", after ? after.where : "");
  const fx = join(TMP, "neg" + i + "__" + basename(ng.file).replace(/[^\w.-]/g, "_"));
  writeFileSync(fx, inj.text, "utf8");
  mutants.push({ i, ng, fx, why: after ? after.why : "" });
}

/* ── F. 端到端真退出码：变异副本必须在仓外，且必须让真门 exit 1；活树回绿 ── */
const CHILD_ENV = { ...process.env };
delete CHILD_ENV.QA_SHAPE_LIB;                 // 漏进 spawn 就会退化成"不跑 CLI、不输出、exit 0"的哑门
/* 活树读数不再抄「total=99 成立=88 不成立=0」这一串数：门只对"不成立"逐条打 SHAPE_FAIL 点名行，
   于是「在册不成立的 id 名单」直接从门自己的输出里取。本轮活树上就有 11 条**台账行**不成立
   （源码按后续裁定改过、判据台那几行的字面还停在旧源码上，由判据台按 PARTIAL 语义记账），
   抄成常数只会让本测试隔一轮再红一次，而且抄的常数一旦对上旧值，真回归反倒看不出来。
   本测试要钉的东西一条没少：变异副本的不成立集合**减**基线集合必须恰好等于这一条变异行的 id
   （逐个对 id，不数个数），基线里那 11 条也不许被变异洗绿；判据台行（LG31 一族）另按
   SRC_SHAPE_CRIT 行断言全成立——那是本测试真正背书的范围。 */
const runGate = (extra) => {
  const args = [GATE, "--dry"].concat(extra ? ["--spec-extra", extra] : []);
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: "utf8", timeout: 300000, env: CHILD_ENV });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return { status: r.status, out, ids: [...out.matchAll(/^SHAPE_FAIL (\S+) :: /gm)].map((m) => m[1]),
    tot: (out.match(/^SRC_SHAPE total=(\d+) 成立=(\d+) 不成立=(\d+)/m) || []).slice(1).map(Number) };
};
{
  const rows = mutants.map((m) => ({
    id: "NEG-LG31-" + m.i, criteria: true, caseId: "LG31-" + m.i, manifest: row.manifest, page: row.page,
    claim: "端到端负例变异副本：" + m.ng.file,
    files: carriersOf(row).map((t) => ({
      file: t.file === m.ng.file ? m.fx : t.file,
      checks: (t.checks || []).map((c) => ({ kind: c.kind, re: String(c.re), n: c.n })),
    })),
  }));
  const plan = join(TMP, "neg-spec.json");
  writeFileSync(plan, JSON.stringify({ rows }, null, 1), "utf8");
  ok(!!rows.length, "F0a 变异副本清单非空（空清单会让下面所有断言空跑）", rows.length);
  ok(rows.every((r) => r.files.some((f) => f.file.startsWith(TMP))), "F8 每个变异行都真指了一份临时副本（指回仓内就是改产品，不是做负例）");
  /* 基线与每个变异副本背靠背跑：中间不隔时间窗，"多出来的那一条"才只能是变异造成的。 */
  const clean = runGate("");
  ok(clean.status === 0, "F0b 干净活树上门 exit 0（下面所有「多了几条」都拿这次读数当基线，不抄常数）",
    "exit=" + clean.status + " 基线不成立=" + clean.ids.length + " " + (clean.out.match(/^SRC_SHAPE_RESULT=.*$/m) || ["没打出 RESULT 行"])[0]);
  let reds = 0;
  for (const r of rows) {
    const one = join(TMP, "spec-" + r.id + ".json");
    writeFileSync(one, JSON.stringify({ rows: [r] }, null, 1), "utf8");
    const g = runGate(one);
    const failLine = (g.out.match(new RegExp("^SHAPE_FAIL " + r.id + " :: .*$", "m")) || [""])[0];
    const fired = !!failLine && failLine.replace(/\\/g, "/").includes(TMP.replace(/\\/g, "/"));
    ok(g.status === 1, "F1 " + r.id + " 变异副本跑真门 ⇒ exit 1（不是 0、不是 2）", "exit=" + g.status);
    ok(fired, "F2 " + r.id + " 的红点打在临时副本上（不是活树）", failLine || "没打出 SHAPE_FAIL " + r.id);
    ok(/SRC_SHAPE_RESULT=FAIL reason=判据台缺席判点不成立/.test(g.out), "F3 " + r.id + " 走的是「判据台缺席判点不成立」这条分支", (g.out.match(/^SRC_SHAPE_RESULT=.*$/m) || ["没打出 RESULT 行"])[0]);
    const grew = g.ids.filter((id) => !clean.ids.includes(id));
    ok(grew.length === 1 && grew[0] === r.id, "F4 " + r.id + " 比基线**只**多了这一条（差集逐个对 id，不数个数）", "多出 " + grew.length + " 条：" + grew.join(" ") + "；基线 " + clean.ids.length + " 条");
    const gone = clean.ids.filter((id) => !g.ids.includes(id));
    ok(gone.length === 0, "F4b " + r.id + " 都没把基线里在册不成立的判点洗绿（差集只许增不许减）", gone.join(" ") || "");
    ok(g.tot.length === 3 && g.tot[0] === g.tot[1] + g.tot[2] && g.tot[0] === clean.tot[0] + 1, "F4c " + r.id + " 守恒且条目数只多 1 条", g.tot.join("/") + "（基线 " + clean.tot.join("/") + "）");
    if (g.status === 1 && fired && grew.length === 1 && grew[0] === r.id) reds++;
  }
  ok(reds === rows.length, "F5 " + reds + "/" + rows.length + " 个变异副本各自在真门里红了一次");
  const after = runGate("");
  ok(after.status === 0 && after.ids.join(",") === clean.ids.join(","), "F6 撤掉变异副本后活树回绿，且不成立名单与基线逐条相同（同一扇门、同一个命令）",
    "exit=" + after.status + " " + (after.out.match(/^SRC_SHAPE_RESULT=.*$/m) || [""])[0]);
  const crit = (after.out.match(/^SRC_SHAPE_CRIT 判据台行=(\d+) 成立=(\d+) 不成立=(\d+)/m) || []).slice(1).map(Number);
  ok(crit.length === 3 && crit[2] === 0 && crit[1] + crit[2] === crit[0], "F7 判据台行在活树上全成立（台账行的在册红归判据台的 PARTIAL 记账，不在本测试背书范围）", (after.out.match(/^SRC_SHAPE_CRIT.*$/m) || ["没打出 CRIT 行"])[0]);
  ok(after.tot.length === 3 && after.tot[1] + after.tot[2] === after.tot[0] && after.ids.length === after.tot[2], "F7b 守恒，且每个「不成立」都有 SHAPE_FAIL 行点名（没有静默吞掉的红）", "不成立=" + after.tot[2] + " 点名行=" + after.ids.length);
}

/* ── G. 变异没有写坏产品，也没在仓里留下临时件 ── */
let drift = 0;
for (const [p, h] of before) { const now = sha(p); if (now !== h) { drift++; console.log("  DRIFT " + p + " " + h + "→" + now); } }
ok(drift === 0, "G1 全部 " + carrierFiles.length + " 个承载文件 sha256 未变（变异只在临时副本）", drift + " 个文件被改动");
{
  const ztmp = resolve(REPO, ".zcode", "tmp", "lg31-nonframe-r10b");
  ok(!existsSync(ztmp), "G2 本测试没在仓内建过临时目录（临时件只住 os.tmpdir）", ztmp);
  if (!KEEP) { rmSync(TMP, { recursive: true, force: true }); }
  ok(!existsSync(TMP) || KEEP, "G3 临时副本已清理（--keep 时保留供人复看）", TMP);
}

console.log("LG31_READ 判据行=" + CRIT_ROWS.length + " 在册判点=" + SPEC.length + " 承载层=" + carriersOf(row).length +
  " 谓词=" + kinds.length + " 注入点=" + negs.length + " 变异副本=" + mutants.length + " 临时目录=" + TMP);
console.log(`LG31_SUMMARY cases=${cases} fail=${fail}`);
console.log("SUMMARY: assertion failures = " + fail);
console.log(`LG31_TEST=${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);
