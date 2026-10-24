#!/usr/bin/env node
/* verify-asset-registry.mjs —— 素材注册表与磁盘的双向对账门（2026-10-24）。
 *
 * 为什么单独一把：verify-app-assets-coverage 走的是"包内引用 → HTTP 取不取到、字节对不对"，
 * 它**看不见注册表自己烂掉**：一条 media_asset 行指向的件如果不存在，只要没人引用它，
 * 门就永远是绿的。2026-10-24 实测到 370 条这样的幽灵行（uploads 无件 + 包内无件 +
 * 客户端/后台 0 引用），它们不报错、不 404，只是让注册表面虚高、并让"同步过了"被误读成"素材齐了"。
 *
 * 两个方向，判法不同（这是本门唯一需要判断的地方）：
 *   行在件不在 = 硬红。注册了却取不到，是"承诺了没有的东西"。
 *   件在行不在 = 只报不红。盘上有件没注册，多数是刻意备份件（*.bak-*）与已弃用残留，
 *                它们本来就不该被服务；判红会逼人删备份，那是更坏的结果。
 *   路径泄漏（桶名套在自己映射基名之下）= 硬红。判据与 sync-app-assets.mjs 的守卫逐字一致。
 *
 * 用法：node scripts/qa/verify-asset-registry.mjs [--urls <file>] [--uploads <dir>]
 *          [--pkg-static <dir>] [--self-test]
 *        不给 --urls 时自己查库（需 mysql 客户端与 .env 的 DB_URL/DB_USERNAME/DB_PASSWORD）。
 * 机器行：ASSETREG_RESULT=PASS|FAIL|NOT-EVIDENCED rows=N noFile=N fileNoRow=N leak=N
 * 退出码：0 干净 / 1 有硬红 / 2 量不到（查不了库、目录读不到）——量不到不得当达标。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d; };
const SELFTEST = process.argv.includes("--self-test");
const UPLOADS = resolve(REPO, arg("uploads", "apps/api/uploads/app-assets"));
const PKG = resolve(REPO, arg("pkg-static", "apps/client/src/static"));
const norm = (p) => String(p).trim().split(/[\\/]+/).join("/");

/* sync 的桶映射表——与 scripts/sync-app-assets.mjs 的表逐字对齐（改那边要改这里）。
   泄漏判的是"映射基名**之后**还出现桶名"，不是"任何一段等于桶名"：
   generated 桶的目标基名本身就是 generated，按后者判会误杀 18 个合法路径（实测错过一次）。 */
const BUCKET_MAP = [["generated", "generated"], ["assets-images", "assets/images"]];
const isLeak = (rel) => {
  const s = norm(rel).split("/");
  for (const [bucket, base] of BUCKET_MAP) {
    const bs = base.split("/");
    if (bs.length <= s.length && bs.every((x, i) => s[i] === x) && s.slice(bs.length).includes(bucket)) return true;
  }
  return false;
};

function walkFiles(root, d = root, out = []) {
  if (!existsSync(root)) return out;
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walkFiles(root, f, out);
    // 相对**根**算，不是相对当前子目录——第一版写成 relative(d,f)，
    // 把 1349 个带目录的路径塌成 1175 个裸文件名，注册表比对当场虚报 1342 条 noFile。
    else out.push(norm(relative(root, f)));
  }
  return out;
}

/** 从库里取 app_asset 的 rel（去掉 /api/v1/media/app-assets/ 前缀）。 */
function queryUrls() {
  let env;
  try { env = readFileSync(join(REPO, ".env"), "utf8").replace(/\r/g, ""); }
  catch (e) { return { err: `.env 读不到：${e.message}` }; }
  const g = (k) => { const m = env.match(new RegExp("^\\s*" + k + "\\s*=\\s*(.*)$", "m")); if (!m) return ""; let v = m[1].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); return v; };
  const mm = g("DB_URL").match(/jdbc:mysql:\/\/([^:/]+):?(\d*)\/([^?]+)/);
  if (!mm) return { err: "DB_URL 不是 jdbc:mysql 形态，查不了库" };
  try {
    const out = execFileSync(process.env.MYSQL_BIN || "mysql",
      ["-h" + mm[1], "-P" + (mm[2] || "3306"), "-u" + g("DB_USERNAME"), "-D" + mm[3], "-N",
       "-e", "SELECT SUBSTRING_INDEX(url,'app-assets/',-1) FROM media_asset WHERE type='app_asset';"],
      { encoding: "utf8", env: { ...process.env, MYSQL_PWD: g("DB_PASSWORD") }, maxBuffer: 64e6 });
    return { urls: out.split(/\r?\n/).map(norm).filter(Boolean) };
  } catch (e) { return { err: `mysql 调用失败：${String(e.message).slice(0, 120)}` }; }
}

const disk0 = new Set(walkFiles(UPLOADS));
/* --self-test：阳性对照。判"行在件不在"的尺必须先能抓到一条假的，
   否则"noFile=0"可能只是因为尺根本没在看（本仓对零命中仪表记过多次账）。 */
if (SELFTEST) {
  // 挑一个**带子目录**的真件做对照：只用根层文件（如 default-avatar.png）当阳性对照，
  // 抓不出"路径塌成裸文件名"这类 bug——上一版就是这么带着 1342 条虚报跑过去的。
  const nested = walkFiles(UPLOADS).find((p) => p.includes("/") && disk0.has(p));
  const cases = [
    ["assets/images/covers/definitely-not-here-7c2b.png", true, "不存在的件必须判 noFile"],
    [nested || "", false, "带子目录的真件不该判 noFile（防路径塌成裸名）"],
    ["assets/images/assets-images/covers/x.png", false, "泄漏形态不该判 noFile，该判 leak"],
  ];
  let ok = 0, tot = 0;
  for (const [u, want, why] of cases) {
    if (!u) { console.log(`SELFTEST SKIP ${why}（盘上没找到带子目录的件）`); continue; }
    tot += 1;
    if (u === "assets/images/assets-images/covers/x.png") { const got = isLeak(u); ok += got === true ? 1 : 0; console.log(`${got ? "PASS" : "FAIL"}  ${why}`); continue; }
    const got = !disk0.has(norm(u));
    ok += got === want ? 1 : 0;
    console.log(`${got === want ? "PASS" : "FAIL"}  ${why}  ${u} → noFile=${got}`);
  }
  // 泄漏判据的两侧：合法 generated 路径不许误判，嵌套桶名必须判住
  tot += 2;
  const a = isLeak("generated/images/activities/art-exhibition.jpg"), b = isLeak("generated/generated/x.png");
  ok += a === false ? 1 : 0; console.log(`${a === false ? "PASS" : "FAIL"}  generated 桶目标基名自身不算泄漏（第一版在此误杀 18 个）`);
  ok += b === true ? 1 : 0; console.log(`${b === true ? "PASS" : "FAIL"}  基名之下再套桶名必须判泄漏`);
  console.log(`ASSETREG_SELFTEST=${ok === tot ? "PASS" : "FAIL"} ${ok}/${tot}`);
  process.exit(ok === tot ? 0 : 1);
}

let urls;
if (arg("urls")) {
  try { urls = readFileSync(resolve(REPO, arg("urls")), "utf8").split(/\r?\n/).map(norm).filter(Boolean); }
  catch (e) { console.log(`ASSETREG_RESULT=NOT-EVIDENCED reason=--urls 读不到（${e.message}）⇒ 量不到不得当达标`); process.exit(2); }
} else {
  const r = queryUrls();
  if (r.err) { console.log(`ASSETREG_RESULT=NOT-EVIDENCED reason=${r.err}`); process.exit(2); }
  urls = r.urls;
}
if (!urls.length) { console.log(`ASSETREG_RESULT=NOT-EVIDENCED reason=注册表取到 0 行 ⇒ 空集上恒过没有意义`); process.exit(2); }

const disk = new Set(walkFiles(UPLOADS));
const noFile = urls.filter((u) => !disk.has(u));
const leakDisk = [...disk].filter(isLeak);
const fileNoRow = [...disk].filter((f) => !urls.includes(f));

console.log(`ASSETREG 注册行=${urls.length} 磁盘件=${disk.size} 行在件不在=${noFile.length} 件在行不在=${fileNoRow.length} 路径泄漏=${leakDisk.length}`);
for (const u of noFile.slice(0, 10)) console.log(`ASSETREG_ROW_NO_FILE ${u}`);
for (const u of leakDisk.slice(0, 10)) console.log(`ASSETREG_LEAK ${u}`);
for (const u of fileNoRow.slice(0, 6)) console.log(`ASSETREG_NOTE_FILE_UNREGISTERED ${u}（只报不红：多为刻意备份/已弃用残留）`);
const hardRed = noFile.length + leakDisk.length;
console.log(`ASSETREG_RESULT=${hardRed === 0 ? "PASS" : "FAIL"} rows=${urls.length} noFile=${noFile.length} fileNoRow=${fileNoRow.length} leak=${leakDisk.length}`);
process.exit(hardRed === 0 ? 0 : 1);
