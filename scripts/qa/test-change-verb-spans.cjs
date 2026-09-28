#!/usr/bin/env node
/* 变更动词切句建模（§96.2 载体缺陷）的行为测试（独立 oracle，不复制实现）。
   缺陷形状：判据台 clausesOf 会在变更动词处把子句剪成 pre｜post，⟨壳⟩里含这类词就被剪成半只壳，
   未闭合的 ⟨ 按"到句尾都算说明"吞掉其后的真判点；而 normalize-bracket-spans.mjs 只建模
   「。；，、：」分隔符，spans-with-delimiter=0 检不出来（§96.2 实测：改词"删除→去掉"剪断点跟着走）。
   收口：词表唯一来源 change-verbs.cjs（从 firstVerbIndex 逐字搬来，不需要人拍板新词表），
   切句器与两个告警共用它。本测试钉四件事：
   ① 共享模块的行为=原切句语义（动词壳能剪、纯名词壳剪不动）；
   ② 两个消费者都真接了这份数组（源码接线检查，"建了不接"是本轮批评过 3 次的同类失败）；
   ③ 归一化器对动词壳显式计数告警，--strict-verb-shells 能红（负例）；
   ④ 判据台对动词壳打印 PROSE_BRACKET_VERB，--strict-verb-shells 让自检 FAIL 早退——
      且 clean 语料两把都判 0/绿（防"永远不变红"的反面："永远红"）。
   临时件全部写 .zcode/tmp/lane-tooldebt/verb-spans-test/，fixture 自带平衡壳、不碰台账本体。 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const TMP = path.join(REPO, ".zcode", "tmp", "lane-tooldebt", "verb-spans-test");
fs.mkdirSync(TMP, { recursive: true });

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
const run = (file, args) => spawnSync(process.execPath, [path.join(REPO, "scripts", "qa", file), ...args],
  { cwd: REPO, encoding: "utf8", timeout: 180000, maxBuffer: 32 * 1024 * 1024 });

/* ---------------- ① 共享模块语义（词表 = 原 firstVerbIndex 的数组，逐字） ---------------- */
const CHV = require("./change-verbs.cjs");
ok(Array.isArray(CHV.CHANGE_VERBS) && CHV.CHANGE_VERBS.length === 26 &&
  ["改为", "删掉", "删除", "移除", "去掉", "补", "应", "需", "走", "改"].every((v) => CHV.CHANGE_VERBS.includes(v)),
  "C1: CHANGE_VERBS 与搬移前的数组不再同形（词条被增删 ⇒ 切句器和告警又分家了）");
const cut = CHV.firstVerbIndex("并同步去掉测试用例 today-card__rotate");
ok(cut && cut.verb === "去掉" && cut.at === 5 && cut.head === 3, "C1b: §96.2 现场样本「并同步去掉测试用例…」的剪断点不对：" + JSON.stringify(cut));
const noun = CHV.firstVerbIndex("warmPeople 种子名单引用作废");
ok(noun === null, "C1c: 纯名词壳被误判含动词（告警会永远红）：" + JSON.stringify(noun));
const spans = CHV.verbStraddlingSpans("… ⟨原处置＝整链已移除只留注释⟩ 并同步 ⟨warmPeople 种子名单⟩ …");
ok(spans.length === 1 && /移除/.test(spans[0].inner), "C1d: verbStraddlingSpans 没有只点名含动词的那只壳：" + JSON.stringify(spans));

/* ---------------- ② 接线：两个消费者共用同一份数组，不留副本 ---------------- */
const stationSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "verify-fixes-against-artifact.cjs"), "utf8");
const normSrc = fs.readFileSync(path.join(REPO, "scripts", "qa", "normalize-bracket-spans.mjs"), "utf8");
ok(/require\("\.\/change-verbs\.cjs"\)/.test(stationSrc) && !/"改为", "改成"/.test(stationSrc),
  "C2: 判据台还留着动词数组副本或没 require 共享模块（两份词表=缺陷本体）");
ok(/PROSE_BRACKET_VERB spans-with-change-verb=/.test(stationSrc) && /CHV\.verbStraddlingSpans\(L\)/.test(stationSrc) &&
  /strictVerbShells/.test(stationSrc), "C2b: 判据台的显式告警没接进自检（建了不接）");
ok(/require\("\.\/change-verbs\.cjs"\)/.test(normSrc) && /spans-with-change-verb=/.test(normSrc),
  "C2c: 归一化器没接共享词表/没打印计数行");

/* ---------------- fixture 台账两份：动词壳 / 纯名词壳（壳都闭合、不含。；，、：，否则撞别的判红） ------- */
const mkLedger = (name, shellText) => {
  const p = path.join(TMP, name + ".ledger.md");
  fs.writeFileSync(p, [
    "| ID | 判据 | 状态 | 处置 |",
    "|---|---|---|---|",
    "| VBT-001 | 整链判点 | 已修复 | " + shellText + " |",
    "",
  ].join("\n"));
  return p;
};
const verbLedger = mkLedger("verb", "⟨原处置＝整链已移除只留注释⟩");
const cleanLedger = mkLedger("clean", "⟨warmPeople 种子名单⟩");

/* ---------------- ③ 归一化器行为：告警计数 + strict 能红 + clean 不误红 ---------------- */
const nWarn = run("normalize-bracket-spans.mjs", ["--ledger", verbLedger]);
ok((nWarn.stdout || "").includes("spans-with-change-verb=1"),
  "C3: 归一化器对含「移除」的壳没报 spans-with-change-verb=1（fixture 没被用上？） exit=" + nWarn.status + " out=" + JSON.stringify(String(nWarn.stdout).slice(0, 200)));
ok((nWarn.stdout || "").includes("BRACKETNORM_VERB_WARN="), "C3b: 归一化器缺 BRACKETNORM_VERB_WARN 显式告警行");
ok(nWarn.status === 0, "C3c: 默认档（告警不否决）不该 exit 非 0，exit=" + nWarn.status);
const nStrict = run("normalize-bracket-spans.mjs", ["--ledger", verbLedger, "--strict-verb-shells"]);
ok(nStrict.status === 2 && /BRACKETNORM_RESULT=FAIL reason=有 1 个壳内含变更动词/.test(String(nStrict.stdout)),
  "C4: --strict-verb-shells 对动词壳没有判红（负例不会红 = 机制没闭上），exit=" + nStrict.status);
const nClean = run("normalize-bracket-spans.mjs", ["--ledger", cleanLedger, "--strict-verb-shells"]);
ok(nClean.status === 0 && (nClean.stdout || "").includes("spans-with-change-verb=0"),
  "C4b: clean 台账被误报动词壳（永远红也是死）exit=" + nClean.status);

/* ---------------- ④ 判据台行为：PROSE_BRACKET_VERB 计数 + strict 否决自检（items=[] 空跑，全程只落 .zcode/tmp） --- */
fs.writeFileSync(path.join(TMP, "dist-fx.js"), "today-card__rotate\n");
fs.mkdirSync(path.join(TMP, "dist"), { recursive: true });
fs.writeFileSync(path.join(TMP, "dist", "page.js"), "today-card__rotate\n");
fs.writeFileSync(path.join(TMP, "items-empty.json"), "[]");
/* 判据台的 P.* 用 path.join(ROOT, ARG.x)——绝对路径会被二次拼接成 ROOT+ROOT（实测 ENOENT），
   loadLaneItems 才认绝对路径；所以这里全部换算成仓库相对路径传入。 */
const rel = (p) => path.relative(REPO, p).split(path.sep).join("/");
const stationArgs = ["--ledger", rel(verbLedger), "--items", rel(path.join(TMP, "items-empty.json")),
  "--dist", rel(path.join(TMP, "dist")), "--src", rel(path.join(TMP, "dist")), "--out", rel(path.join(TMP, "fixverify-out"))];
fs.mkdirSync(path.join(TMP, "fixverify-out"), { recursive: true });
const sWarn = run("verify-fixes-against-artifact.cjs", stationArgs);
ok(/PROSE_BRACKET_VERB spans-with-change-verb=1/.test(String(sWarn.stdout)),
  "C5: 判据台没对动词壳打印 PROSE_BRACKET_VERB 计数行（fixture 没被它读到？） out=" + JSON.stringify(String(sWarn.stdout).slice(0, 200)));
const sStrict = run("verify-fixes-against-artifact.cjs", stationArgs.concat(["--strict-verb-shells"]));
ok(sStrict.status === 2 && /壳内含变更动词/.test(String(sStrict.stdout)) && /PROBE_SELFCHECK_RESULT=FAIL/.test(String(sStrict.stdout)),
  "C5b: 判据台 --strict-verb-shells 下没有把动词壳推成自检 FAIL（否决能力缺失），exit=" + sStrict.status);
const sClean = run("verify-fixes-against-artifact.cjs", stationArgs.map((a) => a === rel(verbLedger) ? rel(cleanLedger) : a).concat(["--strict-verb-shells"]));
ok(/PROSE_BRACKET_VERB spans-with-change-verb=0/.test(String(sClean.stdout)) && !/PROBE_SELFCHECK_RESULT=FAIL[^\n]*变更动词/.test(String(sClean.stdout)),
  "C5c: 判据台对 clean 台账在 strict 档误红（把语义改写权没收是人的活，工具不许永远红）");

console.log("CVC_SUMMARY checks=" + checks + " fail=" + fails.length);
for (const f of fails) console.log("  CVC_MISS " + f);
console.log(fails.length ? "CVC_TEST=FAIL " + fails.length + " 条断言未过" : "CVC_TEST=PASS 切句器与两个告警共用同一份变更动词词表，动词壳可告警可否决、clean 不误红");
process.exit(fails.length ? 1 : 0);
