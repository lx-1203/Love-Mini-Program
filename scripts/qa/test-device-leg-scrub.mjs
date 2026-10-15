/* 采集侧脱敏的离线负例：测的是载具真正 import 的那一个 scrubEvidence，不是重抄的一份。
 * 三条要求：
 *  ① JWT / bcrypt / 命名 token|password|散列字段 三种形状都掉值；
 *  ② 不含票的行逐字节不变——外部工具 grep 的就是 PASS··/FAIL·· 前缀与「失败 N 项」，
 *     脱敏若顺手改了它们，证据链就断了；
 *  ③ 判决 detail 里塞票，走完 buildRows→buildExecFile 之后整份 JSON 再 grep 不出票
 *     （这条就是本程实测抓到的那一发：新出的 exec-results.json 第 587 行被提交前
 *     密钥预检判红，一枚 108 字符 JWT 就这么躺在"证据"里）。
 * 跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-device-leg-scrub.mjs */
/* 跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-device-leg-scrub.mjs
 * 变异试验用环境变量指路：DL_TALLY_OVERRIDE=<被篡改的 device-leg-tally 副本>（验"删掉写侧
 * 遮蔽本测试会变红"）、DL_LEG_SOURCE=<被回退成裸 stringify 的载具源码副本>（验源码锚会变红）。
 * ⑥ 段（2026-10-16 新增）盯的就是那次事故的本体：exec-results.json 的落盘出口。
 * ①-⑤ 只证"遮蔽器正则有牙"；③ 段当年是测试自己手动 scrub 完再喂 buildRows 的，
 * 把载具写侧的遮蔽删光它也照样绿——⑥ 段要避开的正是这种空转绿。 */
import { readFileSync } from "node:fs";

const TALLY_URL = process.env.DL_TALLY_OVERRIDE
  ? new URL(`file:///${String(process.env.DL_TALLY_OVERRIDE).replace(/\\/g, "/")}`).href
  : new URL("./device-leg-tally.mjs", import.meta.url).href;
const LEG_SRC_URL = process.env.DL_LEG_SOURCE
  ? new URL(`file:///${String(process.env.DL_LEG_SOURCE).replace(/\\/g, "/")}`).href
  : new URL("../verify-device-leg.mjs", import.meta.url).href;
const mod = await import(TALLY_URL);
const { buildRows, buildExecFile, resultLine, scrubEvidence } = mod;
const { renderExecFile } = mod;

const JWT = "eyJraWQiOiIxIiwiYWxnIjoiSFM1MTIifQ." + "a".repeat(60) + "." + "b".repeat(40);
const BCRYPT = "$2a$10$" + "x".repeat(53);
let bad = 0;
let checks = 0;
const t = (name, pass, extra) => {
  checks++;
  console.log(`${pass ? "ok  " : "FAIL"} ${name}${!pass && extra ? " :: " + extra : ""}`);
  if (!pass) bad++;
};

/* ① 值形状 */
const a = scrubEvidence(`http=200 body={"code":0,"data":{"token":"${JWT}"}}`);
t("JWT 掉值", !/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(a), a.slice(0, 110));
const b = scrubEvidence(`row password=${BCRYPT} end`);
t("bcrypt 掉值", !b.includes(BCRYPT), b);
const c = scrubEvidence(`"ADMIN_INITIAL_PASSWORD_HASH": "${BCRYPT}"`);
t("命名字段 + 散列一起掉值", !c.includes(BCRYPT), c);
const d = scrubEvidence(`refresh_token: "${JWT}" 之后还有话`);
t("裸写 refresh_token + JWT 也不残留", !/eyJ[A-Za-z0-9_-]{8,}\./.test(d), d);

/* ② 判决字面一字不变 */
for (const plain of [
  "PASS  01-home 路由落在 /pages/home/index — routeStack=pages/home/index",
  "FAIL  01-home 路由落在 /pages/home/index — routeStack=pages/discover/index",
  "UNVERIFIED-INSTRUMENT  自动化通道可用（evaluate 有答案） :: 通道没回话",
  "失败 1 项",
  "DEVICELEG_RESULT=FAIL pass=40 fail=1 unverified=0 dir=reports/audit/round-7/exec-v38-devicleg band=real@f0677920",
]) {
  t("无票行逐字节不变：" + plain.slice(0, 34), scrubEvidence(plain) === plain, scrubEvidence(plain));
}

/* ③ 真实落盘链路 */
const items = [
  { label: "超管票可铸（公告由后台侧发出）", tier: "pass", detail: `http=200 SUPER_PASSWORD 长度=18 body={"code":0,"data":{"token":"${JWT}"}}`, page: "x" },
  { label: "后台发布 text 公告成功", tier: "pass", detail: "http=200 id=30", page: "x" },
  { label: "某行带散列", tier: "fail", detail: `dump ${BCRYPT}`, page: "x" },
];
const meta = {
  band: "real@f0677920", identity: "A", loginVerify: "logged-in userId=100166",
  sessionSource: "phone-login", gitSha: "deadbeef", gitShaScope: "ledger-write",
  bandSource: "artifact-band", round: "probe", project: "p", runner: "probe",
  totals: { pass: 2, fail: 1, unverified: 0 },
};
const rows = buildRows(items.map((it) => ({ ...it, detail: scrubEvidence(it.detail), label: scrubEvidence(it.label) })), meta, []);
const file = JSON.stringify(buildExecFile(rows, meta), null, 1);
const hits = (file.match(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g) || []).length
  + (file.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{50,}/g) || []).length;
/* 门真正读的是行上的字段（buildRows 把 detail 摊进 observed/reason，见 device-leg-tally.mjs:140-141），
 * 所以这里断言"落盘字段本身没有票"，而不是"我传进去的对象没有票"。 */
/* 探测器必须与遮蔽器的口径一致：掩码**刻意保留** `$2a$10$` 这 7 个字符做前缀，
 * 所以"看到前缀"不等于"票还在"。这里用与文件级同一个全长形状，
 * 否则就是我这边的假红（第一版正是这样把 pass 判成 fail 的）。 */
const rowDump = JSON.stringify(rows);
const rowHits = (rowDump.match(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g) || []).length
  + (rowDump.match(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{50,}/g) || []).length;
t("落盘件（exec-results 形状）零残票", hits === 0 && rowHits === 0,
  `残票 file=${hits} rows=${rowHits}；行样例=` + JSON.stringify(rows[0]).slice(0, 150));
t("脱敏真的作用到了门读的那个字段上（observed 被改写过，不是没票所以不变）",
  typeof rows[0].observed === "string" && rows[0].observed.includes("****(len="),
  JSON.stringify(rows[0].observed).slice(0, 130));
t("未绑定 ⇒ 行键全落 DEVICE-LEG 命名空间（不领任何用例的账）",
  rows.length === 3 && rows.every((r) => r.manifest === "DEVICE-LEG"),
  rows.map((r) => r.manifest + "|" + r.id).join(", "));
t("脱敏后判决行的产品/仪表分档不被改写",
  rows[0].status === "EXECUTED" && rows[2].status === "FAILED",
  rows.map((r) => r.status).join("/"));

/* ④ 判决行形状：一个 _RESULT=，且不含竖线（bash 侧 [A-Z_]+_RESULT=[^|]* 会在竖线截断） */
const rl = resultLine({ pass: 2, fail: 1, unverified: 0, skipped: 0 }, "dir");
t("判决行只有一枚 _RESULT= 且无竖线", (rl.match(/_RESULT=/g) || []).length === 1 && !rl.includes("|"), rl);

/* ⑤ 空/异常入参不炸（载具会把 null/number 传进来） */
t("null 与数字入参不抛", scrubEvidence(null) === "" && scrubEvidence(7) === "7");

/* ⑥ 结果台账（exec-results.json）写侧筛查——本程的正题。
 * 判点全部建立在"行字段带 RAW 票"之上：遮蔽若只活在 check() 入口，这里必红；
 * 只有落盘出口自己过 scrubEvidence 才能全绿（单一遮蔽源 = device-leg-tally.mjs 的同一个函数）。
 * 探测器用密钥门自己的两把形状尺（verify-staged-secrets.mjs:168-169），
 * 写侧屏完 ≠ 门放过才算数。 */
const JWT3 = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;   // 门尺一：三段齐
const JWT2 = /\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{12,}\b/g;                     // 门尺二：被 slice 腰斩的两段（:587 事故形状）
const jwtHits = (s) => (s.match(JWT3) || []).length + (s.match(JWT2) || []).length;
/* 事故原样复刻：verify-device-leg.mjs:498 的 body=${lg.text.slice(0,150)} 把票截成两段，
   旧 SCRUB_JWT（只认三段）漏屏 ⇒ 这里用同样被腰斩的票当输入。 */
const RAW_TRUNC = "eyJraWQiOiIxIiwiYWxnIjoiSFM1MTIifQ." + "c".repeat(70);
const rawItems = [
  { label: "超管票可铸（公告由后台侧发出）", tier: "pass",
    detail: `http=200 SUPER_PASSWORD 长度=18 body={"code":0,"message":"ok","data":{"token":"${RAW_TRUNC}`, page: "x" },
  { label: "设备首条卡片能在后台按同一个 ID 读到", tier: "pass",
    detail: "POST_ID=146 后台按 id 读到 1 条，id=146", page: "y" },
];
const rawMeta = { ...meta, loginVerify: "logged-in userId=100166" };
t("renderExecFile 已导出（结果台账唯一序列化出口）", typeof renderExecFile === "function", typeof renderExecFile);
const artifact = typeof renderExecFile === "function" ? renderExecFile(buildRows(rawItems, rawMeta, []), rawMeta) : "";
t("写侧筛查：RAW 行字段过 renderExecFile 后按门双尺零 JWT 形状",
  typeof renderExecFile === "function" && jwtHits(artifact) === 0,
  `残票=${typeof renderExecFile === "function" ? jwtHits(artifact) : "n/a"}`);
t("落盘文本仍是合法 JSON 且门读的行轴不伤（execRows 照常 crediting）",
  (() => { try { const j = JSON.parse(artifact); return j.results.length === 2
      && j.results.every((r) => /^(EXECUTED|FAILED|SKIPPED)$/.test(r.status)) && j.band === rawMeta.band; } catch { return false; } })(),
  artifact.slice(0, 90));
t("业务身份幸存：数字 POST_ID=146 与 logged-in userId=100166 原样可读",
  artifact.includes("POST_ID=146") && artifact.includes("logged-in userId=100166") && artifact.includes("id=146"),
  (artifact.match(/POST_ID=\S+/g) || []).join(","));
t("两段截断票的单独形状：scrubEvidence ≥ 门尺二（旧三段尺在这里漏屏，正是 :587 事故）",
  jwtHits(scrubEvidence(`body={"token":"${RAW_TRUNC}`)) === 0,
  scrubEvidence(`body={"token":"${RAW_TRUNC}`).slice(0, 90));
/* 源码锚：载具的 exec-results.json 写点必须真的走 renderExecFile（行为判点测的是函数本体，
   这条测的是"出口有人接"——把 :263 回退成裸 JSON.stringify 而不改本测试，这条必红）。 */
const legSrc = readFileSync(new URL(LEG_SRC_URL), "utf8");
const writeLines = legSrc.split(/\r?\n/).filter((l) => /writeFileSync\([^)]*exec-results\.json/.test(l));
t("源码锚：载具落盘 exec-results.json 的每一行都经 renderExecFile，且无裸 buildExecFile 序列化",
  writeLines.length === 1 && writeLines[0].includes("renderExecFile(") && !/JSON\.stringify\(buildExecFile/.test(writeLines[0]),
  `行数=${writeLines.length} 样例=${writeLines[0] ? writeLines[0].trim().slice(0, 100) : "(无)"}`);

console.log(bad === 0
  ? `DLSCRUB_SUMMARY checks=${checks} fail=0\nDLSCRUB_TEST=PASS`
  : `DLSCRUB_SUMMARY checks=${checks} fail=${bad}\nDLSCRUB_TEST=FAIL`);
process.exit(bad === 0 ? 0 : 1);
