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
    kind: "file", path: "reports/audit/real-e2e/GATES.json",
    check: (j) => j.schemaVersion === "gates-2"
      && /^[0-9a-f]{7,40}$/.test(String(j.gitSha || ""))
      && /git rev-parse/.test(String(j.gitShaSource || ""))
      && !!j.capturedAt && !!j.precondition && /verify-backend-restarted/.test(String(j.precondition.check || "")),
    why0: "载体必须是重写后的 gates-2：运行期取 SHA（不写死）、带重启前置件指针",
  },
  {
    key: "遗留测试数据处置",
    kind: "file", path: "reports/audit/real-e2e/GATES.json",
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
      out.push({ key: it.key, ok, misses: ok ? [] : [it.why0] });
    }
  }
  return out;
}

const verdict = judge(ITEMS);
let fail = verdict.filter((v) => !v.ok).length;
console.log(`RULINGS 四项=${ITEMS.length} 已落地=${verdict.length - fail} 未落地=${fail}（判据：${ITEMS.map((i) => i.kind).join("/")}）`);
for (const v of verdict) console.log((v.ok ? "  ok   " : "  ✗    ") + v.key + (v.ok ? "" : " :: " + v.misses.join("；")));

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
  const gates = JSON.parse(readFileSync(resolve(REPO, "reports/audit/real-e2e/GATES.json"), "utf8"));
  breaks.push(["gitSha 写死成 HEAD 字样必须红", !ITEMS[2].check({ ...gates, gitSha: "HEAD" })]);
  breaks.push(["缺重启前置件指针必须红", !ITEMS[2].check({ ...gates, precondition: {} })]);
  breaks.push(["测试数据键清单被清空必须红", !ITEMS[3].check({ ...gates, newDbKeysThisRound: {} })]);
  breaks.push(["dbWriteDisclosure 被删必须红", !ITEMS[3].check({ ...gates, dbWriteDisclosure: null })]);
  let bfail = 0;
  for (const [name, ok] of breaks) { console.log((ok ? "  ok   NEG " : "  ✗    NEG ") + name); if (!ok) bfail++; }
  console.log(`RULINGS_SELFTEST=${bfail ? "FAIL" : "PASS"} 破坏样本=${breaks.length} 没红=${bfail}`);
  if (bfail) process.exit(2);
  if (!tamperedLedger.includes("裁决（日期缺失）") || !saved) { console.log("  ✗    NEG 自检前置量没生成（这条负例等于没测）"); process.exit(2); }
}
console.log(fail ? `RULINGS_RESULT=FAIL 未落地=${fail}` : "RULINGS_RESULT=PASS ④ 四项都有可重跑判据背书");
process.exit(fail ? 2 : 0);
