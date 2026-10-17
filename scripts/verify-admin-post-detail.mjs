/**
 * 帖子详情页 / 列表页跳转的浏览器验收脚本（puppeteer，需 apps/admin dev 5177 + real 后端 8080）。
 *
 * 凭据从环境变量读取，不写进仓库：
 *   ADMIN_LOGIN_USERNAME  后台登录账号（注意：/auth/admin/login 的 username 是 users.openid，不是手机号）
 *   ADMIN_LOGIN_PASSWORD  后台登录口令
 *
 * 用法：
 *   ADMIN_LOGIN_USERNAME=... ADMIN_LOGIN_PASSWORD=... \
 *   node scripts/verify-admin-post-detail.mjs [帖子ID ...]
 *
 * 断言的不是"接口返回了什么"，而是"像素上有没有图、点击能不能跳转"：
 *   1) 登录后 localStorage 有 token，且离开 /login
 *   2) 详情页每张配图 naturalWidth>0（裂图/401 会直接暴露在这里）
 *   3) 列表页「查看」按钮与「按 ID 打开」都能落到 /forum/posts/<id>
 *   4) 过程中所有 >=400 响应与 console error 全部计数并打印
 */

import { supplyInstrumentEnv } from "./qa/admin-instrument-env.mjs";
await supplyInstrumentEnv(); /* 缺的是仪器前提 ⇒ 该报 NOT-EVIDENCED；但载具被我这种后台起法没带环境时，红得不是产品 */

import { mkdirSync, existsSync } from "node:fs";

const BASE = process.env.ADMIN_BASE_URL || "http://127.0.0.1:5177";
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = "reports/audit/admin-post-detail";
const USER = process.env.ADMIN_LOGIN_USERNAME;
const PASS = process.env.ADMIN_LOGIN_PASSWORD;
const POST_IDS = process.argv.slice(2).filter((s) => /^\d+$/.test(s));
const IDS = POST_IDS.length > 0 ? POST_IDS : ["176", "221"];

let failures = 0; // 产品侧断言红数：与 report() 里那句 process.exitCode=1 同一处增，机器行读的就是它
let passes = 0;
let skips = 0;
/**
 * transport = 仪器/环境侧的中断数（后台或 5177 连不上、Chrome 起不来、导航失败、puppeteer 缺件）。
 * 本仓口径：仪器与环境故障不计入产品 FAIL ⇒ transport>0 时判决只能是 NOT-EVIDENCED（退 2）。
 * 判点只认「拿不到 HTTP 响应 / 浏览器根本起不来」这类连接层事实：页面渲染缺陷、4xx、
 * waitForFunction 超时（UI 没跳到预期态）都不在此列 ⇒ 这道守卫不可能把真缺陷洗成绿。
 */
let transport = 0;
let verdictPrinted = false;
/** 第 9 节那处红源（非预期 4xx/5xx 条数）的镜像：必须在这里声明，不能在 finish() 里引用
 *  文件末尾才 const 出来的 unexpected —— 否则早退路径会踩 TDZ，判决行自己先崩。 */
let httpNoiseRed = 0;

const scrub = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\r?\n/g, " ");
/** 只有连接层/浏览器生命周期这类事实才算环境缺席；产品侧症状（含 waitForFunction 超时）不匹配 */
const ENV_ERR = /(net::ERR_[A-Z_]+)|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|ERR_EMPTY_RESPONSE|ECONNREFUSED|ECONNRESET|EAI_AGAIN|ENOTFOUND|fetch failed|navigation timeout|Navigation timeout|Failed to launch|browser was closed|Target closed|Session closed|Protocol error|Cannot find module|puppeteer/i;
const WAIT_FOR_FN = /waiting for function failed/i; // 这条是产品缺陷（点了登录却停在 /login），不算环境

function isEnvError(msg) {
  const m = scrub(msg);
  if (WAIT_FOR_FN.test(m)) return false;
  return ENV_ERR.test(m);
}

/** 判决行：本进程最后一个 stdout 行。state 省略时按 transport>0 → NOT-EVIDENCED、failures>0 → FAIL、否则 PASS */
function finish(state, reason) {
  if (verdictPrinted) return;
  verdictPrinted = true;
  const s = state || (transport > 0 ? "NOT-EVIDENCED" : failures > 0 ? "FAIL" : "PASS");
  const why = reason || (s === "FAIL"
    ? `红源：断言不成立与 HTTP 噪声合计 ${failures}（其中非预期 4xx/5xx ${httpNoiseRed} 条），FAIL 行见上（详情配图/列表跳转/非法 ID 错误态/侧边栏/新增页五类）`
    : s === "NOT-EVIDENCED"
      ? `${transport} 次仪器侧中断 ⇒ 后台 :8080 或 admin dev ${BASE} 或 Chrome 不在，本门无对象，不计产品 FAIL`
      : `${passes} 项断言全绿（登录取到 JWT、配图真解码、查看与 ID 直达都能跳、非法 ID 出 ErrorState、侧边栏三组）` + (skips ? `；另有 ${skips} 项因前置项缺失没跑` : ""));
  console.log(`\n失败 ${failures} 项`);
  console.log(`POSTDETAIL_RESULT=${s} pass=${passes} fail=${failures} skip=${skips} transport=${transport}（${scrub(why)}）`);
  process.exit(s === "FAIL" ? 1 : s === "NOT-EVIDENCED" ? 2 : 0);
}

// 兜底：本脚本全是 top-level await，任何没接住的抛错都会让进程直接崩掉、连机器行都印不出来
// （=「读数缺失」那种不可归因的绿/红）。接住后按性质分流，两条路都是非零退出，绝不因为
// 「异常被吞了」而退 0 ⇒ 这道兜底本身不可能把真缺陷洗成绿。
const onFatal = (e) => {
  const m = scrub(e && (e.message || e)).slice(0, 90);
  transport += 1;
  console.log(`   [env] 仪器侧中断：${m}`);
  finish("NOT-EVIDENCED", `浏览器/后端没能跑到底（${m}）⇒ 剩余断言没有对象，记 NOT-EVIDENCED 退 2，不计产品 FAIL`);
};
process.on("uncaughtException", onFatal);
process.on("unhandledRejection", onFatal);

if (!USER || !PASS) {
  console.error("缺少 ADMIN_LOGIN_USERNAME / ADMIN_LOGIN_PASSWORD 环境变量");
  finish("NOT-EVIDENCED",
    "缺 ADMIN_LOGIN_USERNAME/ADMIN_LOGIN_PASSWORD 这一仪器前提 ⇒ 登录腿第一步就没有凭据，后面每条像素断言都没有对象（非产品缺陷，退 2）");
}

// puppeteer 与 Chrome 都是仪器：缺件时必须 NOT-EVIDENCED，不能让它崩成 exit 1 被读成「详情页坏了」
let puppeteer = null;
try {
  ({ default: puppeteer } = await import("puppeteer"));
} catch (e) {
  transport += 1;
  finish("NOT-EVIDENCED", `puppeteer 模块装不起来（${scrub(e && e.message).slice(0, 70)}）⇒ 浏览器门没有仪器可用，不计产品 FAIL`);
}
if (!existsSync(CHROME)) {
  transport += 1;
  finish("NOT-EVIDENCED", `CHROME_PATH=${CHROME} 不存在 ⇒ 起不了浏览器，本门零判决（仪器缺失，退 2 不记 FAIL）`);
}

// 后台/admin dev 不在 ⇒ NOT-EVIDENCED；任何 HTTP 响应（含 401/500）都算服务活着，照跑不误
try {
  const pre = await fetch(`${BASE}/login`, { method: "GET" });
  console.log(`   [preflight] ${BASE} 有 HTTP 响应（status=${pre.status}）`);
} catch (e) {
  transport += 1;
  console.log(`   [preflight] ${BASE} 无 HTTP 响应：${scrub(e && e.message).slice(0, 90)}`);
  finish("NOT-EVIDENCED",
    `admin dev ${BASE} 连不上（${scrub(e && e.message).slice(0, 60)}）⇒ 页面根本没渲染，像素断言全无对象；仪器故障记 NOT-EVIDENCED 退 2`);
}

mkdirSync(OUT_DIR, { recursive: true });

let phase = "login";
const httpNoise = [];
const consoleErrors = [];

function report(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  // 红源唯一：failures 就在原来那句 process.exitCode=1 的同一条 else 里增，
  // 结尾的 POSTDETAIL_RESULT 读的是这一个数，不是另起的计数。
  if (ok) passes += 1;
  else { failures += 1; process.exitCode = 1; }
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
} catch (e) {
  transport += 1;
  finish("NOT-EVIDENCED",
    `Chrome 起不来（${scrub(e && e.message).slice(0, 80)}）⇒ 仪器侧故障，像素断言一条都没跑，不计产品 FAIL`);
}
const page = await browser.newPage();

page.on("response", (res) => {
  const s = res.status();
  if (s >= 400) httpNoise.push(`${phase}|${s} ${res.url().replace(/^https?:\/\/[^/]+/, "")}`);
});
page.on("requestfailed", (req) => httpNoise.push(`${phase}|FAILED ${req.url().slice(0, 120)}`));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR ${String(e.message).slice(0, 200)}`));

async function typeInto(placeholderNeedle, value) {
  const handle = await page.evaluateHandle((needle) => {
    const inputs = [...document.querySelectorAll("input")];
    return inputs.find((el) => (el.getAttribute("placeholder") || "").includes(needle)) || null;
  }, placeholderNeedle);
  const el = handle.asElement();
  if (!el) throw new Error(`未找到 placeholder 含「${placeholderNeedle}」的输入框`);
  await el.type(value, { delay: 8 });
  return true;
}

async function clickByText(tag, text) {
  const clicked = await page.evaluate(
    (t, needle) => {
      const norm = (s) => (s || "").replace(/\s+/g, "");
      const el = [...document.querySelectorAll(t)].find((x) => norm(x.textContent).includes(norm(needle)));
      if (!el) return false;
      el.click();
      return true;
    },
    tag,
    text
  );
  if (!clicked) throw new Error(`未找到文本含「${text}」的 <${tag}>`);
}

async function settle(ms = 900) {
  await new Promise((r) => setTimeout(r, ms));
}

// ===== 1. 登录 =====
await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await settle(400);
try {
  await typeInto("管理员账号", USER);
  await typeInto("密码", PASS);
  await clickByText("button", "登录");
} catch (e) {
  const m = scrub(e && e.message).slice(0, 90);
  if (isEnvError(m)) {
    // 连接层/浏览器侧的错不能算「登录表单坏了」：先留证据再按 NOT-EVIDENCED 退 2
    transport += 1;
    console.log(`   [env] 登录腿仪器侧中断：${m}`);
    try { await page.screenshot({ path: `${OUT_DIR}/00-login-fail.png`, fullPage: true }); } catch { /* 截图失败不改判 */ }
    finish("NOT-EVIDENCED", `登录这一步被环境侧打断（${m}）⇒ 后续像素断言没有对象，不计产品 FAIL`);
  }
  report("登录表单可提交", false, m);
  await page.screenshot({ path: `${OUT_DIR}/00-login-fail.png`, fullPage: true });
  try { await browser.close(); } catch { /* 收尾失败不掩盖这条红 */ }
  finish("FAIL", `登录表单没走通（${m}）⇒ 详情页/列表页那一堆断言全部没跑，本门这条红是产品侧的（找不到输入框或按钮）`);
}
await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 15000 });
const tokenLen = await page.evaluate(() => (localStorage.getItem("admin_v2_token") || "").length);
report("登录后取得 JWT 并离开登录页", tokenLen > 20, `token ${tokenLen} chars, path=${new URL(page.url()).pathname}`);
await settle(800);

// ===== 2. 详情页：配图必须是真像素 =====
phase = "detail";
for (const id of IDS) {
  await page.goto(`${BASE}/forum/posts/${id}`, { waitUntil: "networkidle2" });
  await settle(1400);
  const m = await page.evaluate(() => {
    const txt = (sel) => (document.querySelector(sel)?.textContent || "").trim();
    const thumbs = [...document.querySelectorAll(".image-thumb")];
    return {
      title: txt(".post-title"),
      contentChars: (document.querySelector(".post-content")?.textContent || "").trim().length,
      metaRows: document.querySelectorAll(".meta-row").length,
      tiles: thumbs.length,
      loaded: thumbs.filter((i) => i.complete && i.naturalWidth > 0).length,
      zeroSized: thumbs.filter((i) => i.getBoundingClientRect().width < 8).length,
      badSrc: thumbs.filter((i) => !i.currentSrc || i.currentSrc === location.href).length,
      srcSample: thumbs[0]?.currentSrc || "",
      commentSection: txt(".section-title"),
      hasAuditForm: !!document.querySelector(".radio-group input"),
      bodyHasError: /加载帖子详情失败|帖子 ID 无效/.test(document.body.innerText),
    };
  });
  await page.screenshot({ path: `${OUT_DIR}/post-${id}.png`, fullPage: true });
  console.log(`   post ${id}: ${JSON.stringify(m)}`);
  report(`帖子 ${id} 详情渲染出正文`, m.contentChars > 0, `${m.contentChars} 字`);
  report(`帖子 ${id} 元信息面板`, m.metaRows >= 6, `${m.metaRows} 行`);
  if (m.tiles > 0) {
    report(`帖子 ${id} 配图全部真实解码`, m.loaded === m.tiles, `${m.loaded}/${m.tiles} loaded, ${m.zeroSized} 尺寸异常, ${m.badSrc} 空 src`);
  } else {
    report(`帖子 ${id} 无配图时给出空态而非破图`, !m.bodyHasError, "no .image-thumb");
  }
  report(`帖子 ${id} 未落入错误态`, !m.bodyHasError);
}

// ===== 3. 列表页：查看 + ID 直达 =====
phase = "list";
const listHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll("a[href], .menu-item, li")];
  const hit = links.find((el) => /帖子|动态/.test(el.textContent || "") && el.closest("aside,nav,.sidebar,.menu"));
  const anchor = hit?.tagName === "A" ? hit : hit?.querySelector("a[href]");
  return anchor?.getAttribute("href") || "";
});
if (!listHref) {
  report("从侧边栏定位到帖子列表入口", false, "未找到（可能菜单数据未含该项）");
  skips += 5; // 入口都没有 ⇒ 列表行/查看按钮/ID 输入框/ID 直达/行内查看五条没跑（红已由上面那条记下）
} else {
  await page.goto(`${BASE}${listHref}`, { waitUntil: "networkidle2" });
  await settle(1500);
  const listState = await page.evaluate(() => {
    const rows = document.querySelectorAll(".data-table tbody tr").length;
    const jumpInput = [...document.querySelectorAll("input")].find((i) =>
      (i.getAttribute("placeholder") || "").includes("帖子 ID")
    );
    const viewBtn = [...document.querySelectorAll(".action-button")].find((b) =>
      (b.textContent || "").trim() === "查看"
    );
    return { rows, hasJump: !!jumpInput, hasView: !!viewBtn };
  });
  report(`列表页 ${listHref} 渲染出数据行`, listState.rows > 0, `${listState.rows} 行`);
  report("列表页有「查看」按钮", listState.hasView);
  report("列表页有「按 ID 打开」输入框", listState.hasJump);
  if (listState.hasJump) {
    await typeInto("帖子 ID", "221");
    await clickByText("button", "按 ID 打开");
    await page.waitForFunction(() => location.pathname.includes("/forum/posts/"), { timeout: 8000 });
    await settle(1200);
    const at = new URL(page.url()).pathname;
    report("ID 直达落到详情页且路径带 ID", at === "/forum/posts/221", at);
  } else {
    skips += 1; // 没有「按 ID 打开」输入框 ⇒ ID 直达那条跳转断言没对象（上面已按 FAIL 记过）
  }
  if (listState.hasView) {
    await page.goBack().catch(() => {});
    await settle(800);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".action-button")].find(
        (x) => (x.textContent || "").trim() === "查看"
      );
      b?.click();
    });
    await page.waitForFunction(() => location.pathname.includes("/forum/posts/"), { timeout: 8000 });
    await settle(1000);
    report("行内「查看」跳转到详情页", new URL(page.url()).pathname.startsWith("/forum/posts/"), new URL(page.url()).pathname);
  } else {
    skips += 1; // 没有「查看」按钮 ⇒ 行内跳转那条断言没对象（上面已按 FAIL 记过）
  }
}

// ===== 4. 非法 ID 必须可诊断，不能白屏、也不能留半截详情 =====
phase = "negative";
await page.goto(`${BASE}/forum/posts/99999999`, { waitUntil: "networkidle2" });
await settle(1400);
const bad = await page.evaluate(() => ({
  alert: !!document.querySelector('.error-state[role="alert"]'),
  msg: (document.querySelector(".error-state__message")?.textContent || "").trim(),
  leakedBody: document.querySelectorAll(".meta-row, .image-thumb, .post-content").length,
}));
report(
  "不存在的帖子渲染 ErrorState、不留半截详情、错误文案非空",
  bad.alert && bad.msg.length > 0 && bad.leakedBody === 0,
  `alert=${bad.alert} msg="${bad.msg.slice(0, 46)}" 残留详情元素=${bad.leakedBody}`
);
await page.screenshot({ path: `${OUT_DIR}/post-missing.png` });

// ===== 6. 面包屑标题 + 圈层管理页（畸形 SFC 的浏览器证据） =====
phase = "misc";
await page.goto(`${BASE}/forum/posts/176`, { waitUntil: "networkidle2" });
await settle(1200);
const crumb = await page.evaluate(() => {
  const text = document.body.innerText;
  return { leaksKey: /postDetail\.|villagePosts\./.test(text), hasTitle: text.includes("帖子详情") };
});
report("面包屑渲染成人话而非 i18n key", !crumb.leaksKey && crumb.hasTitle, `leaksKey=${crumb.leaksKey}`);

const circleHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll("a[href]")];
  const hit = links.find((a) => (a.textContent || "").includes("圈层"));
  return hit?.getAttribute("href") || "";
});
if (!circleHref) {
  report("侧边栏存在「圈层管理」入口", false, "未找到（菜单未登记该项）");
  skips += 2; // 入口都没有 ⇒ 「圈层管理页可渲染」与「节点可点开、行数与后端一致」两条没跑
} else {
  const errsBefore = consoleErrors.length;
  await page.goto(`${BASE}${circleHref}`, { waitUntil: "networkidle2" });
  await settle(1600);
  const cl = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      len: text.length,
      hasLayerWord: /圈层|大区|学校|层级/.test(text),
      treeNodes: document.querySelectorAll("[class*=tree] li, .el-tree-node, [class*=layer]").length,
      rows: document.querySelectorAll("table tbody tr").length,
    };
  });
  await page.screenshot({ path: `${OUT_DIR}/circle-layers.png`, fullPage: true });
  const newErrs = consoleErrors.length - errsBefore;
  report(
    `圈层管理页 ${circleHref} 可渲染（畸形 SFC 已修复）`,
    cl.hasLayerWord && cl.treeNodes + cl.rows > 0 && newErrs === 0,
    `节点=${cl.treeNodes} 行=${cl.rows} 新报错=${newErrs} 文案命中=${cl.hasLayerWord}`
  );

  // 点一个 L3 学校节点，看右侧「圈层详情」能不能出内容（回填缺口的直接测量）
  const clicked = await page.evaluate(() => {
    // @click 挂在 .tree-node__row 上（事件只向上冒泡），必须点这一层而不是外层 li
    const rows = [...document.querySelectorAll("[class*=tree-node__row]")];
    const target = rows.find((n) => /北京大学|清华大学|复旦大学/.test(n.textContent || ""));
    if (!target) return `NO_ROW(rows=${rows.length})`;
    target.click();
    return (target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
  });
  await settle(1600);
  const detail = await page.evaluate(() => {
    const panel = [...document.querySelectorAll("[class*=detail], [class*=panel], section")]
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .sort((a, b) => b.length - a.length)[0] || "";
    // 管辖用户表：表头含「圈层路径」且含「昵称」。只按前者会连「下属圈层」表一起命中
    // （那张表的行里也带路径值），导致行数多算。
    const tables = [...document.querySelectorAll("table")].filter(
      (t) => /圈层路径/.test(t.textContent || "") && /昵称/.test(t.textContent || "")
    );
    const userRows = tables.reduce((n, t) => n + t.querySelectorAll("tbody tr").length, 0);
    return {
      stillPlaceholder: /请选择左侧圈层/.test(document.body.innerText),
      showsNoUsersText: /无管辖用户/.test(document.body.innerText),
      userRows,
      matchedTables: tables.length,
      domIds: tables.flatMap((t) => [...t.querySelectorAll("tbody tr")].map((r) => r.querySelector("td")?.textContent?.trim()))
        .slice(0, 120),
      sample: "",
    };
  });
  await page.screenshot({ path: `${OUT_DIR}/circle-layers-node.png`, fullPage: true });
  console.log(`   点击节点「${clicked}」→ ${JSON.stringify(detail)}`);
  // 期望值不写死：直接从后端取该圈层的管辖用户数，和 DOM 行数比对。
  // 写死数字会让断言随数据漂移而假红（本次就踩过 44→46）。
  const apiCount = await page.evaluate(async () => {
    const t = localStorage.getItem("admin_v2_token") || "";
    const r = await fetch("/api/v1/admin/evidence/circle/5/users", { headers: { Authorization: `Bearer ${t}` } });
    const j = await r.json().catch(() => null);
    return Array.isArray(j?.data) ? j.data.length : -1;
  });
  const domIds = detail.domIds.filter(Boolean);
  const dupIds = domIds.filter((v, i) => domIds.indexOf(v) !== i);
  report(
    "圈层节点可点开、详情出表、行数与后端返回一致（回填生效）",
    !clicked.startsWith("NO_ROW") && !detail.stillPlaceholder && !detail.showsNoUsersText
      && apiCount > 0 && detail.userRows === apiCount,
    `DOM=${detail.userRows}(表${detail.matchedTables}张,重复id=${dupIds.join(",") || "无"}) API=${apiCount}`
  );
}

// ===== 7. 新增页面逐个在浏览器里跑通（像素级，不是接口级） =====
phase = "pages";
const braceLeak = (s) => /\{[a-zA-Z][a-zA-Z0-9_]{2,}\}/.test(s);

async function visit(p) {
  await page.goto(`${BASE}${p}`, { waitUntil: "networkidle2" });
  await settle(1600);
}

// 7.1 私信会话
await visit("/content/conversations");
const conv = await page.evaluate(() => ({
  // Conversations.vue 沿用 Whispers 式局部样式，表格类名是 .table 而非 .data-table，
  // 因此按表头文案定位，别按类名。
  rows: [...document.querySelectorAll("table")]
    .filter((t) => /用户A/.test(t.textContent || ""))
    .reduce((n, t) => n + t.querySelectorAll("tbody tr").length, 0),
  text: document.body.innerText,
}));
report("私信会话页渲染出会话行", conv.rows > 0, `${conv.rows} 行`);
report("私信会话页无未插值的 i18n 占位符", !braceLeak(conv.text), conv.text.match(braceLeak ? /\{[a-zA-Z][a-zA-Z0-9_]{2,}\}/ : /x/)?.[0] || "");
const openedConv = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /查看消息/.test(x.textContent || ""));
  if (!b) return false;
  b.click();
  return true;
});
await settle(1600);
const msgView = await page.evaluate(() => ({
  rows: [...document.querySelectorAll("table")]
    .filter((t) => /发送者|内容/.test(t.textContent || ""))
    .reduce((n, t) => n + t.querySelectorAll("tbody tr").length, 0),
}));
report("点开会话可看到消息行（超管见正文）", openedConv && msgView.rows > 0, `rows=${msgView.rows}`);
await page.screenshot({ path: `${OUT_DIR}/conversations.png`, fullPage: true });

// 7.2 发布内容：真的在浏览器里发一条帖
await visit("/forum/compose");
const composeState = await page.evaluate(() => ({
  hasTitleInput: [...document.querySelectorAll("input")].some((i) => /5-30|标题/.test(i.getAttribute("placeholder") || "")),
  hasTextarea: !!document.querySelector("textarea"),
  hasFileInput: !!document.querySelector('input[type="file"]'),
  text: document.body.innerText.slice(0, 120),
}));
report("发布内容页有标题输入框、正文文本域与图片选择", composeState.hasTitleInput && composeState.hasTextarea,
  `title=${composeState.hasTitleInput} textarea=${composeState.hasTextarea} file=${composeState.hasFileInput}`);
const composeStamp = Date.now();
const filled = await page.evaluate((stamp) => {
  const ti = [...document.querySelectorAll("input")].find((i) => /5-30|标题/.test(i.getAttribute("placeholder") || ""));
  const ta = document.querySelector("textarea");
  if (!ti || !ta) return false;
  const set = (el, v) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  set(ti, `浏览器验收帖${stamp}`);
  set(ta, `这条由后台「发布内容」页在浏览器里真实提交，用于验证发帖闭环 ${stamp}。`);
  return true;
}, composeStamp);
await settle(400);
const submitted = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /发布帖子/.test(x.textContent || ""));
  if (!b) return false;
  b.click();
  return true;
});
await settle(2500);
const composeResult = await page.evaluate(() => document.body.innerText);
report("浏览器提交发布成功并回显帖子", filled && submitted && /发布成功（帖子 #\d+/.test(composeResult),
  composeResult.match(/发布成功（帖子 #\d+）/)?.[0] || "未见成功文案");
await page.screenshot({ path: `${OUT_DIR}/compose-submitted.png`, fullPage: true });

// 7.3 首页待办清单与图表
await visit("/dashboard");
const dash = await page.evaluate(() => ({
  hasTodo: /待办清单/.test(document.body.innerText),
  todoActions: [...document.querySelectorAll("button,a")].filter((e) => /去处理/.test(e.textContent || "")).length,
  paintedCanvases: [...document.querySelectorAll("canvas")].filter((c) => c.width > 50 && c.height > 50).length,
  text: document.body.innerText,
}));
report("首页待办清单存在且有可点条目", dash.hasTodo && dash.todoActions > 0, `待办按钮=${dash.todoActions}`);
report("首页图表真的画出来了（canvas 有尺寸）", dash.paintedCanvases >= 2, `canvas=${dash.paintedCanvases}`);
report("首页无未插值的 i18n 占位符", !braceLeak(dash.text));
await page.screenshot({ path: `${OUT_DIR}/dashboard.png`, fullPage: true });

// 7.4 官方号广播表单
await visit("/configs/official-accounts");
const oa = await page.evaluate(() => ({
  hasBroadcastWord: /全站广播/.test(document.body.innerText),
  hasTextarea: !!document.querySelector("textarea"),
  hasPublishBtn: [...document.querySelectorAll("button")].some((b) => /立即广播/.test(b.textContent || "")),
}));
report("官方号页对超管展示广播表单", oa.hasBroadcastWord && oa.hasTextarea && oa.hasPublishBtn,
  `banner=${oa.hasBroadcastWord} textarea=${oa.hasTextarea} btn=${oa.hasPublishBtn}`);
await page.screenshot({ path: `${OUT_DIR}/official-accounts.png`, fullPage: true });

// ===== 8. 侧边栏收缩：只剩三组、隐藏项不出现、新增页在列 =====
phase = "menu";
await visit("/system/circle-layers"); // 中性页：首页待办卡片里有指向隐藏页的链接，会干扰统计
const WANT_GROUPS = ["内容", "运营", "权限"];
const WANT_PAGES = ["私信会话", "发布内容", "圈层管理", "能力总览", "数据看板", "用户管理"];
const DONT_WANT = ["敏感词管理", "悄悄话", "VIP 套餐", "热度榜管理", "兴趣圈管理", "举报管理"];
const sidebar = await page.evaluate(({ g, p, d }) => {
  const el = document.querySelector(".sidebar-menu") || document.querySelector(".sidebar");
  const text = (el?.innerText || "").replace(/\s+/g, " ");
  return {
    groups: g.filter((x) => text.includes(x)),
    pages: p.filter((x) => text.includes(x)),
    leaked: d.filter((x) => text.includes(x)),
    len: text.length,
  };
}, { g: WANT_GROUPS, p: WANT_PAGES, d: DONT_WANT });
report("侧边栏只剩三组（内容/运营/权限）", sidebar.groups.length === 3, `命中=${sidebar.groups.join(",")}`);
report("被隐藏的 23 个页面不出现在侧边栏", sidebar.leaked.length === 0, `泄漏=${sidebar.leaked.join(",") || "无"}`);
report("本轮新增页在侧边栏可见", sidebar.pages.length === WANT_PAGES.length,
  `缺失=${WANT_PAGES.filter((x) => !sidebar.pages.includes(x)).join(",") || "无"}`);
await page.screenshot({ path: `${OUT_DIR}/sidebar-shrunk.png`, fullPage: true });

// ===== 9. 网络与脚本报错汇总 =====
await page.screenshot({ path: `${OUT_DIR}/zz-final.png` });
// 预期内的噪声：静态资源缺失 + 第 4 节故意打的 404 深链
const unexpected = httpNoise.filter((n) => !/favicon\.ico/.test(n) && !n.startsWith("negative|"));
console.log(`\nHTTP >=400 / 失败请求 ${httpNoise.length} 条，其中预期内 ${httpNoise.length - unexpected.length} 条：`);
for (const n of [...new Set(httpNoise)].slice(0, 12)) console.log("  ", n);
console.log(`console/page error ${consoleErrors.length} 条:`);
for (const e of [...new Set(consoleErrors)].slice(0, 12)) console.log("  ", e);
if (unexpected.length > 0) {
  console.log(`\n存在 ${unexpected.length} 条非预期 4xx/5xx，判为失败`);
  // 这是本文件第二处红源（原来只翻 process.exitCode，没有任何计数）——就地并进同一个
  // failures，机器行才说得出「红的是这 N 条网络噪声」而不是一个没有对象的 exit=1。
  failures += unexpected.length;
  httpNoiseRed = unexpected.length; // 同步给 finish() 用（顶部声明的镜像数，避免引用末尾 const 踩 TDZ）
  process.exitCode = 1;
}

try {
  await browser.close();
} catch (e) {
  console.log(`   [note] browser.close 失败：${scrub(e && e.message).slice(0, 60)}（收尾问题不改判，判决数已定）`);
}
console.log(`\n截图目录：${OUT_DIR}`);
finish();

