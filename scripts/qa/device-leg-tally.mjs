/**
 * 设备腿判定的三档账本（纯函数/纯状态，不碰模拟器、不取租约、不发网络）。
 *
 * 为什么存在：scripts/verify-device-leg.mjs 以前只有一个 `failures` 计数器，
 * 「通道断了 / 租约没抢到 / 后端没应答 / 选择器解析不出来」和真正的产品断言失败
 * 被记进同一格、同一句「失败 N 项」、同一个 exit 1。本仓已经吃过这个亏：
 * 289 行"FAILED"里 194 行是仪表噪声（≈67%），整轮真实缺陷数不可恢复。
 * 现在分三档：
 *   pass        产品断言判绿
 *   fail        产品断言判红（唯一允许写 FAIL 前缀的档）
 *   unverified  仪表/环境故障（UNVERIFIED-INSTRUMENT），**永不**进 fail
 * 出口约定（verify-device-leg.mjs 的 exit path）：
 *   0 = 全部判过且全绿；1 = 至少一条产品断言判红；2 = 这一腿没能执行 / 只有仪表故障。
 * 人类可读行必须与旧格式逐字节兼容（有工具在 grep `^PASS`/`^FAIL`）：
 *   `PASS  <label> — <detail>` / `FAIL  <label> — <detail>`（两空格 + " — " 分隔）。
 * 机读行只加一条：`DEVICELEG_RESULT=<PASS|FAIL|NOT-EVIDENCED> pass=N fail=N unverified=N dir=<exec-* 目录> band=<mode@sha8|UNSTAMPED>`
 * （上面竖线是"三选一"的写法，**不是**行里的字符——载体在 | 处截断，行内一条都不许有）
 * ——名字沿用仓内 token 风格（BACKEND_FRESH_RESULT，scripts/qa/verify-backend-fresh.mjs:86），
 * 因为 scripts/qa/run-final-verify-v33.sh:49 的 g() 按 `[A-Z_]+_RESULT=` grep 每一腿的输出。
 *
 * 行形状不自创：逐字段镜像仓内既有生产者 r-exec-cli.mjs 的 row 构造
 * （scripts/qa/r-exec-cli.mjs:895-914、终稿 :1955 的文件级头部）与
 * scripts/qa/r-exec-ws.mjs row()（:163），消费者是 scripts/qa/verify-real-coverage.mjs 的
 * execRows()（:142-161，读 manifest/id/band/identity/status/loginVerify/sessionSource）。
 */

/** 旧格式逐字节兼容的产品档行（PASS/FAIL 前缀与 " — " 分隔都不许动）。 */
export function verdictLine(label, ok, detail) {
  return `${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`;
}
/** 新增档的行：前缀整词新造，不复用 PASS/FAIL，grep 不会把它误读成产品判决。 */
export function unverifiedLine(label, detail) {
  return `UNVERIFIED-INSTRUMENT  ${label}${detail ? ` — ${detail}` : ""}`;
}

/** 仪表故障词表（通道断/后端不可达/传输超时这类**载具自己报的错**才会命中；
 *  产品断言的 detail 是人写的判词，不会天然命中这些 token）。 */
export const INSTRUMENT_PATTERNS = [
  /^THROW\b/, /^ERR\b/, /^NO-STORE\b/, /ECONNREFUSED/, /ECONNRESET/, /ENOTFOUND/,
  /fetch failed/i, /socket hang up/i, /timeout waiting for automator/i, /automator.*EBUSY/i,
  /通道未解析|通道不可用/, /后端不可达/,
];
export function looksInstrumentFault(detail) {
  const s = String(detail == null ? "" : detail);
  return INSTRUMENT_PATTERNS.some((re) => re.test(s));
}

export function createTally({ emit = () => {} } = {}) {
  const items = [];
  const counts = { pass: 0, fail: 0, unverified: 0 };
  function push(label, tier, detail, page) {
    const item = { label: String(label), tier, detail: detail == null ? "" : String(detail), page: page || "" };
    items.push(item);
    counts[tier] += 1;
    emit(tier === "unverified" ? unverifiedLine(label, detail) : verdictLine(label, tier === "pass", detail));
    return item;
  }
  return {
    items,
    counts,
    check(label, ok, detail, page) { return push(label, ok ? "pass" : "fail", detail, page); },
    uncheck(label, detail, page) { return push(label, "unverified", detail, page); },
    /** 仪表-or-产品二选一：fault 为真且没判绿 ⇒ 记 unverified，绝不记 fail。 */
    checkFault(label, ok, detail, fault, page) {
      if (!ok && fault) return push(label, "unverified", detail, page);
      return push(label, ok ? "pass" : "fail", detail, page);
    },
  };
}

export function resultVerdict(counts) {
  if (counts.fail > 0) return "FAIL";
  if (counts.unverified > 0 || counts.pass === 0) return "NOT-EVIDENCED";
  return "PASS";
}
/** 0 = 全判过且绿；1 = 有产品级红；2 = 没能执行/只有仪表故障。fail 优先（红就是红）。 */
export function exitCodeOf(counts) {
  const v = resultVerdict(counts);
  return v === "FAIL" ? 1 : v === "NOT-EVIDENCED" ? 2 : 0;
}
/** 机读行（carrier: run-final-verify-v33.sh:49 `grep -oE '[A-Z_]+_RESULT=[^|]*'`）。
 *  第三入参 band 是给载具看的**命名空间**那一格：覆盖率门只认 mode@sha8（尺=artifact-band.mjs:22），
 *  取不到时印 UNSTAMPED（= 这一腿的账门一条也不会认领），而不是印一个看起来像戳的东西。
 *  竖线绝对不许出现：载体在 | 处截断，判决会被读成半句。 */
export function resultLine(counts, dirRel, band) {
  return `DEVICELEG_RESULT=${resultVerdict(counts)} pass=${counts.pass} fail=${counts.fail} unverified=${counts.unverified} dir=${dirRel || "none"} band=${band || "UNSTAMPED"}`;
}

/** 可选绑定表：把"设备腿确实按同一判点跑过"的条目对上 ops 判据台的 requiresReal 用例
 *  （门只给 manifest|id 命中判据集的行记账，见 verify-real-coverage.mjs:230-231 的 ids.has(key)）。
 *  默认文件不存在/为空 ⇒ 全部行落 DEVICE-LEG|DLnn（形状合规、门读得动，但门不会替不存在的判据认领覆盖）。 */
/** 采集侧脱敏：证据件的判决行里会贴后端应答体，而登录/铸票应答里就是真票。
 *  只替值、不动前缀与格式（外部工具 grep 的是 PASS··/FAIL·· 与「失败 N 项」）。
 *  放在这个模块里而不是载具文件里，是为了让离线测试测的是**这套正则本身**，
 *  不是某人重抄的一份。 */
const SCRUB_TOKENISH = /"(?:token|accessToken|refresh_token|password|passwordHash|ADMIN_INITIAL_PASSWORD_HASH)"\s*:\s*"[^"]{8,}"/g;
const SCRUB_JWT = /eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){1,2}/g;
/* ↑ 2026-10-16 加固：旧尺只认三段齐的 `eyJ.a.b`，而密钥门 verify-staged-secrets.mjs:169
   的 "JWT 段" 尺连**被 slice 截断成两段**的票都抓（实测判红的 exec-results.json:587 正是
   `body=${lg.text.slice(0,150)}` 把票腰斩的产物）。遮蔽必须 ≥ 门的尺，否则"已脱敏"是假绿。
   新尺 = eyJ + ≥8 位段 + 1~2 个续段，是旧尺的超集；纯整数 id / userId / band 串不含 eyJ 头，不受影响。 */
const SCRUB_BCRYPT = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{50,}/g;
export function scrubEvidence(s) {
  return String(s == null ? "" : s)
    .replace(SCRUB_TOKENISH, (m) => m.replace(/"[^"]{8,}"$/, '"****(len=masked)"'))
    .replace(SCRUB_JWT, (m) => m.slice(0, 6) + `****(len=${m.length})`)
    .replace(SCRUB_BCRYPT, (m) => m.slice(0, 7) + `…(len=${m.length})`);
}

export function bindKey(label, bindings) {
  for (const b of bindings || []) {
    // 只有显式 bound:true 才算绑定。实测过一个隐性形状：条目同时写 bound:false 与
    // manifest/id 时，旧实现照旧返回它 ⇒ 一条"声明不绑"的行照样买到覆盖。
    // 绑定文件本身没有校验器（一个存在但判据不对的 key 会静默生效），
    // 所以这里唯一能守的就是尊重声明。
    if (b && b.match && String(label).includes(b.match) && b.bound === true && b.manifest && b.id) return b;
  }
  return null;
}

/** items → 门可读的行。字段名逐条对照 r-exec-cli.mjs:895-914 的 row 构造；
 *  status 词表用生产者的 EXECUTED/FAILED/SKIPPED（JUDGED=/^(EXECUTED|FAILED|PASS)$/，
 *  unverified 记 SKIPPED ⇒ "仪表故障不算判过"在门的口径里天然成立）。 */
export function buildRows(items, meta, bindings) {
  return items.map((it, i) => {
    const b = bindKey(it.label, bindings);
    const manifest = b ? String(b.manifest) : "DEVICE-LEG";
    const id = b ? String(b.id) : "DL" + String(i + 1).padStart(2, "0");
    const status = it.tier === "pass" ? "EXECUTED" : it.tier === "fail" ? "FAILED" : "SKIPPED";
    return {
      suite: "C-" + manifest, manifest, id,
      page: it.page || (b && b.page) || "",
      tier: "critical",
      identity: meta.identity,
      band: meta.band,
      loginVerify: meta.loginVerify,
      sessionSource: meta.sessionSource,
      requiresReal: true,
      title: it.label.slice(0, 160),
      status,
      /* 行内 gitSha 是**出处旁证**那一轴（提交号；exec-frames-to-corpus.mjs:44-45 优先读行内、
         没有才退回文件头），与上一行 band 那一轴（mode@构建内容戳）是两把尺，互不替代。 */
      gitSha: meta.gitSha || "unknown",
      observed: it.tier === "pass" ? it.detail : "",
      missingEvidence: [],
      failureReason: it.tier === "fail" ? it.detail
        : it.tier === "unverified"
          ? "UNVERIFIED-INSTRUMENT（仪表/环境故障，不是产品判决）：" + it.detail
            + "（载体 scripts/qa/device-leg-tally.mjs；撤掉这条红的方式是修载具重跑，不是改判词）"
          : "",
      route: it.page || "",
      toast: "",
      console: "",
      evidence: "",
      durationMs: 0,
      transport: "cli",
      automationChannel: "cli",
    };
  });
}

/** 文件级头部镜像 r-exec-cli.mjs:1955 的终稿形状（门只读 results 行，头部是给下一轮人看的）。
 *  为什么不 import 那份头部：fileStampHeader()/stampMerged() 定义在 r-exec-cli.mjs:1121-1169，
 *  **没有 export**（仓内 test-exec-row-sha.cjs:36-48 只能用正则把源码抠出来 eval 就是同一件事的证据），
 *  它那十一格 bootId/rowShas/mergedFrom 说的是"一条会续跑的批次腿"的履历，设备腿一次跑完、没有续跑履历，
 *  照搬会把不存在的格子印成空数组。这里逐格对齐的是**门与旁路消费者真读的那几格**
 *  （gitSha/band/identity/identities/project/loginVerify/sessionSource/updatedAt/runner/results），
 *  并明写 gitSha 与 band 是两把不同的尺（提交号 vs 构建内容戳），免得下一轮又有人拿其中一枚当另一枚。 */
export function buildExecFile(rows, meta) {
  return {
    round: "round-7",
    gitSha: meta.gitSha,
    gitShaScope: meta.gitShaScope || "provenance-only（提交号，不参与覆盖率门的 band 匹配）",
    band: meta.band,
    bandSource: meta.bandSource || "",
    identity: meta.identity,
    identities: [...new Set(rows.map((r) => r.identity || "?"))],
    project: meta.project,
    loginVerify: meta.loginVerify,
    sessionSource: meta.sessionSource,
    updatedAt: new Date().toISOString(),
    runner: "scripts/verify-device-leg.mjs（设备腿判定，三档记账：pass/fail/unverified）",
    legNote: meta.legNote || "",
    totals: { pass: meta.totals.pass, fail: meta.totals.fail, unverified: meta.totals.unverified },
    results: rows,
  };
}

/** 结果台账（exec-results.json）的唯一序列化出口：buildExecFile + JSON.stringify 之后、
 *  落盘之前，整段文本再过一遍**同一个** scrubEvidence（单一遮蔽源，不自造第二套）。
 *  为什么在序列化后的全文上屏而不是只屏行字段：文件头（legNote/sessionSource 等）与
 *  行内 observed/failureReason 都可能被塞进票，写侧只留这一个出口才不会再出现
 *  "tally 屏了、落盘没屏"的那次事故（2026-10-16，exec-results.json:587 一枚活 JWT）。
 *  掩码形状 eyJ****(len=N) / ****(len=masked) 都待在原 JSON 字符串值内部，不引入裸引号，
 *  JSON.parse 仍成立 ⇒ 覆盖率门 execRows() 照常读行。序列化后的文本里嵌套引号已被转义成
 *  \"token\"，SCRUB_TOKENISH 的字面键名尺在这段上打不中——这是**已知限制**，
 *  兜住它的是值形状尺 SCRUB_JWT/SCRUB_BCRYPT（与密钥门的 JWT/bcrypt 形状探测同轴）。 */
export function renderExecFile(rows, meta) {
  return scrubEvidence(JSON.stringify(buildExecFile(rows, meta), null, 1));
}
