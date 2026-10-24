#!/usr/bin/env node
/**
 * emit-ruling-menu.mjs — 待裁菜单由名册派生，并强制守恒（2026-10-24，P3a）
 *
 * 为什么要它：ruling-menu-v38.md 当初是"机器派生"手写的，头上一行写 27 条，
 * 而名册 PENDING_RULINGS 块里 status=open 实测 28 条——漏的恰好是 decisions#69（Q1 RESHOOT-CREDIT），
 * 也就是**唯一必须由业主拍的那一条**。菜单少一条的代价不是"少看一眼"：
 * 用户按菜单逐条回答，没印出来的那条永远不会有裁决，账上却记着"本轮待裁已发菜单"。
 * 菜单一旦不是派生的，就没有任何东西能发现它少印了 —— 所以这里把派生与守恒都做成机器。
 *
 * 守恒式：菜单里的 №id 集合 == 名册 status=open 的 id 集合。双向都判：
 *   少印 ⇒ 点名缺哪些 id（这次的形态）；多印/印了已闭案的 ⇒ 也点名（防止菜单变成第二本账）。
 * 分组沿用既有菜单的 A/B/C… 归类（那是人按关键词粗筛的，不是权威归类），
 * 名册里新增或原先没分组的 id 一律追加到"机器补录"一节并写明原因 —— 不丢信息、不重排既有分组。
 *
 * 用法：
 *   node scripts/qa/emit-ruling-menu.mjs --roster <decisions-vXX.md> [--menu <ruling-menu-vXX.md>] [--write]
 *   node scripts/qa/emit-ruling-menu.mjs --selftest
 * 缺省（不带 --write）就是 --check：派生一遍与盘上菜单比，不等就退 1。
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "RULINGMENU_RESULT";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const ROW = /^\s*RULING id=(\S+) status=(\S+) title=(.*?) options=(.*)$/;
/**
 * options= 的值一直吃到行尾，而行尾还挂着 premise= / basis= 这些**记账元数据**。
 * 不切出去，菜单里那行"选项文字"就会带上 basis="decisions-v38.md §2 A1：…"整段，
 * 于是头一行声称"我没有改写任何选项文字"当场变成假话。切法只认这两个键名，不按 `|` 猜。
 */
function splitOptions(rest) {
  const m = /\s(?=(?:premise|basis|owner|round)=)/.exec(rest);
  const options = (m ? rest.slice(0, m.index) : rest).trim();
  const meta = m ? rest.slice(m.index).trim() : "";
  return { options, meta };
}

/** 读名册机器块：只认 PENDING_RULINGS_BEGIN/END 之间的 RULING 行（与 emit-round-bill 同一口径）。 */
export function readRoster(rosterPath) {
  /* 读不到要说得出来，不能抛异常：抛了就等于"名册没了 ⇒ 整条判据崩掉"，
     而崩掉的判据在 CI 里长得像环境故障，不长得像"待裁项没核对过"。 */
  if (!existsSync(rosterPath)) return { err: `名册文件不存在 ${rosterPath}` };
  let lines;
  try { lines = readFileSync(rosterPath, "utf8").split(/\r?\n/); } catch (e) { return { err: `名册读不动：${e.message}` }; }
  const b = lines.findIndex((l) => /^\s*PENDING_RULINGS_BEGIN/.test(l));
  const e = b < 0 ? -1 : lines.findIndex((l, i) => i > b && /^\s*PENDING_RULINGS_END/.test(l));
  if (b < 0 || e < 0) return { err: b < 0 ? "册里没有 PENDING_RULINGS_BEGIN/END 块" : "名册块未闭合：有 BEGIN 无 END" };
  const rows = [];
  for (const l of lines.slice(b + 1, e)) {
    const m = ROW.exec(l);
    if (!m) continue;
    rows.push({ id: m[1], status: m[2], title: m[3].trim(), ...splitOptions(m[4]) });
  }
  const tail = /open=(\d+) half_closed=(\d+) closed=(\d+)/.exec(lines[e]);
  const open = rows.filter((r) => r.status === "open");
  /* 块尾自述与逐行数出来的对不上 ⇒ 名册自己就矛盾，菜单不许多印或少印来掩盖它 */
  const selfAgree = !tail || (open.length === +tail[1] && rows.filter((r) => r.status === "half-closed").length === +tail[2] && rows.filter((r) => r.status === "closed").length === +tail[3]);
  return { rows, open, beginLine: b + 1, endLine: e + 1, declared: tail ? { open: +tail[1] } : null, selfAgree };
}

/** 解析既有菜单：拿到"№编号 → 所在分组标题"的顺序表，以及每条的原样文字。 */
export function readMenu(menuPath) {
  const text = readFileSync(menuPath, "utf8");
  const lines = text.split(/\r?\n/);
  const groups = [];
  let cur = null;
  const items = new Map();
  for (const l of lines) {
    const h = /^## (.+)$/.exec(l);
    if (h) { cur = h[1].trim(); groups.push(cur); continue; }
    const m = /^\*\*\d+\.\s*№(\d+)\s*—\s*(.+?)\*\*$/.exec(l);
    if (m) {
      const num = m[1];
      const optLine = lines[lines.indexOf(l) + 1] || "";
      items.set(num, { group: cur, seq: Number(m[1]), title: m[2].trim(), options: /^\s+(\(.*)$/.test(optLine) ? optLine.trim() : "" });
    }
  }
  return { groups: groups.filter((g) => !/^来源|^回答方式/.test(g)), items, title: (lines[0] || "").replace(/^#\s+/, "").trim() };
}

const numOf = (id) => String(id).replace(/^decisions#/, "");
/** 标题里的版本从名册文件名取，不写死 v3.8 —— 写死了下一册一换，标题就成了假话。 */
const verOf = (p) => { const m = /v(\d+)/.exec(String(p)); return m ? `v${m[1]}` : "本版"; };

/** 派生菜单全文。老菜单的分组与措辞原样保留，缺的就地补录。 */
export function render(roster, oldMenu, srcLabel, ver) {
  const order = [];
  const buckets = new Map();
  const put = (g, it) => { if (!buckets.has(g)) { buckets.set(g, []); order.push(g); } buckets.get(g).push(it); };
  const missing = [];
  const openById = new Map(roster.open.map((r) => [numOf(r.id), r]));
  /* 先按**老菜单的文档顺序**落位：菜单是给人逐条回答的，条目编号与顺序是历史引用的一部分
     （"31a 32b 49a" 那种回答就靠它），按名册 id 重排会把旧引用关系洗掉。 */
  if (oldMenu) for (const [n, old] of oldMenu.items) {
    const r = openById.get(n);
    if (r) put(old.group, { num: n, id: r.id, title: r.title, options: r.options });
  }
  for (const r of roster.open) {
    const n = numOf(r.id);
    if (oldMenu && oldMenu.items.has(n)) continue;
    put("Z 类·机器补录（原菜单没印的）", { num: n, id: r.id, title: r.title, options: r.options });
    missing.push(n);
  }
  /* 原菜单里有、名册已不 open 的条目 ⇒ 不再渲染，但必须留痕，否则读者以为它一直是待裁 */
  const stale = oldMenu ? [...oldMenu.items.keys()].filter((n) => !roster.open.some((r) => numOf(r.id) === n)) : [];
  /* 标题沿用老菜单那一行，只把条数换成实测值——不自造版本写法（v3.8 vs v38 这种）。 */
  const head = oldMenu && oldMenu.title ? String(oldMenu.title).replace(/，\d+ 条/, `，${roster.open.length} 条`) : `${ver || "本版"} 待裁清单（机器派生，${roster.open.length} 条）`;
  const L = [];
  L.push(`# ${head}`);
  L.push(``);
  L.push(`> 来源：${srcLabel} 的 PENDING_RULINGS 机器名册——逐条取 status=open，title 与 options 原样打印，我没有改写任何选项文字。`);
  L.push(`> 生成器：scripts/qa/emit-ruling-menu.mjs（本文件由它派生；**守恒式=菜单 №id 集合必须等于名册 open 集合**，改名册后请重跑 --write，别手改本文件）。`);
  L.push(`> **分组只是人按关键词做的粗筛，不是权威归类**：目的是把「会不会动产品/数据/账本」分开看，分错请直接无视分组。`);
  L.push(`> 回答方式：回「编号+字母」，如「31a 32b 49a」；不想选的写 skip；要我给推荐就写「№NN 你荐」。`);
  if (missing.length) L.push(`> 本次机器补录 ${missing.length} 条：№${missing.join("、№")}（原菜单没印 ⇒ 你此前没有裁到它们的机会）。`);
  if (stale.length) L.push(`> 已从菜单移除 ${stale.length} 条：№${stale.join("、№")}（名册里不再是 open）。`);
  L.push(``);
  let seq = 0;
  for (const g of order) {
    L.push(`## ${g}`);
    L.push(``);
    for (const it of buckets.get(g)) {
      /* 序号全文连续（原菜单就是这个形态）：分组内重新从 1 数会让老条目的序号集体位移，
         一份"补印了一条"的菜单不该把另外 27 条的行内标号都改掉。 */
      L.push(`**${++seq}. №${it.num} — ${it.title}**`);
      L.push(`  ${it.options}`);
      L.push(``);
    }
  }
  L.push(`## 守恒自证`);
  L.push(``);
  L.push(`- 名册 open=${roster.open.length}（块内逐行数出）｜ 本菜单渲染=${roster.open.length} ｜ 相等=是`);
  L.push(`- 名册块行区间：${roster.beginLine}-${roster.endLine}；块尾自述 open=${roster.declared ? roster.declared.open : "（无）"}`);
  L.push(`- 条数口径只认 \`RULING id=… status=open\` 行；散文里的"待裁 N 条"一律不算数。`);
  L.push(``);
  return { text: L.join("\n"), missing, stale, groups: order.length };
}

/* 生成器拥有的两节：每次重写先整节摘掉再重新追加，其余内容一个字都不碰。 */
const OWNED = ["Z 类·机器补录（原菜单没印的）", "守恒自证"];

/**
 * 就地补：老菜单原文照抄，只做四件事——改头一行的条数、逐条替换文字过期的条目、
 * 追加漏印的条目、重挂自己那两节。
 *
 * 为什么不走"整篇重排"：第一版我就是这样写的，结果把老菜单末尾
 * `## 实测补充（2026-10-17，真档在跑时量的）` 那一整节（U3/U4/U5 三条实测）吞掉了——
 * 渲染器只认识"有待裁条目"的小节，认不出纯实测附注，于是守恒修好了、信息却丢了。
 * 菜单是给人回答用的，附注里那些实测数正是回答依据，不能为了判据干净而蒸发。
 */
export function mergeIntoOld(roster, oldMenu, oldText, srcLabel, ver) {
  const lines = oldText.split(/\r?\n/);
  const keep = [];
  const scrubbed = [];
  let drop = false;
  for (const l of lines) {
    const h = /^## (.+)$/.exec(l);
    if (h) { drop = OWNED.some((o) => h[1].trim() === o || h[1].trim().startsWith(o)); if (drop) continue; }
    if (drop) continue;
    /* 散文计数句必须撤：实测老菜单第 96 行写着"合计列出 27 条，名册实际 open=27（一致）"，
       而名册 open=28 —— 一句"自称一致"的话比没有这句话更坏，它会让人以为守恒已经被核过。
       只撤得中这个形态的行，其余散文原样留着；撤掉的原文逐句抄进"守恒自证"，不蒸发。 */
    if (/^合计列出\s*\d+\s*条/.test(l) || /名册实际 open=\d+（一致）/.test(l)) { scrubbed.push(l.trim()); continue; }
    keep.push(l);
  }
  /* 头一行：只换条数。措辞（版本写法 v3.8 这种）是原文的，不匹配就不动——不替人改写标题。 */
  if (keep.length && /^# .*（机器派生，\d+ 条）/.test(keep[0])) keep[0] = keep[0].replace(/，\d+ 条/, `，${roster.open.length} 条`);
  /* 逐条就地刷新文字过期的条目（序号保留原值，免得另外 27 条的行内标号集体位移） */
  let rewritten = 0;
  for (let i = 0; i < keep.length; i++) {
    const m = /^\*\*(\d+)\.\s*№(\d+)\s*—\s*(.+?)\*\*$/.exec(keep[i]);
    if (!m) continue;
    const r = roster.open.find((x) => numOf(x.id) === m[2]);
    if (!r) continue;
    const next = keep[i + 1] || "";
    const oldOpts = /^\s+(\(.*)$/.test(next) ? next.trim() : "";
    if (m[3].trim() === r.title && (!oldOpts || oldOpts === r.options)) continue;
    keep[i] = `**${m[1]}. №${m[2]} — ${r.title}**`;
    if (/^\s+\(/.test(next)) keep[i + 1] = `  ${r.options}`;
    rewritten++;
  }
  /* 补录节每轮都整节重挂，所以"上一轮补进来的条目"不在 keep 里了：
     它们要按 group 认回来，否则第二轮 --write 会把上一轮补的条目当"不需要追加"直接蒸发（幂等就是这么破的）。 */
  const appended = roster.open
    .filter((r) => { const o = oldMenu.items.get(numOf(r.id)); return !o || o.group === OWNED[0]; })
    .map((r) => ({ n: numOf(r.id), r }));
  const inBody = roster.open.filter((r) => { const o = oldMenu.items.get(numOf(r.id)); return o && o.group !== OWNED[0]; });
  const maxSeq = Math.max(0, ...inBody.map((x) => (oldMenu.items.get(numOf(x.id)) || {}).seq || 0));
  const tail = [];
  if (appended.length) {
    tail.push(`## ${OWNED[0]}`);
    tail.push(``);
    appended.forEach((x, i) => {
      tail.push(`**${maxSeq + i + 1}. №${x.n} — ${x.r.title}**`);
      tail.push(`  ${x.r.options}`);
      tail.push(``);
    });
    tail.push(`> 本节由 scripts/qa/emit-ruling-menu.mjs 追加：这些条名册里 status=open，但此前没有任何地方印给过你。`);
    tail.push(``);
  }
  tail.push(`## ${OWNED[1]}`);
  tail.push(``);
  tail.push(`- 名册 open=${roster.open.length}（块内逐行数出）｜ 本菜单渲染=${inBody.length + appended.length} ｜ 相等=${roster.open.length === inBody.length + appended.length ? "是" : "否"}`);
  tail.push(`- 名册块行区间：${roster.beginLine}-${roster.endLine}；块尾自述 open=${roster.declared ? roster.declared.open : "（无）"}`);
  tail.push(`- 条数口径只认 \`RULING id=… status=open\` 行；散文里的"待裁 N 条"一律不算数。`);
  tail.push(`- 本次派生：追加 ${appended.length} 条、就地刷新 ${rewritten} 条。生成器 = scripts/qa/emit-ruling-menu.mjs（改名册后重跑 --write，别手改本文件；来源 ${srcLabel}，版本标记 ${ver || "见上"}）。`);
  for (const q of scrubbed) tail.push(`- 撤掉的散文计数（原文照抄，不蒸发）：${q}`);
  const body = keep.join("\n").replace(/\n+$/, "");
  return { text: body + "\n" + tail.join("\n") + "\n", missing: appended.map((x) => x.n), fresh: appended.filter((x) => !oldMenu.items.has(x.n)).map((x) => x.n), rewritten, scrubbed: scrubbed.length, stale: [...oldMenu.items.keys()].filter((n) => !roster.open.some((r) => numOf(r.id) === n)) };
}

/** 守恒判定：派生结果与盘上菜单比，并核对两侧 id 集合与每条的文字。返回 {code, out}，判决行交给 say。 */
function checkOne(rosterPath, menuPath, say = console.log) {
  const out = [];
  const s = (l) => { out.push(l); say(l); };
  const roster = readRoster(rosterPath);
  if (roster.err) { s(`${RK}=NOT-EVIDENCED reason=名册读不到（${roster.err}）⇒ 没有分母，不许判菜单对不对`); return { code: 2, out }; }
  if (!roster.selfAgree) { s(`${RK}=FAIL reason=名册块尾自述 open=${roster.declared && roster.declared.open} 与块内逐行数出的 ${roster.open.length} 不一致 ⇒ 先修名册`); return { code: 1, out }; }
  if (!existsSync(menuPath)) { s(`${RK}=FAIL reason=菜单文件不存在 ${menuPath}（待裁项没有可回答的载体）`); return { code: 1, out }; }
  const oldMenu = readMenu(menuPath);
  s(`RULINGMENU_ROSTER ${rosterPath} 块=${roster.beginLine}-${roster.endLine} open=${roster.open.length} 半闭=${roster.rows.filter((x) => x.status === "half-closed").length} 闭=${roster.rows.filter((x) => x.status === "closed").length}`);
  s(`RULINGMENU_MENU ${menuPath} 渲染条目=${oldMenu.items.size}`);
  const menuNums = new Set([...oldMenu.items.keys()]);
  const openNums = new Set(roster.open.map((x) => numOf(x.id)));
  const lack = [...openNums].filter((n) => !menuNums.has(n));
  const extra = [...menuNums].filter((n) => !openNums.has(n));
  for (const n of lack) s(`RULINGMENU_MISSING №${n} — 名册 status=open 但菜单没印 ⇒ 用户没有裁到它的机会（${(roster.open.find((x) => numOf(x.id) === n) || {}).title || ""}）`);
  for (const n of extra) s(`RULINGMENU_STALE №${n} — 菜单印了但名册已不是 open ⇒ 菜单会变成第二本账`);
  /* 文字也要比：id 还在但名册后来改了 title/options，用户就会按旧措辞回答——
     菜单少一条会被发现，措辞旧一条不会，所以这里一并判。 */
  const textDrift = [];
  for (const r of roster.open) {
    const n = numOf(r.id);
    const old = oldMenu.items.get(n);
    if (!old) continue;
    if (old.title !== r.title || (old.options && old.options !== r.options)) textDrift.push(n);
  }
  for (const n of textDrift) s(`RULINGMENU_TEXTDRIFT №${n} — 菜单文字与名册当前 title/options 不一致 ⇒ 用户会按旧措辞回答`);
  const bad = lack.length + extra.length + textDrift.length;
  s(bad ? `${RK}=FAIL 守恒不成立 缺=${lack.length} 多=${extra.length} 文字旧=${textDrift.length}（菜单 ≠ 名册 open 集合与其当前文字）` : `${RK}=PASS open=${roster.open.length} 菜单=${menuNums.size} 缺=0 多=0 文字旧=0`);
  return { code: bad ? 1 : 0, out };
}

/* ── --selftest：少印必须红、补上必须绿；多印也必须红 ── */
if (flag("selftest")) {
  const FX = join(REPO, "tmp", "qa", "fixtures", "rulingmenu");
  rmSync(FX, { recursive: true, force: true });
  mkdirSync(FX, { recursive: true });
  const roster = [
    "PENDING_RULINGS_BEGIN producedBy=selftest",
    "RULING id=decisions#30 status=open title=甲事 options=(a)X|(b)Y",
    "RULING id=decisions#31 status=open title=乙事 options=(a)X|(b)Y premise=unchanged basis=\"册子 §2：这一整段是记账元数据，不该出现在选项行里\"",
    "RULING id=decisions#32 status=closed title=已闭 options=(a)X",
    "RULING id=decisions#69 status=open title=丙事（这条就是要被漏掉的那条） options=(a)接受|(b)不接受|(c)接受但分档",
    "PENDING_RULINGS_END open=3 half_closed=0 closed=1",
  ].join("\n");
  const rp = join(FX, "decisions.md");
  writeFileSync(rp, roster);
  const menuShort = ["# 待裁清单（机器派生，2 条）", "", "## A 类·测试", "", "**1. №30 — 甲事**", "  (a)X|(b)Y", "", "**2. №31 — 乙事**", "  (a)X|(b)Y", ""].join("\n");
  const menuFull = menuShort.replace("（机器派生，2 条）", "（机器派生，3 条）") + "\n**3. №69 — 丙事（这条就是要被漏掉的那条）**\n  (a)接受|(b)不接受|(c)接受但分档\n";
  const menuStale = menuFull + "\n**4. №32 — 已闭**\n  (a)X\n";
  const mk = (name, body) => { const p = join(FX, name); writeFileSync(p, body); return p; };
  const cases = [
    ["少印一条 ⇒ 红并点名 #69", mk("menu-short.md", menuShort), 1, "RULINGMENU_MISSING №69"],
    ["补齐 ⇒ 绿", mk("menu-full.md", menuFull), 0, `${RK}=PASS open=3`],
    ["多印已闭案条目 ⇒ 红", mk("menu-stale.md", menuStale), 1, "RULINGMENU_STALE №32"],
    ["菜单文件根本不存在 ⇒ 红", join(FX, "no-such-menu.md"), 1, "菜单文件不存在"],
    ["名册读不到 ⇒ NOT-EVIDENCED（不给绿）", mk("menu-full2.md", menuFull), 2, `${RK}=NOT-EVIDENCED`],
  ];
  let ok = 0;
  for (const [name, menuPath, want, wantIn] of cases) {
    const rp2 = want === 2 ? join(FX, "no-such-roster.md") : rp;
    const r = checkOne(rp2, menuPath, () => {});
    const hit = r.out.some((l) => l.includes(wantIn));
    const pass = r.code === want && hit;
    ok += pass ? 1 : 0;
    console.log(`${pass ? "PASS" : "FAIL"}  ${name} 期望exit=${want}/含"${wantIn}" 实测exit=${r.code}/命中=${hit}`);
    if (!pass) console.log(`      判决行=${r.out.slice(-2).join(" ⏎ ")}`);
  }
  /* 再实跑一次"补录渲染"：漏印那条必须被放进补录节，且守恒行自证 */
  const rr = readRoster(rp), om = readMenu(mk("menu-short2.md", menuShort));
  const out = render(rr, om, "selftest", verOf(rp));
  const rendered = out.text.includes("№69") && out.missing.join(",") === "69" && new RegExp(`渲染=${rr.open.length}`).test(out.text);
  ok += rendered ? 1 : 0;
  console.log(`${rendered ? "PASS" : "FAIL"}  派生会把漏印的 №69 补进"机器补录"节且守恒行自证（补录=非破坏式，不重排既有分组）`);
  /* 记账元数据不许混进选项行：头一行声称"没有改写任何选项文字"，混进去那句话就是假话 */
  const itemLines = out.text.split(/\r?\n/).filter((l) => /^\s+\(a\)/.test(l));
  const clean = itemLines.length === rr.open.length && !itemLines.some((l) => /premise=|basis=/.test(l)) && itemLines.some((l) => l.trim() === "(a)X|(b)Y");
  ok += clean ? 1 : 0;
  console.log(`${clean ? "PASS" : "FAIL"}  名册行尾的 premise=/basis= 不渗进菜单选项行（选项条数=${itemLines.length}/待裁=${rr.open.length}）`);

  /* ── 追加式 --write：走真入口（spawn），不许只测内部函数 ── */
  const SELF = join(HERE, "emit-ruling-menu.mjs");
  const runW = (menuFile, rosterFile = rp) => {
    const r = spawnSync(process.execPath, [SELF, "--roster", rosterFile, "--menu", menuFile, "--write"], { encoding: "utf8" });
    return { code: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
  };
  const appendix = ["", "## 实测补充（真档在跑时量的）", "", "- **U3**：某端点不带 token = 401，这是回答 №31 时要看的事实。", "- **U4**：库里已有 7 个「未认证+无出生日期」账号，铺号前提被削弱。"].join("\n");
  const withApp = mk("menu-appendix.md", menuShort + "\n" + appendix + "\n");
  const w1 = runW(withApp);
  const after = readFileSync(withApp, "utf8");
  const kept = w1.code === 0 && appendix.split(/\r?\n/).filter((l) => l.startsWith("- **")).every((l) => after.includes(l)) && after.includes("№69") && after.includes("## 实测补充");
  ok += kept ? 1 : 0;
  console.log(`${kept ? "PASS" : "FAIL"}  --write 是追加式：老菜单的"实测补充"整节逐行留在原地，同时补上 №69（我第一版就是在这里把附注吞掉的）`);
  const w2 = runW(withApp);
  const idem = w2.code === 0 && readFileSync(withApp, "utf8") === after;
  ok += idem ? 1 : 0;
  console.log(`${idem ? "PASS" : "FAIL"}  --write 幂等：连跑两次字节一致（不幂等的生成器会把"重跑一次"变成一次改写）`);
  const rp2 = join(FX, "decisions-title-changed.md");
  writeFileSync(rp2, roster.replace("title=甲事", "title=甲事（名册里改过措辞）"));
  const td = checkOne(rp2, withApp, () => {});
  const tdHit = td.out.some((l) => l.includes("RULINGMENU_TEXTDRIFT №30"));
  ok += td.code === 1 && tdHit ? 1 : 0;
  console.log(`${td.code === 1 && tdHit ? "PASS" : "FAIL"}  名册改了措辞而菜单还是旧文字 ⇒ 判红并点名（id 对得上不代表看得懂）`);
  const w3 = runW(withApp, rp2);
  const fixed = w3.code === 0 && readFileSync(withApp, "utf8").includes("№30 — 甲事（名册里改过措辞）");
  ok += fixed ? 1 : 0;
  console.log(`${fixed ? "PASS" : "FAIL"}  --write 会把过期条目就地刷新（序号不动，只换文字）`);
  /* 散文计数句：实测盘上那份写着"合计列出 27 条，名册实际 open=27（一致）"而名册是 28。
     这种"自称已核"的一行必须撤掉，且撤掉的原文要有地方看得见——不能蒸发。 */
  const lying = mk("menu-lying.md", menuShort + "\n合计列出 2 条，名册实际 open=2（一致）。\n" + appendix + "\n");
  const w4 = runW(lying);
  const afterL = readFileSync(lying, "utf8");
  const scrub = w4.code === 0 && !/^合计列出/m.test(afterL) && afterL.includes("撤掉的散文计数") && afterL.includes("名册实际 open=2（一致）") && afterL.includes("## 实测补充");
  ok += scrub ? 1 : 0;
  console.log(`${scrub ? "PASS" : "FAIL"}  自称一致的散文计数句被撤走、原文抄进守恒自证、附注仍在（假"已核过"不许留在人回答的地方）`);
  rmSync(FX, { recursive: true, force: true });
  const total = cases.length + 7;
  console.log(`\nRULINGMENU_SELFTEST=${ok === total ? "PASS" : "FAIL"} ${ok}/${total}`);
  process.exit(ok === total ? 0 : 1);
}

const ROSTER = resolve(arg("roster", ""));
const MENU = resolve(arg("menu", join(dirname(ROSTER), "ruling-menu-v38.md")));
if (!existsSync(ROSTER)) { console.log(`${RK}=NOT-EVIDENCED reason=--roster 读不到`); process.exit(2); }

if (flag("write")) {
  const roster = readRoster(ROSTER);
  if (roster.err || !roster.selfAgree) { console.log(`${RK}=FAIL reason=名册不可信（${roster.err || "块尾自述与逐行数不一致"}）⇒ 拒绝据它生成菜单`); process.exit(1); }
  const old = existsSync(MENU) ? readMenu(MENU) : null;
  const srcLabel = `${MENU.replace(/^.*[\\/]/, "")} ← ${ROSTER.replace(/^.*[\\/]/, "")}`;
  const ver = verOf(ROSTER);
  const r = old ? mergeIntoOld(roster, old, readFileSync(MENU, "utf8"), srcLabel, ver)
                : render(roster, null, srcLabel, ver);
  writeFileSync(MENU, r.text.endsWith("\n") ? r.text : r.text + "\n", "utf-8");
  console.log(`${RK}=WRITTEN ${MENU} open=${roster.open.length} 补录节=${r.missing.length}（本轮新增 ${r.fresh.length}${r.fresh.length ? "：№" + r.fresh.join("、№") : ""}）就地刷新=${r.rewritten || 0} 撤散文计数=${r.scrubbed || 0} 移除=${r.stale.length}`);
  const re = checkOne(ROSTER, MENU, () => {});
  console.log(`RULINGMENU_POSTCHECK ${re.code === 0 ? "守恒成立" : "仍不守恒（见 --check）"} exit=${re.code}`);
  process.exit(re.code);
}
process.exit(checkOne(ROSTER, MENU).code);
