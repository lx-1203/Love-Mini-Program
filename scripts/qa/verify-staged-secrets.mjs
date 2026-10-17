#!/usr/bin/env node
/** 暂存区密钥外泄门 —— 读的是**已经进索引的那份内容**，不是工作树。
 *
 *  为什么要有：`.gitignore:31-32`（`.env.bak*`、`*.cmd.bak*`）只是"看不见"，不是"不许提交"。
 *  本仓工作流按关注点逐个 pathspec `git add`，所以一个写错的路径或者一发 `git add -f`
 *  就能把轮换备份件重新洗进版本库 —— 实测 `.env.bak-20261014-rot` 正是这样漏过
 *  `.gitignore:24`（字面 `.env`）与 `:157`（字面 `*.bak`）两道规则的。屏蔽规则拦不住
 *  强制添加，只有读索引的门拦得住。
 *
 *  用法：node scripts/qa/verify-staged-secrets.mjs [--against <ref>] [--json <outpath>]
 *        默认判"当前暂存集"；--against <ref> 判 `git diff --cached <ref>`（索引 vs 该 ref）。
 *        除此之外没有别的旗标：未知旗标 = 判不动 = exit 2，不猜。
 *  机器行：STAGEDSECRETS_RESULT=PASS|FAIL|NOT-EVIDENCED paths=N findings=N staged=N（<最吃重的理由，≤100 字>）
 *    paths= 是【路径屏命中数】，findings= 是全部判点，staged= 才是被检的暂存/基线文件数。
 *    三个数以前混过：paths=0 曾被读成「索引为空」，其实它是「没命中」。
 *  退出码：0 干净（含"索引为空"这种合法干净）；1 有红线判点；2 门自己没跑成
 *          （git 不在 PATH / 不是仓库 / ref 解析不到 / diff 读不出 / diff 非空却解析不出文件头）。
 *          本仓规矩：量不到的东西必须响亮地失败，不许空转判绿。
 *
 *  两道屏：
 *   1) 路径屏（凭据载体形状）：.env 家族 / .bak / .cmd / .bat / start-local.bat /
 *      application*.yml / flyway.user.toml / id_rsa|.pem|.key。
 *      模板件豁免：`*.example`（含 `.env.example`）—— 本仓的 `.env.example` 就是给人抄的。
 *      硬/软的分法（这是本门唯一需要判断的地方，理由写在这）：
 *        硬红 = 这次提交**新引入**的载体（索引里有、基线里没有）。轮换备份件全属这类。
 *        软提示 = 基线里**早已跟踪**的载体（application*.yml 4 个、*.bak* 证据件 28 个、
 *                 .cmd/.bat 启动件若干）被改动。本仓把它们当交付物，每次改动都必进提交；
 *                 若也一律硬红，这道门会永久红 —— 永久红的门等于没有门（它教下一程去关它）。
 *                 这些件由**内容屏**兜底：往里贴真凭据一样红。
 *        `.env` 家族与私钥材料（id_rsa/​.pem/​.key）不看软硬，一律硬红。
 *   2) 内容屏（只读 + 侧的新增行，即这次真正要进库的字节）：
 *      键名正则只负责"找到疑似赋值"，定罪看**值的形状**，不看键名出现在散文/getenv 里。
 *      值白名单（判为非凭据）：空值、`${…}`、`%VAR%`、`$VAR`、`!VAR!`、`process.env.X`/
 *      `System.getenv(...)`/`getenv(...)`、裸标识符引用、changeme/placeholder/`<…>`/`****`
 *      这类占位。散文（去掉行尾注释后仍是多个空格分开的词且没引号）不判红。
 *      与键名无关的形状探测器独立生效：bcrypt `$2a$/$2b$/$2y$`、JWT `eyJ….….`、PEM 私钥头。
 *
 *  腿产物屏（2026-10-16 裁定，见 PATH_RULES 里 "腿产物" 那一族）：**设备腿的输出件一律不许进版本库**。
 *      为什么必须在仪器里做：覆盖门 scripts/qa/verify-real-coverage.mjs:161-162 只认
 *      "`exec-` 开头的目录 + 里面有 exec-results.json" 这个形状才给读数 ⇒ 带票的那份正是下一程
 *      "必须 git add"的那一件。这类件每轮现生成、目录名带时间戳或新腿名，所以"新引入"永远成立。
 *      硬/软落在哪一侧（实测 git ls-files 定的，不是拍脑袋）：
 *        · `exec-results.json` 家族：库里**已跟踪 82 份**（round-1/2/6/7 共 71、ui-audit-2026-10-09 共 11）
 *          ⇒ 走既有"新引入才硬红"，改历史件是软提示、由内容屏兜底。若一律硬红：① 门永久红（永久红的门等于没有门）；
 *            ② 更要命的是它会把"把这 82 份从库里撤出去"的 `git rm --cached` 一起判红 —— 撤红挡住了裁定要的迁移。
 *        · `reports/audit/device-leg-<时间戳>/` 整目录：实测盘上 18 个目录、**0 个文件被跟踪** ⇒ 今天任何一次 staging 都是硬红。
 *        · `reports/audit/round-N/exec-N/` 下的 png 帧：实测 0 张被跟踪（`exec-guest-real-guard-r10` 有 5 张，
 *          正被 `.gitignore:80` 的 png 规则屏着看不见）⇒ 同样硬红。
 *      三条都按"新引入 = 硬红"的既有制度写（alwaysHard=false），因为**屏不掉的才是制度**：恒红那一侧只留给
 *      `.env` 家族、私钥材料、`prestate*.sql` 这类"根本不该进库、脱敏即作废"的件。
 *
 *  输出纪律：任何一行只印 `path:line + 掩码值`（`$2b$10$…`、`eyJ****(len=)`、`KEY=****(len=)`），
 *  绝不回显原文；--json 侧车同样只落掩码值（默认 6 hex 截断指纹用于跨轮去重）。
 *  只读：不写工作树（除 --json 指定的侧车），不 add、不 commit、不碰索引。
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ---------- 参数：只认 --against / --json，其余一律 exit 2 ---------- */
const argv = process.argv.slice(2);
function parseArgs(a) {
  const opt = { against: null, json: null, bad: [] };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--against") { opt.against = a[++i] ?? ""; if (!opt.against) opt.bad.push("--against 缺值"); }
    else if (t === "--json") { opt.json = a[++i] ?? ""; if (!opt.json) opt.bad.push("--json 缺值"); }
    else opt.bad.push(t);
  }
  return opt;
}

/* ---------- git 读数：统一压低配置差异，否则解析会因客户端 config 而误绿 ---------- */
const GIT_FLAT = ["-c", "core.quotePath=false", "-c", "diff.noprefix=false", "-c", "diff.renames=false"];
function git(args, { allowFail = false } = {}) {
  try {
    return { ok: true, out: execFileSync("git", [...GIT_FLAT, ...args], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    if (allowFail) return { ok: false, out: typeof e.stdout === "string" ? e.stdout : "", err: String(e.message || e) };
    throw e;
  }
}

/* ---------- 路径屏 ---------- */
const PATH_RULES = [
  [/(^|\/)\.env(\.|$)/, ".env 家族", true],
  [/\.bak/, "备份件", false],
  [/\.cmd$/, ".cmd 启动件", false],
  [/\.bat$/, ".bat 启动件", false],
  [/start-local\.bat$/, "start-local.bat", false],
  [/application[^/]*\.yml$/, "Spring 配置", false],
  [/flyway\.user\.toml$/, "flyway 凭据", false],
  [/id_rsa|\.pem$|\.key$/, "私钥材料", true],
  // ── 腿产物族（2026-10-16 裁定：设备腿输出件一律不入库；口径与硬/软的选择写在文件头"腿产物屏"一段）──
  // 覆盖门 verify-real-coverage.mjs:161-162 只认领 exec-*/exec-results.json 这个形状，所以它是"下一程最可能被
  // git add 的那一件"。库内已跟踪 82 份 ⇒ 按既有制度只判"新引入"为硬红（改历史件走软提示，由内容屏兜底），
  // 这样既不永久红，也不把撤库的 `git rm --cached` 一起挡掉。
  [/(^|\/)exec-results(\.rejected)?\.json$/, "腿结果台账（覆盖门唯一认领形状）", false],
  // 设备腿输出目录整族：盘上 18 个目录、0 个被跟踪，内含 verdict.txt / simulator-network.log / 8 张帧图。
  // 放在 verdict.txt 那两条之前，让"整目录"这个更具体的名头先命中（两条判据方向一致，只是标签更准）。
  [/(^|\/)reports\/audit\/device-leg-[^/]*\//, "设备腿输出目录（票与帧同目录载体）", false],
  // 腿帧图：实测 .gitignore:80 的 `*.png` 只是看不见，`git add -f` 一发就进库；库里 0 张被跟踪 ⇒ 新引入即硬红。
  [/(^|\/)reports\/audit\/round-[^/]*\/exec-[^/]*\/.*\.png$/, "腿帧图（ignore 屏不住 -f）", false],
  // 实测 2026-10-16：设备腿产物里混着活会话票——8 份 verdict.txt 各 1 条 JWT、
  // 14 份 simulator-network.log 各 6~23 条（Authorization 头流水），全都没被跟踪，
  // 一次 `git add reports/` 就带进库。这两类是"判决载体 + 附带票"，
  // 按既有制度只判"新引入"为红：已跟踪的历史件改一行判决仍要提交，不能变常红。
  [/(^|\/)verdict\.txt$/, "腿判决件（含会话票）", false],
  [/(^|\/)simulator-network\.log$/, "设备网络流水（含会话票）", false],
  // 库表恢复件不一样：它的价值就在字节精确，脱敏即作废，所以它根本不该进库 ⇒ 恒红。
  [/prestate.*\.sql$/, "库表恢复件（含口令散列与手机号）", true],
];
const TEMPLATE_OK = /\.example$/i;

/** @returns {{hit:boolean, hard:boolean, reason:string}} hard=false 表示"基线已跟踪的载体改动"（软提示） */
export function checkPath(p, inHead) {
  if (TEMPLATE_OK.test(p)) return { hit: false, hard: false, reason: "" };
  for (const [re, label, alwaysHard] of PATH_RULES) {
    if (re.test(p)) return { hit: true, hard: alwaysHard || !inHead(p), reason: `${label}${alwaysHard ? "" : "（新引入）"}` };
  }
  return { hit: false, hard: false, reason: "" };
}

/* ---------- 值分类：定罪看形状，不看键名 ---------- */
const PLACEHOLDER = /^(?:[\s"'`]*(?:change[-_ ]?me\d*|changeme|changeit|placeholder|placeholder[_-]?\w*|your[_-]?(?:secret|password|token|key|api[_-]?key)[\w-]*|xxx+|x{3,}|\*{3,}|-+|\.+|n\/?a|na|none|null|nil|undefined|true|false|0|1|2|stub|sample|example|dummy|todo|fixme|redacted|masked|secret|password|passw0rd|admin|123456|test|demo|required|optional|set[_-]?me|_)[\s"'`]*)$/i;
const REF_VALUE = [
  /^\$\{[^}]*\}$/,                 /* Spring/shell ${JWT_SECRET:default} */
  /^\$[{A-Za-z_][A-Za-z0-9_]*.*$/,  /* $VAR / ${VAR} */
  /^%[A-Za-z_][A-Za-z0-9_]*%$/,     /* cmd %JWT_SECRET% */
  /^![A-Za-z_][A-Za-z0-9_]*!$/,     /* cmd delayed expansion */
  /^\$[{]?[A-Za-z_][A-Za-z0-9_]*[}]?$/,
  /^[A-Z][A-Z0-9_]{2,}$/,           /* 裸标识符引用 FOO_BAR */
  /^(?:process\.env|os\.(?:environ|getenv)|System\.getenv|getenv|GetEnvironmentVariable|ENV|env|ctx\.env|import\.meta\.env)(?:\.|\[|\(|\b)/i,
  /^\{\{.*\}\}$/,                   /* helm/ansible 模板 */
  /^<.*>$/,                         /* <填你的密钥> */
];
function looksLikeRef(v) { return REF_VALUE.some((re) => re.test(v)); }
/* 值里出现代码标记 ⇒ 这是"从别处取来的表达式"，不是外泄的字面凭据。
   base64/JWT 合法含 / + = . - _，但不含 \ ( ) [ ] ; ` => —— 用这组分界判"代码 vs 凭据"。
   实测教训：scripts/qa/probe-*.mjs 的 `const password = /"password"\s*:\s*"([^"]+)"/.exec(s)[1];`
   是取值代码，早期版本把它当凭据判红（键名命中 + 值无空格 + 够长），这种红会把真判点埋掉。 */
const CODE_VALUE = /[[\]();`\\]|=>|&&|\|\||\b(?:function|await|new|return|require|import)\b|\.(?:exec|match|test|split|replace|then|map|filter|join|trim)\s*\(/;
/* 代码文件里的"裸标识符赋值"（camelCase 变量、this.x、res.token）是把别处的值转手，
   不是外泄字面凭据。只在 .js/.ts/.java/.vue/.py… 里生效，且**不加引号**时才豁免：
   .env / .yml / .cmd 这些配置载体里 camelCase 值照样判红（真实弱口令常长成 mySecretToken）。
   实测教训：scripts/verify-device-leg.mjs:306 `TOKEN_MINTED = loginToken;` 早期被判红。 */
const CODE_LANG = /\.(?:mjs|cjs|js|ts|jsx|tsx|vue|java|kt|go|rs|py|rb|php|scala|swift)$/i;
const BARE_IDENT_REF = /^(?:[a-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+|[a-z_$][a-z0-9_$]*[A-Z][A-Za-z0-9_$]*|this(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+)$/;
/* 代码文件里"纯字母数字标识符"的未加引号值（X = token;）也是转手，不是字面凭据：
   真凭据几乎必带符号/混合大小写，弱口令类的纯字母词已被占位符表拦掉。
   只在 codeLang 且未加引号时生效 ⇒ .env/.yml/.cmd 里 password=abcdefgh 仍判红。 */
const CODE_IDENT_VALUE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** 把 `=` 右侧归一化：去行尾注释、去包裹引号，判断它是不是"要外泄的那段值"。
 *  @returns {{verdict:'red'|'ok', why:string, value:string}} */
export function classifyValue(rawRight, opts = {}) {
  let s = String(rawRight ?? "");
  const hashCut = s.match(/\s+#(?:\s|$)/) || s.match(/^#/);
  let comment = "";
  if (hashCut) { const i = s.search(/\s+#(?:\s|$)/) >= 0 ? s.search(/\s+#(?:\s|$)/) : 0; comment = s.slice(i); s = s.slice(0, i < 0 ? s.length : i); }
  s = s.trim().replace(/[,;]\s*$/, "").replace(/\\+$/, "").trim();
  if (!s) return { verdict: "ok", why: "空值", value: "" };
  const m = s.match(/^(['"])(.*)\1$/s);
  let value = m ? m[2] : s;
  if (!value) return { verdict: "ok", why: "空串", value: "" };
  /* 代码文件一行可并两式（`X = tok; Y = !!z;`）：只取第一条语句作值，
     否则"行内剩余内容"会被当成值 —— 既漏真凭据，又把变量引用误判成字面量。 */
  if (!m && opts.codeLang && /[;\n]/.test(value)) value = value.split(/[;\n]/)[0].trim();
  if (!value) return { verdict: "ok", why: "空串", value: "" };
  if (looksLikeRef(value)) return { verdict: "ok", why: "变量引用", value };
  if (PLACEHOLDER.test(value)) return { verdict: "ok", why: "占位符", value };
  /* 散文：未加引号 + 去注释后仍是多个空格分开的词 ⇒ 这是解释，不是赋值 */
  if (!m && /\s/.test(value)) return { verdict: "ok", why: "散文/多词值", value };
  if (value.length < 4) return { verdict: "ok", why: "过短", value };
  if (CODE_VALUE.test(value)) return { verdict: "ok", why: "代码表达式（值是从别处取来的）", value };
  /* 行首一元运算符 ⇒ 取反/位运算表达式（`TOKEN_MINTED = !!token;` 实测被判过红）：
     只锚行首，`R0t3d!9` 这种"含 !"的真口令照样命中。 */
  if (!m && /^[!~]/.test(value)) return { verdict: "ok", why: "一元运算符表达式", value };
  if (!m && opts.codeLang && (BARE_IDENT_REF.test(value) || CODE_IDENT_VALUE.test(value))) return { verdict: "ok", why: "代码里的变量引用", value };
  /* 本仓是中文仓：未加引号且含中日韩字符的值是"给人看的说明"，不是凭据。
     （代价：有人真拿整句中文当口令会被放过 —— 形状探测器仍会抓 bcrypt/JWT/PEM） */
  if (!m && /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/.test(value)) return { verdict: "ok", why: "中文说明文字", value };
  void comment;
  return { verdict: "red", why: m ? "引号包裹的字面值" : "字面赋值", value };
}

/* ---------- 形状探测（与键名无关） ---------- */
const SHAPES = [
  [/["']?\$2[aby]\$\d{2}\$[./A-Za-z0-9]{10,}/, "bcrypt 哈希"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, "JWT 三段"],
  [/\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{12,}\b/, "JWT 段"],
  [/-----BEGIN (?:[A-Z ]*)?PRIVATE KEY-----/, "PEM 私钥"],
  /* 厂商前缀 = 一眼可判的真密钥。这条即使在 *.example 模板件里也生效，
     否则"把生产 key 贴进 .env.example 当注释"就成了豁免的后门。 */
  [/\b(?:sk-(?:live|prod|secret)-[A-Za-z0-9]{12,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|AIza[0-9A-Za-z_-]{30,})/, "厂商密钥前缀"],
];
const KEY_ASSIGN = /\b([A-Za-z0-9_.$-]*(?:JWT_SECRET|_PASSWORD|_AES_SECRET|_API_KEY|API_KEY|ACCESS_KEY|SECRET|TOKEN)[A-Za-z0-9_]*|(?:"|')?(?:password|passwd|api[_-]?key|access[_-]?key|client[_-]?secret|auth[_-]?token|bearer[_-]?token|private[_-]?key)(?:"|')?)\s*[=:]\s*(.+)$/;

/** 扫一行"要进库的内容"。opts.template=true 时豁免"按键名的赋值"判点（模板件天生要写
 *  KEY=<填这里>），但形状探测器照常生效：往 .env.example 里贴真 bcrypt/JWT 一样红。 */
export function scanLine(line, opts = {}) {
  const shapes = [];
  for (const [re, label] of SHAPES) {
    const m = line.match(re);
    if (m) shapes.push({ kind: "shape", rule: label, key: "", value: m[0].replace(/^["']/, "") });
  }
  /* 同一条 JWT 会被"三段"和"段"两条形状各命中一次：只留最长的那条，否则 findings 会翻倍 */
  const kept = shapes.reduce((acc, x) => {
    const i = acc.findIndex((y) => y.value.includes(x.value) || x.value.includes(y.value));
    if (i < 0) return [...acc, x];
    return x.value.length > acc[i].value.length ? acc.map((y, j) => (j === i ? x : y)) : acc;
  }, []);
  const out = [...kept];
  if (opts.template) return out;
  const km = line.match(KEY_ASSIGN);
  if (km) {
    const c = classifyValue(km[2], { codeLang: CODE_LANG.test(opts.path || "") });
    if (c.verdict === "red") out.push({ kind: "assign", rule: "字面赋值", key: km[1], value: c.value });
  }
  /* 同一行已命中更具体的形状 ⇒ 不再重复记一条键名赋值 */
  if (out.some((x) => x.kind === "shape")) return out.filter((x) => x.kind === "shape");
  return out;
}

/* ---------- 掩码：绝不回显原文。bcrypt 只留算法+cost，JWT/PEM 只留格式头 ---------- */
export function mask(v) {
  const s = String(v ?? "");
  if (!s) return '""';
  if (/^\$2[aby]\$/.test(s)) return `${s.slice(0, 7)}…(len=${s.length})`;
  if (/^-----BEGIN/.test(s)) return "-----BEGIN …PRIVATE KEY-----";
  if (/^eyJ/.test(s)) return `eyJ****(len=${s.length})`;
  return `****(len=${s.length})`;
}
function fp6(v) {
  try { return createHash("sha256").update(String(v)).digest("hex").slice(0, 6); }
  catch { return ""; }
}

/* ---------- unified diff 解析（只取 + 侧新增行） ---------- */
export function parseDiff(text) {
  const files = new Map(); /* path -> {lines:[{n, text}], binary:boolean} */
  const lines = String(text).split(/\r?\n/);
  let cur = null, newN = 0, sawFileHeader = false;
  for (const ln of lines) {
    const dm = ln.match(/^diff --git a\/(.*?) b\/(.*)$/);
    if (dm) { cur = { path: dm[2].replace(/\s+$/, ""), lines: [], binary: false }; files.set(cur.path, cur); sawFileHeader = true; newN = 0; continue; }
    if (!cur) continue;
    const hm = ln.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hm) { newN = parseInt(hm[1], 10) || 0; continue; }
    if (/^(index|similarity|rename|new file|deleted file|--- |\+\+\+ |Binary files)/.test(ln)) {
      if (/^Binary files/.test(ln)) cur.binary = true;
      continue;
    }
    if (ln.startsWith("+")) { cur.lines.push({ n: newN, text: ln.slice(1) }); newN++; continue; }
    if (ln.startsWith("-")) continue;
    if (ln.startsWith(" ") || ln === "") newN++;
  }
  return { files, sawFileHeader };
}

/* ---------- 主流程 ---------- */
async function main() {
  const t0 = Date.now();
  const opt = parseArgs(argv);
  const die = [];        /* 红线判点（决定 exit 1） */
  const soft = [];       /* 软提示（不决定退出码，但必须印出来） */
  const broken = [];     /* 门跑不成的原因（决定 exit 2） */
  const screened = [];

  if (opt.bad.length) {
    console.log(`STAGEDSECRETS_RESULT=FAIL paths=0 findings=0（不支持的旗标：${opt.bad.join(" ").slice(0, 60)}，本门只吃 --against/--json）`);
    return 2;
  }

  /* 0) 能不能跑 */
  let isRepo = false;
  try { isRepo = git(["rev-parse", "--git-dir"]).ok; } catch (e) { broken.push("git 不可用：" + String(e.message || e).slice(0, 60)); }
  if (!isRepo && !broken.length) broken.push("当前目录不是 git 仓库");
  if (broken.length) return verdict({ die, soft, screened, broken, opt, t0 });

  const base = opt.against || "HEAD";
  if (opt.against) {
    const v = git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`], { allowFail: true });
    if (!v.ok || !v.out.trim()) broken.push(`--against 的 ref 解析不到：${String(base).slice(0, 40)}`);
  }

  /* 1) 索引 vs 基线 */
  const nameArgs = opt.against ? ["diff", "--cached", "--name-only", base] : ["diff", "--cached", "--name-only"];
  const bodyArgs = opt.against ? ["diff", "--cached", "-U0", "--no-ext-diff", "--no-textconv", base] : ["diff", "--cached", "-U0", "--no-ext-diff", "--no-textconv"];
  const nameRes = git(nameArgs, { allowFail: true });
  const bodyRes = git(bodyArgs, { allowFail: true });
  if (!nameRes.ok) broken.push("git diff --cached --name-only 读不出");
  if (!bodyRes.ok) broken.push("git diff --cached -U0 读不出");
  if (broken.length) return verdict({ die, soft, screened, broken, opt, t0, started: true });

  const paths = String(nameRes.out).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const { files, sawFileHeader } = parseDiff(bodyRes.out);
  /* 空索引是合法干净；非空 diff 却解析不出文件头 = 解析空转 = 量不到 */
  if (String(bodyRes.out).trim() && !sawFileHeader) {
    broken.push(`diff 有 ${String(bodyRes.out).length} 字节却解析不出任何文件头 ⇒ 解析空转，不拿"没判到"当清白`);
  }
  if (paths.length && files.size === 0 && String(bodyRes.out).trim()) {
    broken.push("name-only 有路径但 hunk 侧一个文件都没解析到 ⇒ 两屏口径不一致");
  }

  /* 基线里是否已跟踪（区分"新引入载体"与"改动既有载体"） */
  const headHasCache = new Map();
  const inHead = (p) => {
    if (headHasCache.has(p)) return headHasCache.get(p);
    let r = false;
    try { r = git(["cat-file", "-e", `${base}:./${p}`], { allowFail: true }).ok; } catch { r = false; }
    headHasCache.set(p, r);
    return r;
  };

  /* 2) 路径屏 */
  for (const p of paths) {
    const c = checkPath(p, inHead);
    if (!c.hit) continue;
    screened.push(p);
    const rec = { path: p, line: 0, kind: "path", rule: c.reason, key: "", masked: "" };
    if (c.hard) die.push(rec);
    else soft.push(rec);
  }

  /* 3) 内容屏（只读 + 侧） */
  const skipContent = new Set(die.filter((d) => d.kind === "path").map((d) => d.path));
  let binaryFiles = 0;
  for (const [p, f] of files) {
    if (f.binary) binaryFiles++;
    if (skipContent.has(p)) continue; /* 路径已硬红，不必再逐行点名（避免把备份件的值抄满屏） */
    const tpl = TEMPLATE_OK.test(p);
    for (const l of f.lines) {
      for (const hit of scanLine(l.text, { template: tpl, path: p })) {
        const rec = { path: p, line: l.n, kind: hit.kind, rule: hit.rule, key: hit.key, masked: mask(hit.value), len: hit.value.length, fp6: fp6(hit.value) };
        die.push(rec);
      }
    }
  }

  return verdict({ die, soft, screened, broken, opt, t0, started: true, binaryFiles, stagedN: paths.length, mode: opt.against ? `--against ${base}` : "staged" });
}

/* ---------- 收口 ---------- */
function verdict({ die, soft, screened, broken, opt, t0, started = false, binaryFiles = 0, stagedN = -1, mode = "staged" }) {
  const pathsN = new Set(die.filter((d) => d.kind === "path").map((d) => d.path)).size;
  const contentN = die.length - pathsN;
  const reasonFor = (d) => (d.kind === "path" ? `${d.path} ${d.rule}` : `${d.path}:${d.line} ${d.rule}${d.key ? ` ${d.key}=${d.masked}` : ` ${d.masked}`}`);
  const first = die.length ? reasonFor(die.slice().sort((a, b) => (a.kind === "path" ? 0 : 1) - (b.kind === "path" ? 0 : 1))[0]) : "";

  for (const d of die.slice(0, 40)) console.log(`HIT ${reasonFor(d)}`);
  if (die.length > 40) console.log(`HIT …另有 ${die.length - 40} 条，见 --json 侧车`);
  for (const s of soft.slice(0, 15)) console.log(`SOFT ${s.path}（基线已跟踪的凭据载体被改动 ⇒ 由内容屏兜底；本次未命中字面值）`);
  if (soft.length > 15) console.log(`SOFT …另有 ${soft.length - 15} 条`);
  if (binaryFiles) console.log(`NOTE 二进制 hunk ${binaryFiles} 个读不了内容（.jks/.p12/图片），这类只受路径屏约束`);

  let code, status, note;
  if (broken.length) {
    code = 2; status = "FAIL";
    note = `门未跑成：${broken[0].slice(0, 90)}`;
    for (const b of broken) console.log("BROKEN " + b);
  } else if (die.length) {
    code = 1; status = "FAIL";
    note = `${mode} 有 ${die.length} 条凭据判点：${first}`.slice(0, 100);
  } else if (started && die.length === 0 && mode === "staged" && stagedN === 0) {
    /* 空索引不是「干净」，是「一个文件都没检」。扫描集为空 ⇒ 响亮地退 2，
       别让一轮没跑内容的预检在总报告里长成一道绿。 */
    code = 2; status = "NOT-EVIDENCED";
    note = `staged=0 ⇒ 索引为空，本门这一趟没有判点可产（不是清白）；要真筛就 --against <ref> 或直接暂存后要提交的文件`;
  } else {
    code = 0; status = "PASS";
    note = started
      ? `${mode} 检了 ${stagedN} 个文件、无凭据判点${soft.length ? `，软提示 ${soft.length}` : ""}${screened.length ? `，路径屏命中 ${screened.length}` : ""}`.slice(0, 100)
      : `起步即失败：${broken[0] || "未起步"}`.slice(0, 100);
  }

  if (opt.json) {
    const side = {
      tool: "verify-staged-secrets.mjs", at: new Date().toISOString(), mode, against: opt.against || "(index vs HEAD)",
      result: status, exit: code, pathScreenHits: pathsN, contentFindings: contentN, findings: die.length, soft: soft.length, staged: stagedN,
      reason: note, binaryFiles,
      hits: die.map((d) => ({ path: d.path, line: d.line, kind: d.kind, rule: d.rule, key: d.key || null, masked: d.masked || null, len: d.len ?? null, fp6: d.fp6 || null })),
      softPaths: soft.map((s) => s.path), broken,
    };
    try {
      const out = resolve(REPO, opt.json);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(side, null, 2) + "\n", "utf8");
      console.log(`SIDECAR ${opt.json}`);
    } catch (e) { console.log("SIDECAR_WRITE_FAILED " + String(e.message).slice(0, 60)); }
  }

  console.log(`STAGEDSECRETS_RESULT=${status} paths=${pathsN} findings=${die.length} staged=${stagedN}（${note}） 耗时=${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return code;
}

const isMain = process.argv[1] && resolve(process.argv[1]).replace(/\\/g, "/") === fileURLToPath(import.meta.url).replace(/\\/g, "/");
if (isMain) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.log("BROKEN 抛出异常：" + String(e && e.message || e).slice(0, 120));
    console.log(`STAGEDSECRETS_RESULT=FAIL paths=0 findings=0（门自身抛错，不拿"没判到"当清白）`);
    process.exit(2);
  });
}
