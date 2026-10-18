#!/usr/bin/env node
/* 提交前置凭据门 —— 只扫「push 会暴露的那一集」，不是全仓。
 *
 * 为什么要它：用户裁定「推之前先做一轮 security 扫描」。一次性的手跑扫描保护不了下一程，
 * 而且本仓已经吃过两次"扫了个空却报干净"的亏：
 *   ① BRE 的 \{8,\} 交给 grep -E，四条尺全部静默零命中，输出看着像干净；
 *   ② 覆盖门只扫一层目录，我按嵌套布局放的腿它压根没看见，第一发复量数字一格没动。
 * 两次的共同形状是「扫不到东西」被当成「没东西」。所以本门的正例控制是硬要求：
 * 同一把尺必须先抓到已知那枚历史票（reports/audit/round-7/exec-v37-nearby/exec-results.json），
 * 抓不到 ⇒ SCAN_INVALID 退 2，本次结果一律不采信。
 *
 * 用法：node scripts/qa/verify-push-credentials.mjs [--range origin/main..HEAD] [--json <out>]
 * 机器行：PUSHCREDS_RESULT=PASS|FAIL|NOT-EVIDENCED files=N findings=N soft=M ...
 * 退出码：0 干净 / 1 有未获准的凭据形状 / 2 门自己没跑成（无 git、区间解析不了、
 *         扫描集为空、正例控制失败）。量不到必须响亮失败，不许空转过绿。
 * 输出纪律：只印 path:line + 掩码值（前 6 字符 + 长度），绝不回显原文。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const RANGE = arg("range", "origin/main..HEAD");
const JSON_OUT = argv.includes("--json") ? arg("json") : null;

const GAUGES = [
  ["JWT", /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g],
  ["bcrypt", /\$2[aby]\$[0-9]{2}\$[\.\/A-Za-z0-9]{20,}/g],
  ["PEM", /BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY/g],
  ["AWS", /\bAKIA[0-9A-Z]{16}\b/g],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["slack", /xox[baprs]-[A-Za-z0-9-]{10,}/g],
];
/* 已逐条人工定性的良性载体：命中仍打印（软），只是不判红——
 * 每条都要写清"为什么不是凭据"，否则这就是把凭据洗白的后门名单。 */
const ALLOW = new Map([
  ["apps/api/src/main/java/com/campuslove/api/auth/AuthController.java|JWT", "Swagger @Parameter 的 example 串，43 字符且无签名段：文档示例不是凭据"],
  ["apps/api/src/test/java/com/campuslove/api/wxpay/WxPayPropertiesFailFastTest.java|PEM", "测试故意写坏的 PEM 首尾 + !!! 用来断言 fail-fast：不是密钥材料"],
  /* 2026-10-18 账主"全批"后按①记档（不是随手加的豁免；三件事实都在下面）：
     该件里那枚票 header.alg=HS512 kid=1、claims=sub,jti,iat,exp，exp=2026-10-13T14:05:28Z ⇒ 记档当日已过期 4.1 天，
     属失效凭据而非活体；文件本身已按"腿产物不进 git"裁定移出跟踪（8e69c124，字节留盘 11859B 作证据），
     命中来自 origin/main..HEAD 的历史 blob，不会随新提交再引入。
     代价如实写明：本仓因此永久保留一枚历史里的失效票；若日后判其值不当，只能重写 109 个未推提交（本次裁定为重写代价高于失效票价值，故选①不选②）。 */
  ["reports/audit/round-7/exec-v37-nearby/exec-results.json|JWT", "exp=2026-10-13T14:05:28Z 的失效票（HS512/kid=1），记档当日过期 4.1 天；该件已移出跟踪（8e69c124），命中来自历史 blob；盘上字节留作设备腿证据，且它同时是本门的正例控制件"],
]);
const CONTROL = "reports/audit/round-7/exec-v37-nearby/exec-results.json";

const mask = (m) => m.slice(0, 6) + "****(len=" + m.length + ")";
function scan(rel) {
  const abs = resolve(REPO, rel);
  if (!existsSync(abs)) return null;
  let buf;
  try { buf = readFileSync(abs); } catch { return { rel, err: "unreadable" }; }
  if (buf.includes(0)) return { rel, skipped: "binary" };
  const text = buf.toString("utf8");
  const hits = [];
  for (const [kind, re] of GAUGES) {
    re.lastIndex = 0;
    let m, n = 0, at = 0, sample = "";
    while ((m = re.exec(text)) !== null) {
      n++;
      if (!sample) { sample = mask(m[0]); at = text.slice(0, m.index).split("\n").length; }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    if (n) hits.push({ kind, count: n, at, sample, allowKey: rel + "|" + kind });
  }
  return { rel, hits };
}

/* 正例控制：抓不到已知的那枚，就说明尺或读法坏了 */
const ctl = scan(CONTROL);
const ctlOk = !!(ctl && ctl.hits && ctl.hits.some((h) => h.kind === "JWT"));
if (!ctlOk) {
  console.log("PUSHCREDS_CONTROL=FAILED " + CONTROL + " 里的已知票没抓到 ⇒ 尺与读法不可信");
  console.log("PUSHCREDS_RESULT=NOT-EVIDENCED reason=正例控制失败（本仓规矩：扫不到东西不等于没东西）");
  process.exit(2);
}
console.log("PUSHCREDS_CONTROL=OK " + CONTROL + " 命中 JWT " + ctl.hits.find((h) => h.kind === "JWT").sample);

let files;
try {
  files = execFileSync("git", ["diff", "--name-only", RANGE], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/).filter(Boolean);
} catch (e) {
  console.log("PUSHCREDS_RESULT=NOT-EVIDENCED reason=git 区间读不出 " + String(e.message).split("\n")[0].slice(0, 90));
  process.exit(2);
}
if (!files.length) {
  console.log("PUSHCREDS_RESULT=NOT-EVIDENCED reason=" + RANGE + " 解析出 0 个文件（空扫描集不判绿）");
  process.exit(2);
}

let present = 0, missing = 0, binary = 0, findings = 0, soft = 0;
const rows = [], softRows = [];
for (const rel of files) {
  const r = scan(rel);
  if (!r) { missing++; continue; }
  if (r.skipped) { binary++; continue; }
  present++;
  for (const h of r.hits) {
    if (ALLOW.has(h.allowKey)) { soft++; softRows.push({ file: rel, kind: h.kind, count: h.count, why: ALLOW.get(h.allowKey) }); continue; }
    findings++;
    rows.push({ file: rel, kind: h.kind, line: h.at, sample: h.sample, count: h.count });
  }
}
console.log(`PUSHCREDS_RANGE=${RANGE} files=${files.length} scanned=${present} missing=${missing} binary=${binary}`);
for (const s of softRows) console.log(`  SOFT ${s.file} [${s.kind} x${s.count}] ${s.why}`);
for (const f of rows) console.log(`  FINDING ${f.file}:${f.line} [${f.kind}] ${f.sample}`);
const verdict = findings === 0 ? "PASS" : "FAIL";
console.log(`PUSHCREDS_RESULT=${verdict} findings=${findings} soft=${soft} note=未获准的凭据形状为 0 才绿；软命中一律逐条点名并给理由`);
if (JSON_OUT) {
  const out = resolve(REPO, JSON_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ range: RANGE, control: "OK", scanned: present, findings: rows, soft: softRows }, null, 1));
}
process.exit(findings === 0 ? 0 : 1);
