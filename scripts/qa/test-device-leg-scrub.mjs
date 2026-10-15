/* 采集侧脱敏的离线负例：测的是载具真正 import 的那一个 scrubEvidence，不是重抄的一份。
 * 三条要求：
 *  ① JWT / bcrypt / 命名 token|password|散列字段 三种形状都掉值；
 *  ② 不含票的行逐字节不变——外部工具 grep 的就是 PASS··/FAIL·· 前缀与「失败 N 项」，
 *     脱敏若顺手改了它们，证据链就断了；
 *  ③ 判决 detail 里塞票，走完 buildRows→buildExecFile 之后整份 JSON 再 grep 不出票
 *     （这条就是本程实测抓到的那一发：新出的 exec-results.json 第 587 行被提交前
 *     密钥预检判红，一枚 108 字符 JWT 就这么躺在"证据"里）。
 * 跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-device-leg-scrub.mjs */
import {
  buildRows, buildExecFile, resultLine, scrubEvidence,
} from "./device-leg-tally.mjs";

const JWT = "eyJraWQiOiIxIiwiYWxnIjoiSFM1MTIifQ." + "a".repeat(60) + "." + "b".repeat(40);
const BCRYPT = "$2a$10$" + "x".repeat(53);
let bad = 0;
const t = (name, pass, extra) => {
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

console.log(bad === 0
  ? `DLSCRUB_SUMMARY checks=12 fail=0\nDLSCRUB_TEST=PASS`
  : `DLSCRUB_SUMMARY checks=12 fail=${bad}\nDLSCRUB_TEST=FAIL`);
process.exit(bad === 0 ? 0 : 1);
