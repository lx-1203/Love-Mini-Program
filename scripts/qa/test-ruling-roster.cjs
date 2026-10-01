/*
 * r10 负例：裁定册 §36 的 PENDING_RULINGS 机器名册必须被生成器**正确读出**，
 * 且"名册存在却切不出 open"这种形状**绝不能**把 §6 印成「需你拍板 0 项」。
 * 钉住的两处真事（都在 r10 当天现场发生）：
 *   ① 解析器用 `[^|]*` 切字段，而写入方用 `|` 当 options 的内部分隔符 ⇒ 18 条 open 全被筛掉、§6 静默归零；
 *   ② 没有 premise= 的行，写死单一停止符会把后面的 basis="…" 整段吞进 options ⇒ 交还给人的清单串成一片。
 * 全部跑在 tmp/ 下的假夹具：只读裁定册、只写 tmp/，绝不覆盖 reports/ 里的权威件。
 * 用法：node22 scripts/qa/test-ruling-roster.cjs
 *       变异对照：ROSTER_GEN=<改动过的生成器> node22 scripts/qa/test-ruling-roster.cjs
 * 聚合器按 ^test-.+\.(cjs|mjs)$ 自动收件。
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const GEN = process.env.ROSTER_GEN ? path.resolve(process.env.ROSTER_GEN) : path.join(REPO, "scripts", "qa", "gen-round8-report.mjs");
const TMP = path.join(REPO, "tmp", "r10-roster-test");
fs.mkdirSync(TMP, { recursive: true });

let fails = 0;
const ok = (c, name, d) => { if (c) console.log(`  ok   ${name}${d ? "  ｜" + d : ""}`); else { fails++; console.log(`  FAIL ${name}${d ? "  ｜" + d : ""}`); } };

function ledger(name, rows, tail) {
  const p = path.join(TMP, name);
  const body = [
    "# 假裁定册", "",
    "## 1. 需要你选一：A 还是 B",
    "## 2. 收口流水（本节不是选择题）",
    "", "```machine",
    "PENDING_RULINGS_BEGIN producedBy=test head=deadbeef",
    ...rows,
    "PENDING_RULINGS_END " + tail,
    "```", "",
  ].join("\n");
  fs.writeFileSync(p, body);
  return path.relative(REPO, p).split(path.sep).join("/");
}

function run(ledgerRel) {
  const outRel = "tmp/r10-roster-test/report-" + path.basename(ledgerRel) + ".md";
  const del = path.join(REPO, outRel);
  if (fs.existsSync(del)) fs.unlinkSync(del); // 上一发的残留会把"这一发其实没写盘"读成通过
  const r = spawnSync(process.execPath, [GEN, "--ledger", ledgerRel, "--out", outRel], { cwd: REPO, encoding: "utf8", timeout: 120000 });
  const rep = fs.existsSync(del) ? fs.readFileSync(del, "utf8") : "";
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}`, rep };
}

/* §6 必须真的存在且真的是个数字：`heading !== "0"` 在 undefined 上会空过，那是把"生成器没写报告"
   误读成"待办不为零"。变异对照实测就是这个形状（生成器崩了，B 差点空过）。 */
function sec6Number(rep) {
  const m = /^## 6\. 需你拍板 (\d+) 项/m.exec(rep);
  return m ? Number(m[1]) : null;
}

console.log("== A 正常名册：open 数、options 不被 basis 污染、来源=roster ==");
{
  const rel = ledger("good.md", [
    "RULING id=decisions#1 status=open title=令牌冲突 options=A改判据|B改令牌值 basis=\"§1:20\"",
    "RULING id=decisions#5 status=open title=证据可携 options=A|B|C premise=changed basis=\"§35 C\"",
    "RULING id=decisions#14 status=half-closed title=生产者集合 options=A|B basis=\"§14\"",
    "RULING id=new#E status=closed title=截图不入库 options=无 basis=\"§35.1\"",
  ], "open=2 half_closed=1 closed=1");
  const { code, rep, out } = run(rel);
  const heading = (rep.match(/^## 6\. 需你拍板 (\d+) 项/m) || [])[1];
  const items = (rep.match(/^- decisions#|^- new#/gm) || []).length;
  const opt1 = (rep.match(/decisions#1：[^\n]*/) || [""])[0];
  ok(code === 0, "A 生成器退 0", "exit=" + code + " " + (/ROSTER_GEN/.test(out) ? "" : ""));
  ok(heading === "2", "A §6 标题数=名册 open 数 2", "实际=" + heading);
  ok(items === 2, "A 列出条数=2（自数一致）", "实际=" + items);
  ok(!/basis=/.test(opt1), "A options 没把 basis 吞进来", opt1.slice(0, 90));
  ok(/source=roster/.test(rep), "A 机器行标明来源是名册");
  ok(/尾部计数与实际行数一致/.test(rep), "A 名册自对账一致");
}

console.log("== B 分隔符打架：名册有行却切不出 open ⇒ 必须回退并明说，不许归零 ==");
{
  const rel = ledger("broken.md", [
    // status 值写成大写 ⇒ 严格 ==="open" 一条都切不出来（等价于当年那次解析事故）
    "RULING id=decisions#1 status=OPEN title=甲 options=A|B basis=\"x\"",
    "RULING id=decisions#2 status=OPEN title=乙 options=A|B basis=\"y\"",
  ], "open=2 half_closed=0 closed=0");
  const { rep, code } = run(rel);
  const heading = sec6Number(rep);
  ok(code === 0 && rep.length > 0, "B 生成器真的写了报告（防空过）", "exit=" + code + " 报告字节=" + rep.length);
  ok(heading !== null && heading > 0, "B 绝不印「需你拍板 0 项」，也不许是没写出来的空值", "实际=" + heading);
  ok(/未读名册/.test(rep), "B 明印「未读名册」（不静默退回）");
  ok(/source=heading-classification/.test(rep), "B 来源退回标题分类");
}

console.log("== C 无名册 ⇒ 保守分类并明印；且新增一节流水不增待办数 ==");
{
  const p1 = path.join(TMP, "no-roster.md");
  fs.writeFileSync(p1, "# 假册\n\n## 1. 需要你选一：A 还是 B\n## 2. 收口流水（不是选择题）\n## 3. 请用户定夺 C 还是 D\n");
  const rel1 = path.relative(REPO, p1).split(path.sep).join("/");
  const r1 = run(rel1);
  const n1 = (r1.rep.match(/^## 6\. 需你拍板 (\d+) 项/m) || [])[1];
  const p2 = path.join(TMP, "no-roster-plus-log.md");
  fs.writeFileSync(p2, fs.readFileSync(p1, "utf8") + "## 4. r11 收口流水（新增一节流水，不该多一条待办）\n");
  const rel2 = path.relative(REPO, p2).split(path.sep).join("/");
  const r2 = run(rel2);
  const n2 = (r2.rep.match(/^## 6\. 需你拍板 (\d+) 项/m) || [])[1];
  ok(n1 === "2", "C 无名册时按标题分类=2", "实际=" + n1);
  ok(/未读名册/.test(r1.rep), "C 无名册也明印「未读名册」");
  ok(n2 === n1, "C 多一节流水不增待办数", n1 + "→" + n2);
}

console.log("== D 真名册（盘上那份）：读得到且条数与尾部声明自洽 ==");
{
  const real = run("reports/audit/round-7/decisions-v33.md");
  const m = /GENREPORT_SECTION6_SELFCOUNT heading_number=(\d+) listed_items=(\d+) source=(\S+) crosscheck_classification=(\d+)/.exec(real.out);
  ok(!!m, "D 真册跑出名册机器行", m ? m[0].slice(0, 110) : "无");
  if (m) {
    ok(m[3] === "roster", "D 真册来源=roster（不是退回分类）", m[3]);
    ok(m[1] === m[2], "D 真册标题数==列出条数", m[1] + "/" + m[2]);
    ok(Number(m[1]) > 0, "D 真册 open 不为零", m[1]);
    console.log(`  info D crosscheck_classification=${m[4]}（分类器按标题判的数，与名册的差 = ${Math.abs(m[4] - m[1])}，差因是它读不到状态对账节的闭合）`);
  }
}

console.log(`SUMMARY: assertion failures = ${fails}`);
console.log(fails ? "ROSTER_TEST=FAIL" : "ROSTER_TEST=PASS");
process.exit(fails ? 1 : 0);
