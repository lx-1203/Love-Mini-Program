#!/usr/bin/env node
/** 真实模式覆盖守恒：每一条 requiresReal 用例，必须至少被一条"档位=real"的执行腿**判过**（不是跳过），
 *  而且 ⑤ 要的双身份 ⇒ A 与 guest 两把身份各要有一条。
 *
 *  为什么单独一条门（2026-09-27）：执行器把 236 条 requiresReal 全记成 SKIPPED，
 *  而排队器与 queue-reconcile 数的是"这条用例有没有一行结果"——SKIPPED 也算一行，
 *  于是覆盖账看起来是满的。真实模式实际量为零。跳过原因那句"本切片只跑 mock 产物"
 *  在它自己那次运行里都不成立（它开的就是 real 档），更没人去核。
 *  这条门只认一个事实：**行上的 band 是不是 real，状态是不是"没被跳过"**。
 *
 *  执行通道免检轴（2026-09-28 补）：判据台自己盖过章「这条本通道做不了」的行
 *  （ops 用例上的声明字段 c.automatable === false），执行腿是被**禁止**去跑它们的——
 *  dc9f7297 让 r-exec-ws.mjs 对含这些行的名单整批拒跑（WSX_IDS_NOT_AUTOMATABLE）。
 *  一条门不能一边禁跑、一边又索要"你为什么不跑"的红：那样这些行永远凑不齐证据，
 *  门就永久红，永久红的门最后会被绕过去。所以这里给它们一个**单独的、计数的、点名的**
 *  桶：REALCOV_AUTOMATABLE_EXEMPT=n + 逐条 EXEMPT 明细。
 *  三条硬口径：① 只读判据台声明的 automatable 字段（与 r-exec-ws.mjs:611 同一个字段、
 *  同一个严格判等 === false），不从 prose、id 模式或硬编码名单反推；
 *  ② 豁免 ≠ 覆盖，免检行绝不并进 covered；
 *  ③ 剩余非免检的欠账照旧按原阈值（uncovered === 0 才绿）判红，一条不减。
 *
 *  合同的下半场（2026-09-28 补）：**没有 band 的行**过去落在这条门的暗面里——
 *  认领靠 /^real(@|$)/ 匹配 band，band 缺省成空串就永远匹配不上，于是"扫到了、一行也没认领"
 *  与"根本没扫到"两种形状在读数上一模一样。实测：round-8 那条 145 行、admissible=yes、
 *  outcome=measured 的 WS 波次（reports/audit/round-7/exec-ws-tap-r8，r-exec-ws.mjs 产的，
 *  行里根本没有 band 字段）进了 EXEC_ROWS=14678，却没让 COVERED 与 UNCOVERED 动过任何一格。
 *  漏字段的生产者不是"少了一格覆盖"，是**一整类证据对门不可见**，而门对此一声不吭。
 *  现在这一侧也闭环：REALCOV_BANDLESS_ROWS / _CASES 数出来、逐条点名、写清是哪几个目录。
 *  两条边界：① 只数"本门会去看的那些行"（key 命中 requiresReal 判据），其余目录的行不归这本账；
 *  ② 计数与点名**不改判红阈值**（ok 仍只看 uncovered 与守恒）——今天已有 4586 条合法 mock 行，
 *  把漏盖做成新的常红判点，正撞上面那句"永久红的门最后会被绕过去"。它是一条看得见的漏，
 *  不是一根新的狼牙棒。
 *
 *  认领的第二步（2026-09-28 补）：band 只是入场券，**分账按 identity 走两条轴**（:237-238）。
 *  一条 real 档、没带 identity 的行两边都不认，而旧门同样对此一声不吭——实测：round-8 那条 WS 波次
 *  加上 band 之后 COVERED 仍是 202→202，只有连 identity 一起加才 +5（.zcode/tmp/gap-band2/REPORT.md F1）。
 *  这一格与漏盖那格同构、不同轴：REALCOV_IDENTITYLESS_ROWS / _CASES / _SCANNED / _ON_REAL + 出处 + 点名，
 *  同样**不进 ok 的判据**。生产者一侧的对账读数在 r-exec-ws.mjs 的 WSX_IDENT_STAMP / WSX_FILE_IDENT /
 *  WSX_IDENT_UNSTAMPED / WSX_MIXED_IDENT / WSX_IDENT_DISAGREE。
 *
 *  认领的第三步（2026-09-28 补）：identity 只是**人给的标签**，不是证据。实测缺陷：
 *  cli-automator.mjs 的 mintToken 旧写法只分 "A" 与"不是 A"，非 A 一律 POST /auth/guest-login ⇒
 *  一条 `--identity B` 的腿铸到的是游客会话、行却盖 identity:"B"，而登录轴（:237）把 A/B 等量齐观 ⇒
 *  每一次"B 轴已判"都可能是游客穿着 B 的标签领了钱（这是假绿，不是假红）。
 *  现在行上带生产者实际写下的会话证据（loginVerify=store 实测串、sessionSource=这张票的铸票端点；
 *  生产者 r-exec-cli.mjs:181 与 r-exec-ws.mjs row() 第 12 入参），门按证据核对标签：
 *  · 证据与标签矛盾 ⇒ 该行不给它那条轴记账（REALCOV_SESSION_CONTRADICT_ROWS/_CASES，逐条点名 + 出处）；
 *  · 行上没有证据（本轮之前的全部历史行）⇒ 只数不撤（REALCOV_SESSION_UNPROVEN_ROWS/_CASES/_SCANNED）——
 *    撤了就是把每条老行判成红，正撞本文件上面那句"永久红的门最后会被绕过去"；
 *    但盘上所有 B / 历史读数从此都挂着"不可证"这个数，不许再当"已证"读。
 *  另一件只测不改的事：词表死活 REALCOV_IDENT_VOCAB（:237-238 收的 none / not-logged-in 今天有没有生产者），
 *  死词就报成死词，不为此新增任何拼法。
 *
 *  欠账点名（2026-09-29 补）：这条门一直**红得对、却红得没有署名**——
 *  uncovered 是个集合大小（new Set([...neverOnReal, ...noA, ...noGuest]).size），
 *  只印一个数。于是读红的人得自己反推"这 10 条里哪几条缺登录轴、哪几条缺游客轴、
 *  哪几条压根没在 real 档出现过"；一笔点不出名的红最后会被当成噪音划掉（这正是要消灭的失败模式）。
 *  本文件对另外几类欠（免检/漏盖/漏身份/证据不符）早就逐条点名了，欠账这一类是最后一只暗桶。
 *  现在补齐：REALCOV_UNCOVERED_LIST=n + 每行 `  UNCOVERED <suite>|<id> 缺=<轴>`
 *  （轴词表 never-on-real / login / guest，两轴同缺写 login+guest），排序=suite→id 固定 ⇒ diff 稳定。
 *  并且门对自己这本账下一条守恒断言：点名数必须等于 REALCOV_UNCOVERED，且每条点出来的都得是
 *  判据集里真实存在的用例；不闭合 ⇒ **以门自己的名字判红**（REALCOV_UNCOVERED_LEDGER=FAIL）。
 *  口径：判点一个字没动（下面 `const ok = uncovered === 0 && conserved;` 原样保留），
 *  台账只往退出口上叠一条**独立**的红——盘上正常时它恒真，读数与改前逐字相同。
 *
 *  用法：node scripts/qa/verify-real-coverage.mjs [--round round-7]
 *       [--ops reports/audit/round-6/ops] [--dir reports/audit/round-7] [--selftest]
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? argv1(i) : d; };
function argv1(i) { return process.argv[i + 1]; }
const ROUND = arg("round", "round-7");
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const DIR = resolve(REPO, arg("dir", "reports/audit/" + ROUND));

/** 权威用例集：ops 判据台里逐条点名 requiresReal 的那些（不从执行结果反推，
 *  否则"没跑 ⇒ 没行 ⇒ 不欠账"会自己把自己证明成满分）。 */
function requiredCases() {
  const out = [];
  if (!existsSync(OPS)) { console.log("REALCOV_RESULT=FAIL reason=判据台目录不存在 " + OPS); process.exit(2); }
  for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
    let j; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { continue; }
    const cases = j.cases || j.items || [];
    for (const c of cases) {
      if (c && c.requiresReal === true) {
        /* 身份适用范围（#51 由 tag-ops-identity-scope.mjs 落的 c.identities）也来自判据台：
           判据说"这条的前置是登录态"，那 guest 这一腿就无权认领 ⇒ 门不能再替它记账。
           口径只减不增：没标的照旧要求双身份，标了的按标的那几腿各要一条。 */
        const ids = Array.isArray(c.identities) ? c.identities.map(String).filter(Boolean) : [];
        /* 免检轴的唯一来源=判据台上声明的 c.automatable（原样带出，判等留在 judge 里做，
           这样"读的是声明字段"这件事在判定点上就可读）。notAutomatableFrom 是它的出处，
           只用于打印，不参与判定。 */
        out.push({
          manifest: (j.suite || f.replace(/\.json$/, "")),
          id: String(c.id || c.caseId || ""),
          page: j.page || c.page || "",
          identities: ids,
          automatable: c.automatable,
          notAutomatableFrom: typeof c.notAutomatableFrom === "string" ? c.notAutomatableFrom : "",
        });
      }
    }
  }
  return out.filter((c) => c.id);
}

function execRows() {
  const rows = [];
  if (!existsSync(DIR)) { console.log("REALCOV_RESULT=FAIL reason=本轮结果目录不存在 " + DIR); process.exit(2); }
  for (const d of readdirSync(DIR)) {
    const p = join(DIR, d, "exec-results.json");
    if (!d.startsWith("exec-") || !existsSync(p)) continue;
    let j; try { j = JSON.parse(readFileSync(p, "utf8")); } catch { console.log("REALCOV_SKIP_UNPARSEABLE " + d); continue; }
    /* dir 带着走：漏盖这件事必须能报到"是哪一条腿/哪个目录没盖"，否则计数没有下一步。
       loginVerify / sessionSource 是**行上的会话证据**（生产者：r-exec-cli.mjs:181、r-exec-ws.mjs 的 row() 第 12 入参
       → 同一对字段；文件级那份 loginVerify 早就有，见 r-exec-cli.mjs:387/737、r-exec-ws.mjs:561，但门只读 results 里的行）。
       老行没有这两个字段 ⇒ 读成空串 ⇒ 数成"不可证"，不据此撤认领（撤了就是把没盖证据的历史全判红）。 */
    for (const r of j.results || []) rows.push({
      key: r.manifest + "|" + r.id, band: String(r.band || ""), identity: String(r.identity || "?"),
      status: String(r.status || ""), dir: d,
      loginVerify: String(r.loginVerify == null ? "" : r.loginVerify),
      sessionSource: String(r.sessionSource == null ? "" : r.sessionSource),
    });
  }
  return rows;
}

/* 只有"判过"才算覆盖：EXECUTED / FAILED 是判过（哪怕判成红），SKIPPED 不是。
   把 SKIPPED 记成覆盖，正是本轮 236 条被吞掉的那条路径。 */
const JUDGED = /^(EXECUTED|FAILED|PASS)$/;
const REAL_BAND = /^real(@|$)/;

/* ---------- 身份声明 ↔ 可证会话（2026-09-28 补，本轮那条假记账的正面处理） ----------
   门的认领以前只看行上的 identity 标签（:237-238 那两轴），标签是**人给的旗标**，不是证据。
   实测缺陷：mintToken 旧写法只分 "A" 与"不是 A"，非 A 一律 POST /auth/guest-login
   （cli-automator.mjs 旧 :222-224）⇒ 一条 `--identity B` 的腿铸到的是游客会话、行却盖 identity:"B"，
   而登录轴把 A 与 B 等量齐观 ⇒ "B 轴已判"可以是游客穿着 B 的标签领了钱（假绿，不是假红）。
   现在行上多了两个生产者实际写下的事实（sessionSource=这张票到底从哪个端点铸的、loginVerify=store 实测串），
   这一格就把它们与标签对一次账。三条口径：
   ① 只读声明字段，不按 prose/id 模式反推，也不自创词表（词表就是 :237-238 那几条）；
   ② 证据**与标签矛盾** ⇒ 该行不给它那条轴记账（CONTRADICT 撤认领，这是本轮要修的假记账）；
   ③ 证据**缺失**（盘上历史行的形状）⇒ 数出来、点名，但不撤认领——否则每条老行都变成新红，
      正撞本文件上面那句"永久红的门最后会被绕过去"。历史那些 B 读数一律按"未证"处理（见输出）。 */
const LOGIN_IDS = ["A", "B"];
const GUEST_IDS = ["guest", "not-logged-in"];
/** 一行的会话证据判点：proven（证据支持标签）/ contradict（证据与标签矛盾）/ unproven（没证据可核）。 */
function sessionVerdict(r) {
  const src = String(r.sessionSource || "").trim();
  const ver = String(r.loginVerify || "").trim();
  const login = LOGIN_IDS.includes(r.identity);
  const guest = GUEST_IDS.includes(r.identity);
  if (!login && !guest) return "unproven";
  if (!src && !ver) return "unproven";
  const phoneMint = src === "phone-login";
  const guestMint = src === "guest-login" || src === "cleared";
  const logged = /^logged-in\b/.test(ver);
  const notLogged = /^not-logged-in\b/.test(ver);
  /* 半份证据（只有 source 没有 store 读数，或反之）不足以作证 ⇒ 不可证，不撤。 */
  if (!src || !ver) return "unproven";
  if (!(phoneMint || guestMint)) return "unproven";
  if (login) return phoneMint && logged ? "proven" : "contradict";
  /* 游客标签：清会话后量到未登录画面，或游客账号登录态（WS 腿那一支，本门照旧按游客轴认）。
     真账号（phone-login）的会话盖成游客标签同样是标签与证据不符。 */
  return guestMint && (notLogged || logged) ? "proven" : "contradict";
}
/* "这一行没声明身份"的判点：execRows 把缺失/空串统一读成 "?"（:97，与 r-exec-cli.mjs:692 的哨兵同一个数），
   所以这里同时收 absent、""、"?" 三种写法。反过来**不收**"声明了但门不认"的值（none、logged-in…）：
   那种行是"词表外的身份"，不是"没有身份"——两件事分开数，才不会把生产者的字段缺失与旗标写错混成同一格。 */
const isIdentityless = (v) => v === "" || v === "?" || v === undefined || v === null;

/* 一条判据"该由谁来判"，按 ops 的 identities 折算成两条轴（本门只有这两条轴）：
   登录侧 = A 或 B（这条门不区分账号，区分账号是台账的事）；游客侧 = guest/none。
   没标 identities ⇒ 两轴都要（⑤ 的双身份原口径，一条都不放松）。 */
function axesOf(identities) {
  const ids = (identities || []).map(String).filter(Boolean);
  if (!ids.length) return { login: true, guest: true };
  return { login: ids.some((x) => x === "A" || x === "B"), guest: ids.some((x) => x === "guest" || x === "none") };
}

function judge(rows, req, ids) {
  const byId = new Map();
  /* 漏盖计数（行轴，不是用例轴）：本门会去看、却读不出档位的行。
     只数 key 命中 requiresReal 判据的行——其它判据本来就不归这本账，数进来只会稀释信号。 */
  const bandless = { rows: 0, cases: new Map() };
  /* 身份漏盖（与 bandless 同一类、另一个轴）：档位只是入场券，认领按 identity 分两条轴做（:237-238）。
     行上没 identity ⇒ real 档也 +0（gap-band2 的 F1 实测：COVERED 202→202，补身份才 +5）。
     onReal 单列，因为"有档位、没身份"正是那条 145 行 WS 波次**修好 band 之后**的新形状：
     它看着像真实覆盖，实际两条轴都领不到钱，而旧门对此一声不吭。 */
  const identityless = { rows: 0, cases: new Map(), onReal: 0 };
  /* 会话证据对账（行轴读数，与 bandless/identityless 同一类：只数、只点名，不另立阈值）。
     proven=证据支持标签；unproven=行上没有可核的会话证据（盘上历史行的形状，照旧认领）；
     contradict=证据与标签矛盾 ⇒ **不给它那条轴记账**（本轮那条假记账唯一会被撤认领的形状）。 */
  const session = { proven: 0, unproven: { rows: 0, cases: new Map(), dirs: new Map() }, contradict: { rows: 0, cases: new Map(), dirs: new Map() } };
  for (const r of rows) {
    if (!ids.has(r.key)) continue;
    const rec = byId.get(r.key) || { real: new Set(), realJudged: new Set(), judgedAny: false, contradicted: new Set() };
    if (!r.band) {
      bandless.rows++;
      bandless.cases.set(r.key, (bandless.cases.get(r.key) || 0) + 1);
    }
    if (isIdentityless(r.identity)) {
      identityless.rows++;
      identityless.cases.set(r.key, (identityless.cases.get(r.key) || 0) + 1);
      if (REAL_BAND.test(r.band)) identityless.onReal++;
    }
    if (REAL_BAND.test(r.band)) {
      rec.real.add(r.identity);
      if (JUDGED.test(r.status)) {
        rec.judgedAny = true;
        const v = sessionVerdict(r);
        if (v === "contradict") {
          rec.contradicted.add(r.identity);
          session.contradict.rows++;
          session.contradict.cases.set(r.key, (session.contradict.cases.get(r.key) || 0) + 1);
          session.contradict.dirs.set(r.dir, (session.contradict.dirs.get(r.dir) || 0) + 1);
        } else {
          if (v === "proven") session.proven++;
          else {
            session.unproven.rows++;
            session.unproven.cases.set(r.key, (session.unproven.cases.get(r.key) || 0) + 1);
            session.unproven.dirs.set(r.dir, (session.unproven.dirs.get(r.dir) || 0) + 1);
          }
          rec.realJudged.add(r.identity);
        }
      }
    }
    byId.set(r.key, rec);
  }
  const missing = {
    neverOnReal: [], skippedOnly: {}, noGuest: [], noA: [], scopedGuestExempt: 0, scopedLoginExempt: 0,
    /* 免检桶与覆盖桶都是新增的、互斥的格子；下面三个旧判点（neverOnReal / noA / noGuest）
       以及 skippedOnly 的判据一个字没改，只是免检行不再进它们的路径。 */
    automatableExempt: [], covered: [],
    bandless, identityless, session,
  };
  for (const c of req) {
    const key = c.manifest + "|" + c.id;
    const ax = axesOf(c.identities);
    if (!ax.guest) missing.scopedGuestExempt++;
    if (!ax.login) missing.scopedLoginExempt++;
    /* 执行通道免检：判据台声明字段 c.automatable === false（严格判等，跟 r-exec-ws.mjs:611
       拒跑名单用的是同一个字段同一个条件；写成 "false" 字符串、0、null 都不算豁免）。
       放在身份轴读数之后，是为了让 REALCOV_IDENTITY_SCOPED 的两个数与加轴前完全可比。
       免检行单独点名，不进 covered ⇒ "本门不追"绝不被读成"量到了"。 */
    if (c.automatable === false) {
      const rec = byId.get(key);
      const hadRealRow = !!(rec && rec.real.size > 0);
      const judged = !!(rec && rec.realJudged.size > 0);
      /* allSkipped 问的是"有没有判过"，不是"判过的行有没有拿到认领"——证据矛盾而没被撤认领前
         也算判过，别把"证据不符"打成"全被跳过"（那是两种不同的欠，混起来下一步就找不到修法）。
         今天的盘上没有矛盾行 ⇒ 这个数与改前逐字相同。 */
      const judgedAtAll = !!(rec && rec.judgedAny);
      missing.automatableExempt.push({ key, from: c.notAutomatableFrom || "", hadRealRow, judged, allSkipped: hadRealRow && !judgedAtAll });
      continue;
    }
    const rec = byId.get(key);
    if (!rec || rec.real.size === 0) { missing.neverOnReal.push(key); continue; }
    const judgedLogin = rec.realJudged.has("A") || rec.realJudged.has("B");
    const judgedGuest = rec.realJudged.has("guest") || rec.realJudged.has("not-logged-in");
    let deficient = false;
    if (ax.login && !judgedLogin) { missing.noA.push(key); deficient = true; }
    if (ax.guest && !judgedGuest) { missing.noGuest.push(key); deficient = true; }
    /* "全被 SKIPPED"这一格只说跳过：判过但证据与标签矛盾的那些行不算 SKIPPED，
       它们已经通过 noA/noGuest 进了欠账（撤认领），这里再把它们说成"跳过"就是第二句假话。 */
    if (rec.realJudged.size === 0 && !rec.judgedAny) missing.skippedOnly[key] = [...rec.real];
    if (!deficient) missing.covered.push(key);
  }
  return missing;
}

/* ---------- 欠账台账：从一个数到一本账（2026-09-29 补） ----------
   输入就是算 uncovered 的那三个数组本身（neverOnReal / noA / noGuest），不另起判点 ⇒
   判红阈值一个字都没动；这里做的只有两件事：
   ① 把**同一个并集**逐行摊开、按轴归名（轴词表固定三条，输出顺序固定 suite→id）；
   ② 独立地把账再对一次自己：点名数 vs REALCOV_UNCOVERED、点出来的用例 vs 判据集。
   四条不变量（任何一条不成立 ⇒ 门以 REALCOV_UNCOVERED_LEDGER=FAIL 自己的名字判红）：
   ① 点名数 = 欠账数（漏点名或点重了都不闭合）；
   ② 每条点名的都得在判据集 ids 里（不许凭空多出一笔钱）；
   ③ 每条至少归上一根轴（不许有一笔欠账没有下一步）；
   ④ never-on-real 不与具体轴并存（judge 里那句 `continue` 保证了互斥，
      哪天重构把它拆了，这本账必须当场响）。
   排序按 UTF-16 码元序（不用 localeCompare）⇒ 跨平台、跨 locale 都逐字可复现。 */
const AXIS_NEVER = "never-on-real";
const AXIS_LOGIN = "login";
const AXIS_GUEST = "guest";
const AXIS_ORDER = [AXIS_NEVER, AXIS_LOGIN, AXIS_GUEST];
/** key 就是判据那一侧的 c.manifest + "|" + c.id（requiredCases 里的造法），按第一个 "|" 拆回去即逆运算。 */
function splitKey(k) { const i = k.indexOf("|"); return i < 0 ? [k, ""] : [k.slice(0, i), k.slice(i + 1)]; }
function buildUncoveredLedger(m, ids, uncovered) {
  const axes = new Map();
  const add = (k, ax) => { const s = axes.get(k) || new Set(); s.add(ax); axes.set(k, s); };
  for (const k of m.neverOnReal) add(k, AXIS_NEVER);
  for (const k of m.noA) add(k, AXIS_LOGIN);
  for (const k of m.noGuest) add(k, AXIS_GUEST);
  const axisOf = (k) => AXIS_ORDER.filter((a) => (axes.get(k) || new Set()).has(a)).join("+");
  const enumerated = [...axes.keys()].sort((a, b) => {
    const [sa, ia] = splitKey(a), [sb, ib] = splitKey(b);
    return sa < sb ? -1 : sa > sb ? 1 : ia < ib ? -1 : ia > ib ? 1 : 0;
  });
  const problems = [];
  if (enumerated.length !== uncovered) {
    problems.push(`点名 ${enumerated.length} 条 ≠ REALCOV_UNCOVERED=${uncovered} ⇒ 有欠账没被点名（或点重了），这条红不可信`);
  }
  const phantom = enumerated.filter((k) => !ids.has(k));
  if (phantom.length) problems.push(`点出 ${phantom.length} 条判据集里不存在的用例：${phantom.join(" ")} ⇒ 台账凭空多出一笔`);
  for (const k of enumerated) {
    const s = axes.get(k) || new Set();
    if (!s.size) problems.push(`${k} 一根轴都没归上 ⇒ 这笔欠账没有下一步`);
    if (s.has(AXIS_NEVER) && s.size > 1) problems.push(`${k} 同时写着 never-on-real 与具体轴 ⇒ judge 的互斥（continue）被破坏`);
  }
  return { enumerated, axisOf, uncovered, problems, ok: problems.length === 0 };
}

function selftest() {
  const req = [{ manifest: "M", id: "1" }, { manifest: "M", id: "2" }, { manifest: "M", id: "3" }];
  const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
  const cases = [
    { n: "两把身份都在 real 档判过⇒ 不欠", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "FAILED" }, { key: "M|2", band: "real@abc", identity: "not-logged-in", status: "FAILED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0 },
    { n: "只在 mock 档有行⇒ 三条全欠（本轮的真实形状）", rows: [{ key: "M|1", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "mock@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "mock@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
    { n: "real 档但全被 SKIPPED⇒ 仍算欠（跳过不等于覆盖）", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|2", band: "real@abc", identity: "A", status: "SKIPPED" }, { key: "M|3", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 3 },
    { n: "只有 A 判过、guest 缺⇒ 双身份口径下欠 3", rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 3 },
  ];
  let bad = 0;
  const reqOf = (c) => c.req || req;
  const extraReq = [{ manifest: "M", id: "1", identities: ["A", "B"] }];
  const extraIds = new Set(extraReq.map((c) => c.manifest + "|" + c.id));
  const cases2 = cases.concat([
    { n: "标了 A/B 且 A 在 real 档判过 ⇒ 游客轴不再记账（收窄≠免检，登录轴还在）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 0 },
    { n: "标了 A/B 但只有 guest 判过 ⇒ 仍算欠（identity 只减少认领者，不降低标准）", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 1 },
    { n: "标了 A/B 且全被 SKIPPED ⇒ 欠", req: extraReq, ids: extraIds, rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 1 },
    { n: "没标 identities 的同款行 ⇒ 维持双身份口径，游客缺就算欠", req: [{ manifest: "M", id: "1" }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 1 },
  ]);
  /* 免检轴自己的样本：方向必须两头都锁死——盖章的进免检桶且不许进 covered，
     没盖章的（含把 automatable 写成字符串的）照旧算欠。 */
  const ax3 = [
    { manifest: "M", id: "1", automatable: false, notAutomatableFrom: "cellplan-x.json" },
    { manifest: "M", id: "2", automatable: false },
    { manifest: "M", id: "3", automatable: false },
  ];
  const ax3Ids = new Set(ax3.map((c) => c.manifest + "|" + c.id));
  const cases3 = [
    { n: "盖章 automatable=false 且真档一行都没有⇒ 进免检桶，不算欠、也不算覆盖", req: ax3, ids: ax3Ids, rows: [{ key: "M|2", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@abc", identity: "guest", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0, wantExempt: 3, wantCovered: 0 },
    { n: "盖章但这条真档其实被判过⇒ 仍只进免检桶（豁免≠覆盖，不许给门添量）", req: [{ manifest: "M", id: "1", automatable: false }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@abc", identity: "guest", status: "EXECUTED" }], wantMissing: 0, wantExempt: 1, wantCovered: 0 },
    { n: "没盖章（automatable:true）⇒ 完全照旧，双身份缺 guest 就算欠", req: [{ manifest: "M", id: "1", automatable: true }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "EXECUTED" }], wantMissing: 1, wantExempt: 0, wantCovered: 0 },
    { n: "automatable 写成字符串 \"false\"⇒ 不算豁免（只认声明的布尔 false，防 prose 混进来）", req: [{ manifest: "M", id: "1", automatable: "false" }], ids: new Set(["M|1"]), rows: [{ key: "M|1", band: "real@abc", identity: "A", status: "SKIPPED" }], wantMissing: 1, wantExempt: 0, wantCovered: 0 },
    { n: "盖章一条 + 没盖章两条全欠⇒ 免检 1 欠 2，两桶互斥", req: [{ manifest: "M", id: "1", automatable: false }, { manifest: "M", id: "2" }, { manifest: "M", id: "3" }], ids: new Set(["M|1", "M|2", "M|3"]), rows: [], wantMissing: 2, wantExempt: 1, wantCovered: 0 },
  ];
  /* 下半场（漏盖 band）自己的样本：三个方向必须同时锁死——
     · 没 band 的行一条也不认领，且被数出来（这是 exec-ws-tap-r8 那 145 行的原形状）；
     · 同一批行盖上 real@ 就整批转成覆盖、漏盖归零（证明"隐身"的唯一成因就是缺字段）；
     · 合法 mock@ 行既不认领也不算漏盖（不许把 4586 条 mock 行报成新红）。 */
  const blCases = [
    { n: "行缺 band⇒ 一条不认领（判据全欠），且漏盖被逐条数出来",
      rows: [{ key: "M|1", band: "", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "", identity: "guest", status: "FAILED" }, { key: "M|3", band: "", identity: "not-logged-in", status: "FAILED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 6, wantBandlessCases: 3 },
    { n: "同一批行只补上 real@⇒ 三条全转覆盖、漏盖归零（缺字段是唯一致盲原因）",
      rows: [{ key: "M|1", band: "real@deadbeef", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "real@deadbeef", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "real@deadbeef", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "real@deadbeef", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "real@deadbeef", identity: "A", status: "FAILED" }, { key: "M|3", band: "real@deadbeef", identity: "not-logged-in", status: "FAILED" }],
      wantMissing: 0, wantExempt: 0, wantCovered: 3, wantBandlessRows: 0, wantBandlessCases: 0 },
    { n: "合法 mock@ 行⇒ 不算 real 覆盖、也不算漏盖（不许把 mock 波次报成新红）",
      rows: [{ key: "M|1", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|1", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" },
             { key: "M|2", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|2", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" },
             { key: "M|3", band: "mock@f1c7b96b", identity: "A", status: "EXECUTED" }, { key: "M|3", band: "mock@f1c7b96b", identity: "guest", status: "EXECUTED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 0, wantBandlessCases: 0 },
    { n: "real 档但身份不是 A/B/guest（缺 identity 字段的形状）⇒ 仍不算覆盖",
      rows: [{ key: "M|1", band: "real@deadbeef", identity: "?", status: "EXECUTED" }, { key: "M|2", band: "real@deadbeef", identity: "?", status: "EXECUTED" },
             { key: "M|3", band: "real@deadbeef", identity: "?", status: "EXECUTED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantBandlessRows: 0, wantBandlessCases: 0,
      /* 这一例的形状就是"有档位、没身份"（本轮 WS 腿修好 band 之后的样子）：
         它不但领不到钱，还得被数出来——否则这条门又回到"扫到了但一声不吭"。 */
      wantIdentlessRows: 3, wantIdentlessCases: 3, wantIdentlessOnReal: 3 },
  ];
  /* 认领第二步（身份漏盖）自己的样本：四个方向都要锁死——
     · real 档 + 没身份 ⇒ 两条轴都领不到，且逐行数出来（gap-band2 F1 的原形状，实测 +0）；
     · 同一批行只补身份 ⇒ 整批转覆盖、漏身份归零（证明"隐身"的另一个唯一致盲原因就是缺这个字段）；
     · 补了 A 但游客轴缺 ⇒ 照旧算欠，可这**不是**漏身份（声明了只是不够，两格不许混）；
     · 词表外的声明值（none / logged-in）⇒ 不认领、也不算漏身份；mock 档没身份 ⇒ 仍算漏身份。 */
  const rl = (key, identity, band) => ({ key, band: band || "real@deadbeef", identity, status: "EXECUTED" });
  const idCases = [
    { n: "real 档但整批没身份⇒ 两条轴都领不到（判据全欠），漏身份被逐条数出来",
      rows: [rl("M|1", "?"), rl("M|1", ""), rl("M|2", "?"), rl("M|2", ""), rl("M|3", "?"), rl("M|3", "")],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantIdentlessRows: 6, wantIdentlessCases: 3, wantIdentlessOnReal: 6 },
    { n: "同一批行只补上身份 A+guest⇒ 三条全转覆盖、漏身份归零（缺字段是第二个唯一致盲原因）",
      rows: [rl("M|1", "A"), rl("M|1", "guest"), rl("M|2", "A"), rl("M|2", "guest"), rl("M|3", "A"), rl("M|3", "guest")],
      wantMissing: 0, wantExempt: 0, wantCovered: 3, wantIdentlessRows: 0, wantIdentlessCases: 0 },
    { n: "补了 A 但游客轴缺⇒ 双身份口径下照旧欠 3，可这不算漏身份（声明了只是不够，两格不混）",
      rows: [rl("M|1", "A"), rl("M|2", "A"), rl("M|3", "A")],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantIdentlessRows: 0, wantIdentlessCases: 0 },
    { n: "声明了门不认的值（none/logged-in）⇒ 不认领，但也不数成漏身份（词表外≠没字段）",
      rows: [rl("M|1", "none"), rl("M|1", "logged-in"), rl("M|2", "none"), rl("M|2", "logged-in"), rl("M|3", "none"), rl("M|3", "logged-in")],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantIdentlessRows: 0, wantIdentlessCases: 0 },
    { n: "mock 档且没身份⇒ 欠账来自档位，漏身份仍如实数出来（字段缺失与档位无关，不许藏）",
      rows: [{ key: "M|1", band: "mock@f1c7b96b", identity: "?", status: "EXECUTED" }, { key: "M|2", band: "mock@f1c7b96b", identity: "?", status: "EXECUTED" }, { key: "M|3", band: "mock@f1c7b96b", identity: "?", status: "EXECUTED" }],
      wantMissing: 3, wantExempt: 0, wantCovered: 0, wantIdentlessRows: 3, wantIdentlessCases: 3, wantIdentlessOnReal: 0 },
    { n: "标了 A/B 的判据 + B 身份判过⇒ 登录轴认（B 与 A 等量齐观），漏身份=0", req: extraReq, ids: extraIds,
      rows: [rl("M|1", "B")], wantMissing: 0, wantExempt: 0, wantCovered: 1, wantIdentlessRows: 0, wantIdentlessCases: 0 },
  ];
  /* 会话证据对账自己的样本（本轮那条假记账）：五个方向都要锁死——
     · 标签 B + 游客票（缺陷原形状）⇒ 登录轴不认，且被数成"不符"；
     · 同一行换成 B 自己的 phone-login 票 ⇒ 登录轴认（修的是核对，不是把 B 身份一棍子打死）；
     · 标签 A + store 报未登录 ⇒ 不符；真账号会话盖游客标签 ⇒ 同样不符；
     · 游客轴：cleared/not-logged-in 的行只进游客轴，不给登录轴领钱；
     · 老行没有会话证据（盘上历史形状）⇒ 照旧认领，但必须数成"不可证"（不许悄悄撤认领，也不许假装证过）。 */
  const sm = (key, identity, source, verify, band) => ({ key, band: band || "real@deadbeef", identity, status: "EXECUTED", sessionSource: source, loginVerify: verify });
  const sessReq = [{ manifest: "M", id: "1", identities: ["A", "B"] }];
  const sessIds = new Set(["M|1"]);
  const guestReq = [{ manifest: "M", id: "1", identities: ["guest", "none"] }];
  const sessCases = [
    { n: "标签 B 而票是 guest-login 铸的（本轮缺陷原形状）⇒ 登录轴不认，判据仍欠，数成「不符」",
      req: sessReq, ids: sessIds, rows: [sm("M|1", "B", "guest-login", "logged-in userId=100151")],
      wantMissing: 1, wantExempt: 0, wantCovered: 0, wantContradictRows: 1, wantUnprovenRows: 0, wantProven: 0 },
    { n: "同一行换成 B 自己的 phone-login 票 + store 实测 logged-in ⇒ 登录轴认（B 身份没有被一棍子打死）",
      req: sessReq, ids: sessIds, rows: [sm("M|1", "B", "phone-login", "logged-in userId=100159")],
      wantMissing: 0, wantExempt: 0, wantCovered: 1, wantContradictRows: 0, wantProven: 1 },
    { n: "标签 A 而 store 报 not-logged-in ⇒ 不符，登录轴不认",
      req: sessReq, ids: sessIds, rows: [sm("M|1", "A", "phone-login", "not-logged-in")],
      wantMissing: 1, wantContradictRows: 1, wantProven: 0 },
    { n: "游客标签盖真账号（phone-login）票 ⇒ 不符，游客轴也不给领（游客账要游客会话）",
      req: guestReq, ids: new Set(["M|1"]), rows: [sm("M|1", "guest", "phone-login", "logged-in userId=100158")],
      wantMissing: 1, wantContradictRows: 1, wantProven: 0 },
    { n: "游客标签 + 清会话 + not-logged-in ⇒ 只进游客轴（登录轴一条也不认）",
      req: guestReq, ids: new Set(["M|1"]), rows: [sm("M|1", "guest", "cleared", "not-logged-in")],
      wantMissing: 0, wantExempt: 0, wantCovered: 1, wantProven: 1, wantContradictRows: 0 },
    { n: "老行没有任何会话证据（盘上历史形状）⇒ 照旧认领，但数成「不可证」，一条也不许假装证过",
      req: [{ manifest: "M", id: "1" }], ids: new Set(["M|1"]),
      rows: [{ key: "M|1", band: "real@deadbeef", identity: "A", status: "EXECUTED", dir: "exec-old-leg" },
             { key: "M|1", band: "real@deadbeef", identity: "guest", status: "EXECUTED", dir: "exec-old-leg" }],
      wantMissing: 0, wantExempt: 0, wantCovered: 1, wantProven: 0, wantUnprovenRows: 2, wantUnprovenCases: 1 },
    { n: "半份证据（只有铸票端点、没有 store 读数）⇒ 算不可证不算证过（证据不齐不能盖章）",
      req: sessReq, ids: sessIds, rows: [sm("M|1", "B", "phone-login", "")],
      wantMissing: 0, wantCovered: 1, wantUnprovenRows: 1, wantProven: 0 },
  ];
  for (const c of cases2.concat(cases3, blCases, idCases, sessCases)) {
    const R = reqOf(c);
    const m = judge(c.rows, R, c.ids || ids);
    const got = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
    if (got !== c.wantMissing) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} got=${got} want=${c.wantMissing}`); }
    const ge = m.automatableExempt.length, gc = m.covered.length;
    if (c.wantExempt !== undefined && ge !== c.wantExempt) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} exempt=${ge} want=${c.wantExempt}`); }
    if (c.wantCovered !== undefined && gc !== c.wantCovered) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} covered=${gc} want=${c.wantCovered}`); }
    /* 漏盖计数：行数与命中判据数两头都要对上，缺一项就报不出来。 */
    if (c.wantBandlessRows !== undefined && m.bandless.rows !== c.wantBandlessRows) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏盖行=${m.bandless.rows} want=${c.wantBandlessRows}`); }
    if (c.wantBandlessCases !== undefined && m.bandless.cases.size !== c.wantBandlessCases) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏盖判据=${m.bandless.cases.size} want=${c.wantBandlessCases}`); }
    /* 漏身份计数：与漏盖同构（行数 / 命中判据数 / 其中档位已是 real 的条数）。 */
    if (c.wantIdentlessRows !== undefined && m.identityless.rows !== c.wantIdentlessRows) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏身份行=${m.identityless.rows} want=${c.wantIdentlessRows}`); }
    if (c.wantIdentlessCases !== undefined && m.identityless.cases.size !== c.wantIdentlessCases) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 漏身份判据=${m.identityless.cases.size} want=${c.wantIdentlessCases}`); }
    if (c.wantIdentlessOnReal !== undefined && m.identityless.onReal !== c.wantIdentlessOnReal) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 其中 real 档=${m.identityless.onReal} want=${c.wantIdentlessOnReal}`); }
    /* 会话对账计数：撤认领（不符）与只数不撤（不可证/证过）必须分开对上，混一格就看不出下一步怎么修。 */
    if (c.wantContradictRows !== undefined && m.session.contradict.rows !== c.wantContradictRows) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 不符行=${m.session.contradict.rows} want=${c.wantContradictRows}`); }
    if (c.wantContradictCases !== undefined && m.session.contradict.cases.size !== c.wantContradictCases) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 不符判据=${m.session.contradict.cases.size} want=${c.wantContradictCases}`); }
    if (c.wantUnprovenRows !== undefined && m.session.unproven.rows !== c.wantUnprovenRows) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 不可证行=${m.session.unproven.rows} want=${c.wantUnprovenRows}`); }
    if (c.wantUnprovenCases !== undefined && m.session.unproven.cases.size !== c.wantUnprovenCases) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 不可证判据=${m.session.unproven.cases.size} want=${c.wantUnprovenCases}`); }
    if (c.wantProven !== undefined && m.session.proven !== c.wantProven) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 已证行=${m.session.proven} want=${c.wantProven}`); }
    /* 守恒在每个样本上都得成立：免检 + 覆盖 + 欠账 = 用例条数，一个都不许凭空消失或重复计。
       漏盖与漏身份都是**行轴**的读数，不参与这条等式（同一行既可能被认领也可能同时被数成漏盖/漏身份）。 */
    if (ge + gc + got !== R.length) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 守恒 ${ge}+${gc}+${got}≠${R.length}`); }
    /* 台账守恒也在每个样本上跑一遍：上面每一例的形状（漏盖/漏身份/矛盾/免检/双轴缺…）都必须
       既点得出名、又与 uncovered 对得上。这一步只读不改判点，样本本身就是它的输入。 */
    {
      const L = buildUncoveredLedger(m, c.ids || ids, got);
      if (L.enumerated.length !== got) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 台账点名=${L.enumerated.length}≠欠账=${got}`); }
      if (!L.ok) { bad++; console.log(`  REALCOV_SAMPLE_BAD ${c.n} 台账不闭合 ${L.problems.join("；")}`); }
    }
  }
  /* 台账自己的负样本：这一格咬的是"门自己的账"，不是欠账阈值 ⇒ 它必须**能**响，
     否则"点名数 = 欠账数"就只是一句印在纸上的话。四个方向都要锁死：
     · 正常并集（含两轴同缺只点一次名、轴名固定 login+guest、顺序固定 suite→id）⇒ 闭合；
     · 欠账数比点名多一条（点名漏了）⇒ 必须响；
     · 点出一条判据集里不存在的用例（凭空多钱）⇒ 必须响；
     · never-on-real 与具体轴写在同一行（judge 那句 continue 被人拆掉的形状）⇒ 必须响。 */
  const lgIds = new Set(["M|1", "M|2", "M|3"]);
  const lg = (neverOnReal, noA, noGuest, u) => buildUncoveredLedger({ neverOnReal, noA, noGuest }, lgIds, u);
  const lgCases = [
    { n: "三条各缺一根轴⇒ 点名 3、轴名逐条对、台账闭合", L: lg(["M|1"], ["M|2"], ["M|3"], 3), wantLen: 3, wantOk: true,
      wantAxes: { "M|1": AXIS_NEVER, "M|2": AXIS_LOGIN, "M|3": AXIS_GUEST } },
    { n: "同一行两轴都缺⇒ 只点一次名、轴名 login+guest、台账仍闭合", L: lg([], ["M|1", "M|2"], ["M|1"], 2), wantLen: 2, wantOk: true,
      wantAxes: { "M|1": AXIS_LOGIN + "+" + AXIS_GUEST, "M|2": AXIS_LOGIN } },
    { n: "欠账数比点名多一条⇒ 台账必须响（漏点名=这条红不可信）", L: lg(["M|1", "M|2"], [], [], 3), wantLen: 2, wantOk: false },
    { n: "点出判据集里没有的用例⇒ 台账必须响（凭空多出一笔）", L: lg(["M|9"], [], [], 1), wantLen: 1, wantOk: false },
    { n: "never-on-real 与具体轴同一行⇒ 台账必须响（互斥被破坏）", L: lg(["M|1"], ["M|1"], [], 1), wantLen: 1, wantOk: false },
    { n: "零欠账⇒ 点名 0 条且闭合（绿的时候这本账也得是空的、自洽的）", L: lg([], [], [], 0), wantLen: 0, wantOk: true },
  ];
  for (const c of lgCases) {
    const L = c.L;
    if (L.enumerated.length !== c.wantLen) { bad++; console.log(`  REALCOV_SAMPLE_BAD 台账 ${c.n} 点名=${L.enumerated.length} want=${c.wantLen}`); }
    if (L.ok !== c.wantOk) { bad++; console.log(`  REALCOV_SAMPLE_BAD 台账 ${c.n} 闭合=${L.ok ? "OK" : "FAIL"} want=${c.wantOk ? "OK" : "FAIL"}`); }
    for (const k of Object.keys(c.wantAxes || {})) {
      if (L.axisOf(k) !== c.wantAxes[k]) { bad++; console.log(`  REALCOV_SAMPLE_BAD 台账 ${c.n} ${k} 轴=${L.axisOf(k) || "(空)"} want=${c.wantAxes[k]}`); }
    }
    /* 排序确定性：点名序列必须逐字等于 suite→id 的码元序（同一输入两次运行不许换顺序）。 */
    const sorted = [...L.enumerated].sort();
    if (sorted.join(" ") !== L.enumerated.join(" ")) { bad++; console.log(`  REALCOV_SAMPLE_BAD 台账 ${c.n} 顺序不稳 ${L.enumerated.join(" ")}`); }
  }
  const lgTotal = lgCases.length;
  console.log(`REALCOV_SELFTEST=${bad === 0 ? "PASS" : "FAIL"} cases=${cases2.length + cases3.length + blCases.length + idCases.length + sessCases.length + lgTotal} bad=${bad} 台账负样本=${lgTotal}`);
  process.exit(bad === 0 ? 0 : 1);
}
if (process.argv.includes("--selftest")) selftest();

const req = requiredCases();
if (!req.length) { console.log("REALCOV_RESULT=FAIL reason=判据台里一条 requiresReal 都没抓到 ⇒ 判点空转，不认绿"); process.exit(2); }
const ids = new Set(req.map((c) => c.manifest + "|" + c.id));
const rows = execRows();
const m = judge(rows, req, ids);
console.log(`REALCOV_CASES=${req.length} EXEC_ROWS=${rows.length} 结果目录=${DIR.replace(REPO + "/", "")}`);
console.log(`REALCOV_NEVER_ON_REAL=${m.neverOnReal.length} REAL_BAND_BUT_ALL_SKIPPED=${Object.keys(m.skippedOnly).length} JUDGED_MISSING_A=${m.noA.length} JUDGED_MISSING_GUEST=${m.noGuest.length}`);
console.log(`REALCOV_IDENTITY_SCOPED 游客轴豁免=${m.scopedGuestExempt} 登录轴豁免=${m.scopedLoginExempt}（来源=ops 用例上的 c.identities，载体 tag-ops-identity-scope.mjs；豁免只减认领者，不减判据）`);
const exemptN = m.automatableExempt.length;
const exemptSkipped = m.automatableExempt.filter((e) => e.allSkipped).length;
console.log(`REALCOV_AUTOMATABLE_EXEMPT=${exemptN}（其中 real 档有行但全被 SKIPPED=${exemptSkipped}）来源=ops 用例声明字段 c.automatable===false（严格判等，与 r-exec-ws.mjs:611 拒跑名单同一字段同一条件；载具 dc9f7297 WSX_IDS_NOT_AUTOMATABLE）⇒ 执行腿被禁止跑的行，本门不再索要"跑过"的证据；豁免≠覆盖，REALCOV_COVERED 不含它们。`);
const EXEMPT_PRINT = 40;
for (const e of m.automatableExempt.slice(0, EXEMPT_PRINT)) {
  console.log(`  EXEMPT ${e.key} 出处=${e.from || "(判据台未记 notAutomatableFrom)"} real档=${e.hadRealRow ? (e.judged ? "有行且判过" : "有行但全 SKIPPED") : "无行"}`);
}
if (exemptN > EXEMPT_PRINT) console.log(`  EXEMPT …另 ${exemptN - EXEMPT_PRINT} 条未逐条点名（总数已计入上面 ${"REALCOV_AUTOMATABLE_EXEMPT"}）`);
for (const k of m.neverOnReal.slice(0, 6)) console.log("  NEVER_ON_REAL " + k);
for (const k of m.noA.slice(0, 6)) console.log("  NO_A_JUDGED " + k);
for (const k of m.noGuest.slice(0, 6)) console.log("  NO_GUEST_JUDGED " + k);
const uncovered = new Set([...m.neverOnReal, ...m.noA, ...m.noGuest]).size;
const coveredN = m.covered.length;
/* 下半场（漏盖 band 的行）：认领靠 band，读不出 band 的行就是"扫到了但一条也认领不了"。
   以前这一格是空的——门不吭声，整类证据（backend 字段没有门对应物那一类）就此隐身。
   口径：① rows 数的是本门真会去看的那些行（key 命中 requiresReal），② 同时给全扫描的漏盖数与
   所属目录，③ **不进 ok 的判据**（今天 4586 条合法 mock 行都带 band，漏盖只可能来自忘盖的生产者；
   把它做成常红判点，就重犯了上面注释里"永久红的门最后会被绕过去"那条错）。 */
const bandlessAll = rows.filter((r) => !r.band);
const inIdsRows = rows.filter((r) => ids.has(r.key));
const bl = m.bandless;
const blDir = new Map();
for (const r of bandlessAll) blDir.set(r.dir, (blDir.get(r.dir) || 0) + 1);
console.log(`REALCOV_BANDLESS_ROWS=${bl.rows}（在本门会看的 ${inIdsRows.length} 行里）REALCOV_BANDLESS_CASES=${bl.cases.size} REALCOV_BANDLESS_SCANNED=${bandlessAll.length}／${rows.length} 全扫描行`);
if (bandlessAll.length) {
  console.log(`  BANDLESS 出处 ${[...blDir].map(([d, n]) => d + "=" + n).join(" ")}（这些行的 band 字段缺失 ⇒ 无论档位是 mock 还是 real，本门一律无法认领；盖法见 r-exec-cli.mjs:176 与 r-exec-ws.mjs 的 mkRow/BAND_STR，格式 mode@sha8，判点即上面的 REAL_BAND）`);
  const BL_PRINT = 12;
  for (const [k, n] of [...bl.cases].sort((a, b) => b[1] - a[1]).slice(0, BL_PRINT)) console.log(`  BANDLESS ${k} 漏盖行=${n}`);
  if (bl.cases.size > BL_PRINT) console.log(`  BANDLESS …另 ${bl.cases.size - BL_PRINT} 条判据未逐条点名（总数已计入 REALCOV_BANDLESS_CASES）`);
  console.log(`  BANDLESS_HINT 这不是欠账新增（欠账仍按 real 档的行算），是生产者的字段缺失；修法是让那条腿盖上 band 再重跑，别把 mock 行改成 real 来"补数"`);
}
/* 身份这一侧的账（2026-09-28 补，与上面漏盖 band 同构、不同轴）：
   认领分两步——先用 band 认出"这是真档跑的"，再用 identity 分到"哪条身份轴"（:237-238）。
   第一步的漏盖已经被上面那格接住了，第二步的漏盖以前还是暗面：一条 real 档、没有 identity 的行
   会进 rec.real（集合里多个 "?"），两条轴都不认，于是"扫到了、判过了、一条钱也领不到"与
   "根本没跑"在读数上 again 长得一样。gap-band2 的 F1 就是这么量出来的：同一批行加 band +0、
   再加 identity 才 +5。口径与漏盖那格逐条对齐：只数本门会看的行、给出处、逐条点名、
   **不进 ok 的判据**（盘上今天有 145 行没身份，把它做成常红判点就重犯"永久红的门会被绕过去"）。 */
const idlessAll = rows.filter((r) => isIdentityless(r.identity));
const idl = m.identityless;
const idlDir = new Map();
for (const r of idlessAll) idlDir.set(r.dir, (idlDir.get(r.dir) || 0) + 1);
console.log(`REALCOV_IDENTITYLESS_ROWS=${idl.rows}（在本门会看的 ${inIdsRows.length} 行里）REALCOV_IDENTITYLESS_CASES=${idl.cases.size} REALCOV_IDENTITYLESS_ON_REAL=${idl.onReal}（其中档位已是 real、只差身份的）REALCOV_IDENTITYLESS_SCANNED=${idlessAll.length}／${rows.length} 全扫描行`);
if (idlessAll.length) {
  console.log(`  IDENTITYLESS 出处 ${[...idlDir].map(([d, n]) => d + "=" + n).join(" ")}（这些行的 identity 字段缺失或读成 "?" ⇒ 门的登录轴 A/B 与游客轴 guest/not-logged-in 都不认它，哪怕 band=real@…；盖法见 r-exec-cli.mjs:176 与 r-exec-ws.mjs 的 mkRow/IDENTITY，判点即上面的 :237-238）`);
  const IL_PRINT = 12;
  for (const [k, n] of [...idl.cases].sort((a, b) => b[1] - a[1]).slice(0, IL_PRINT)) console.log(`  IDENTITYLESS ${k} 漏身份行=${n}`);
  if (idl.cases.size > IL_PRINT) console.log(`  IDENTITYLESS …另 ${idl.cases.size - IL_PRINT} 条判据未逐条点名（总数已计入 REALCOV_IDENTITYLESS_CASES）`);
  console.log(`  IDENTITYLESS_HINT 这也不是欠账新增（欠账仍按 real 档+身份的行算），是生产者的字段缺失；修法是让那条腿带上 --identity 再重跑。` +
    (idl.onReal ? ` 注意别用"把 identity 随手改成 A"来补数：游客腿的行盖成 A 会去领登录轴的钱，那是伪造。` : ""));
}
/* 身份声明 ↔ 可证会话（2026-09-28 补，本轮那条假记账的正面读数）。
   读的字段是生产者实际写下的两个事实，不是标签的另一种写法：
   · 行级 loginVerify / sessionSource —— 生产者 r-exec-cli.mjs:181（row()）、
     r-exec-ws.mjs 的 row() 第 12 入参（经 mkRow 注入 SESSION）；
   · 文件级 loginVerify 早就有（r-exec-cli.mjs flush()/终稿、r-exec-ws.mjs flush()），
     但本门只读 results 里的行（execRows），文件级那个数对认领从来没有说过话。
   两个桶的语义差别就是"要不要撤认领"：
   · 不符(CONTRADICT)=证据与标签矛盾 ⇒ **不给它那条轴记账**（于是直接进欠账，本轮要修的就是这一格）；
   · 不可证(UNPROVEN)=行上没有可核的会话证据（本轮之前的所有历史行）⇒ 认领照旧、但必须数出来点名。
     历史那些 identity:"B" 的读数全落在这一格里 ⇒ 一律按"未证"看待，要 B 的证据得重跑带 B 凭据的那条腿。
   两格都不进 ok 的判据（与漏盖/漏身份同一口径），但 CONTRADICT 通过撤认领改变欠账——
   它不是一根新的常红狼牙棒：修好 mintToken 之后生产不出这种行，出现就是真出事。 */
const sVerdictAll = { proven: 0, unproven: 0, contradict: 0 };
const sAll = rows.filter((r) => {
  if (!REAL_BAND.test(r.band) || !JUDGED.test(r.status)) return false;
  const ok = LOGIN_IDS.includes(r.identity) || GUEST_IDS.includes(r.identity);
  if (ok) sVerdictAll[sessionVerdict(r)]++;
  return ok;
});
console.log(`REALCOV_SESSION_PROVEN=${m.session.proven} REALCOV_SESSION_UNPROVEN_ROWS=${m.session.unproven.rows}（在本门会看的 ${inIdsRows.length} 行里）REALCOV_SESSION_UNPROVEN_CASES=${m.session.unproven.cases.size} REALCOV_SESSION_CONTRADICT_ROWS=${m.session.contradict.rows} REALCOV_SESSION_CONTRADICT_CASES=${m.session.contradict.cases.size} REALCOV_SESSION_SCANNED=${sAll.length}／${rows.length} 全扫描行（其中 证过=${sVerdictAll.proven} 不可证=${sVerdictAll.unproven} 不符=${sVerdictAll.contradict}）`);
console.log(`  SESSION 口径 「identity 声明与可证会话不符/不可证」：不符=行上的 sessionSource/loginVerify 与 identity 矛盾（例：identity=B 而票是 /auth/guest-login 铸的），这种行**不再领它那条轴的钱**，欠账因此增加——这就是本轮那条假记账（--identity B 的腿铸游客票、盖 B 的标签、门按登录轴认）从此量得到的形状；不可证=行上没有会话字段，认领照旧，只数不撤。`);
if (m.session.contradict.rows) {
  console.log(`  CONTRADICT 出处 ${[...m.session.contradict.dirs].map(([d, n]) => d + "=" + n).join(" ")}（这些行的标签与它实际拿到的会话不是同一个身份 ⇒ 别改标签补数，重跑那条腿：A 用 tmp/r11_chains2.py 的凭据、B 用 scripts/qa/r-exec.cjs:IDENT_DEFS.B 的凭据、游客用清会话，见 cli-automator.mjs 的 mintPlanFor/assertIdentityProducible）`);
  const SC_PRINT = 12;
  for (const [k, n] of [...m.session.contradict.cases].sort((a, b) => b[1] - a[1]).slice(0, SC_PRINT)) console.log(`  CONTRADICT ${k} 矛盾行=${n}`);
  if (m.session.contradict.cases.size > SC_PRINT) console.log(`  CONTRADICT …另 ${m.session.contradict.cases.size - SC_PRINT} 条判据未逐条点名（总数已计入 REALCOV_SESSION_CONTRADICT_CASES）`);
}
/* 词表死活（只测只报，**不新增拼法**）：门的认领词表是 A/B（登录轴，:237）与 guest/not-logged-in
   （游客轴，:238）。实测今天盘上有没有行真的写着 not-logged-in / none：没有生产者就是死词，
   死词留着不害人（兼容旧形状），但再给它加一个别名就是把"身份"变成又一层没人核对的自由文本。 */
const identHist = new Map();
for (const r of rows) identHist.set(r.identity, (identHist.get(r.identity) || 0) + 1);
const VOCAB = ["A", "B", "guest", "not-logged-in", "none"];
console.log(`REALCOV_IDENT_VOCAB ${VOCAB.map((v) => v + "=" + (identHist.get(v) || 0)).join(" ")}（全扫描 ${rows.length} 行里各拼法实际出现次数）`
  + " ⇒ not-logged-in 有判点(:238)无生产者=死词；none 既不被两轴认领、旗标词表里却有(r-exec-cli.mjs --identity guest|none)⇒ 也是死词。本门不为此新增任何拼法。");
console.log(`REALCOV_COVERED=${coveredN}`);console.log(`REALCOV_UNCOVERED=${uncovered}／${req.length}（阈值同旧：非免检欠账 =0 才绿）`);
/* 欠账点名（2026-09-29）：把上面那个数摊开成一行一条，缺哪根轴写哪根轴。
   没有上限（不许"另 N 条未点名"）——一条点不出名的欠账就无法派活，而一本必须对得上数的账
   才允许被红。轴词表与判点的两条轴一一对应：
   · never-on-real = real 档一行都没有（要么跑错档要么没跑）；
   · login         = 有 real 档的行，但登录轴（A/B）一条都没判过；
   · guest         = 有 real 档的行，但游客轴（guest/not-logged-in）一条都没判过。 */
const ledger = buildUncoveredLedger(m, ids, uncovered);
console.log(`REALCOV_UNCOVERED_LIST=${ledger.enumerated.length}（逐条点名，排序=suite→id；轴词表 ${AXIS_ORDER.join("|")}，两轴同缺写 ${AXIS_LOGIN}+${AXIS_GUEST}；本数必须等于 REALCOV_UNCOVERED）`);
if (ledger.enumerated.length) {
  console.log(`  UNCOVERED 轴口径 never-on-real=real 档一行都没有；login=登录轴 A/B 无判过的行；guest=游客轴无判过的行 ⇒ 缺哪根轴去补哪条腿，别改标签、别把 mock 行改成 real 来"补数"`);
  for (const k of ledger.enumerated) console.log(`  UNCOVERED ${k} 缺=${ledger.axisOf(k)}`);
}
const sum = exemptN + coveredN + uncovered;
const conserved = sum === req.length;
console.log(`REALCOV_CONSERVATION=${conserved ? "OK" : "FAIL"} 免检=${exemptN} + 覆盖=${coveredN} + 欠账=${uncovered} = ${sum}／${req.length}`);
if (!conserved) console.log(`  CONSERVATION_FAIL 差=${req.length - sum} ⇒ 有用例没被「免检/覆盖/欠账」任一格接住（或有重复计），这笔账不可信，门直接判红`);
const ok = uncovered === 0 && conserved;
/* 台账守恒（门对自己那本账的断言，2026-09-29 补）：点名数与欠账数对不上、或点出了判据集外的用例
   ⇒ **以门自己的名字判红**。上面那行 ok 一个字节没改（判点仍是"欠账 =0 且守恒"），
   这里只往退出口叠一条独立的红：ledgerOk 恒真时 REALCOV_RESULT 与改前逐字相同，
   它响起来只有一个原因——这本账自己算错了，那比欠账更该先修。 */
const ledgerOk = ledger.ok;
console.log(`REALCOV_UNCOVERED_LEDGER=${ledgerOk ? "OK" : "FAIL"} 点名=${ledger.enumerated.length} 欠账=${uncovered} 判据外=${ledger.enumerated.filter((k) => !ids.has(k)).length}（台账守恒断言：点名逐行摊开后必须等于 REALCOV_UNCOVERED，且每条都在判据集里）`);
for (const p of ledger.problems) console.log(`  UNCOVERED_LEDGER_BAD ${p}`);
const pass = ok && ledgerOk;
console.log(`REALCOV_RESULT=${pass ? "PASS" : "FAIL"}（真实模式覆盖守恒：跳过不算量到，单身份不算双身份；免检只免"本门不追"，不降阈值）`
  + (ledgerOk ? "" : " ← 这一格的红是本门台账不闭合（REALCOV_UNCOVERED_LEDGER=FAIL），不是欠账新增，先修点名再谈欠账"));
process.exit(pass ? 0 : 1);
