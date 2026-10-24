#!/usr/bin/env node
/**
 * sync-app-assets.mjs — 本地联调：装饰资产 → 后端 uploads/app-assets + media_asset 注册（2026-08-10）
 *
 * real profile 下 <image> 访问 /api/v1/media/app-assets/{relpath} 需满足：
 *   1. 磁盘存在 {storage-root}/app-assets/{relpath}（storage-root 默认 ./uploads，相对后端进程 CWD）
 *   2. media_asset 表存在 url='/api/v1/media/app-assets/{relpath}' 且 type='app_asset'
 *      audit_status='approved' 的注册记录
 *
 * 本脚本：
 *   1. 从 apps/client/static-local-backup/{generated,assets-images} 拷贝全部文件
 *      → {apps/api}/uploads/app-assets/（目录结构 = static 的相对路径）
 *   2. 按拷贝清单生成 INSERT 注册 SQL（幂等：先 DELETE 再 INSERT），
 *      打印可执行语句；默认输出到 stdout，可用 --apply 直接写库
 *
 * 用法：
 *   node scripts/sync-app-assets.mjs                   # 拷贝 + 打印 SQL
 *   node scripts/sync-app-assets.mjs --dry-run         # 什么都不写，只报同步集与桶漂移
 *   node scripts/sync-app-assets.mjs --with-pkg-only    # 把"桶里没有、包内独有"的件也纳入同步集
 *   node scripts/sync-app-assets.mjs --apply           # 拷贝 + 直接执行 SQL（需 mysql 客户端与连接参数）
 *
 * 源优先级：apps/client/src/static/ 是真源，static-local-backup 的桶只是副本。
 * 两者同路径不同字节时一律取包内（2026-10-24：桶里 6 张圈子封面还是未压缩原图，
 * 谁跑一次 sync 就把裁定过的压缩版盖回原图）。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const BACKUP = join(REPO, "apps", "client", "static-local-backup");
const UPLOADS_ROOT = join(REPO, "apps", "api", "uploads");
const DEST = join(UPLOADS_ROOT, "app-assets");
const URL_PREFIX = "/api/v1/media/app-assets/";

const APPLY = process.argv.includes("--apply");
/* --dry-run 以前只挡得住写库那一步，**拷贝照样落盘**（2026-10-24 实测：跑一次"dry-run"
   把 110 个副本写进了 uploads/app-assets，事后要靠 git status 才发现）。
   名字承诺"只看不做"，那就得真只看不做——这里把拷贝一起挡掉。 */
const DRY_RUN = process.argv.includes("--dry-run");
/* 桶里没有、包内独有的件默认**不**进同步集：实测桶只覆盖 134 件、包内这两个目录有 726 件，
   默认全补等于把 --apply 的落盘面和注册面一次放大 5 倍，这比"修漂移"要的范围大得多。
   要真做全量补齐，显式加 --with-pkg-only；不加时只点名数量，让人自己决定。 */
const WITH_PKG_ONLY = process.argv.includes("--with-pkg-only");
const MYSQL = process.env.MYSQL_BIN || "mysql"; // mysql 客户端走 PATH（或 MYSQL_BIN 显式指），不写盘符死路径
const DB_URL = "jdbc:mysql://127.0.0.1:3307/campus_love";

function collectFiles(dir, base, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, base, out);
    } else {
      out.push({ abs: full, rel: relative(base, full) });
    }
  }
  return out;
}

const all = [];
for (const [srcDir, destBase] of [
  [join(BACKUP, "generated"), "generated"],
  [join(BACKUP, "assets-images"), "assets/images"],
]) {
  const bucket = srcDir.split(/[\\/]/).pop();
  for (const f of collectFiles(srcDir, srcDir)) {
    all.push({ abs: f.abs, rel: join(destBase, f.rel), bucket, baseSegs: destBase.split(/[\\/]+/).length });
  }
}

if (all.length === 0) {
  console.error("[sync-app-assets] 备份目录为空，无法同步");
  process.exit(1);
}

/* 路径泄漏守卫见下方"同步集完全定好"之后——这里不能放，因为后面还会从包内补件，
   放前面会让补入的件绕过检查。 */

/* 比对口径与 verify-app-assets-coverage 同一把尺：文本型先归一行尾再比。
   不这么做的话，core.autocrlf 会让桶里 6 个 SVG 每次都被报成"与包内不一致"，
   把真正的 6 张封面漂移淹在噪声里——门和输入侧各用一套口径，就一定会互相打脸。 */
const TEXT_EXT = /\.(svg|js|cjs|mjs|ts|css|scss|json|html|txt|md)$/i;
const deol = (buf) => buf.toString("binary").replace(/\r\n/g, "\n");
const sameContent = (a, b, name) => (a.equals(b) ? true : TEXT_EXT.test(name) ? deol(a) === deol(b) : false);

/* 包内优先：cdn 素材的唯一真源是 apps/client/src/static/，备份桶只是它的副本。
   实测桶会烂——2026-10-24 查出 assets-images 桶里 6 张圈子封面还是**未压缩原图**
   （桶 292K–380K vs 包内 36K–48K），谁跑一次 sync 就把裁定过的压缩版盖回原图、资产门当场变红。
   与其定期人肉归一桶，不如让同步自己以包内为准：桶与包内不一致 ⇒ 取包内并点名。 */
const PKG_STATIC = join(REPO, "apps", "client", "src", "static");
const norm2 = (p) => String(p).split(/[\\/]+/).join("/");
let bucketStale = 0, pkgOnly = 0;
for (const e of all) {
  const pkg = join(PKG_STATIC, norm2(e.rel));
  if (!existsSync(pkg)) continue;
  let same = false;
  try { same = sameContent(readFileSync(e.abs), readFileSync(pkg), norm2(e.rel)); } catch { same = false; }
  if (!same) { bucketStale++; e.srcWas = e.abs; e.abs = pkg; }
}
if (bucketStale) {
  console.log(`[sync-app-assets] SYNC_PKG_PRIORITY 桶与包内不一致=${bucketStale} 件 ⇒ 全部改取包内版本（桶是副本，不是真源）`);
  for (const e of all.filter((x) => x.srcWas).slice(0, 12)) {
    console.log(`[sync-app-assets] SYNC_OVERRIDE rel=${norm2(e.rel)} 桶=${statSync(e.srcWas).size}B 包内=${statSync(e.abs).size}B`);
  }
}

/* 桶里没有、包内有的件：默认只点名，加 --with-pkg-only 才补进同步集。 */
const have = new Set(all.map((e) => norm2(e.rel)));
for (const [srcDir, destBase] of [
  [join(BACKUP, "generated"), "generated"],
  [join(BACKUP, "assets-images"), "assets/images"],
]) {
  const base = norm2(destBase);
  for (const f of collectFiles(join(PKG_STATIC, base), join(PKG_STATIC, base))) {
    const rel = join(base, f.rel);
    if (have.has(norm2(rel))) continue;
    have.add(norm2(rel)); pkgOnly++;
    if (WITH_PKG_ONLY) all.push({ abs: f.abs, rel, bucket: srcDir.split(/[\\/]/).pop(), baseSegs: base.split("/").length, pkgOnly: true });
  }
}
if (pkgOnly) {
  console.log(`[sync-app-assets] SYNC_PKG_ONLY 桶里没有、包内已有 ${pkgOnly} 件 ⇒ ${WITH_PKG_ONLY ? "已按 --with-pkg-only 补入同步集" : "默认不入同步集（要全量补齐加 --with-pkg-only）"}`);
}

/* 泄漏守卫在这里跑，而不是在收集完备份桶之后——同步集后面还会从包内补件，
   守卫放前面就等于让补入的件绕过检查。判的是"映射基名**之后**还出现桶名"：
   历史事故是把源根写成 BACKUP 本身，rel 变成 assets/images/assets-images/covers/x.png，
   与规范路径字节相同、路径不同，两代并存 110 文件 + 110 注册行，被服务的恰好是旧原图。
   这类东西不 404、不报错，只让画面静默回退，所以当场拦死。 */
const leaked = all.filter((e) => String(e.rel).split(/[\\/]+/).slice(e.baseSegs).includes(e.bucket));
if (leaked.length) {
  console.error(`[sync-app-assets] SYNC_RESULT=FAIL reason=路径泄漏：${leaked.length} 个目标路径在映射基名之下又套了一层桶名（首个：${leaked[0].rel}）`);
  console.error("[sync-app-assets] 说明源根写错了——应逐个映射 BACKUP/<bucket> → 目标基名，而不是把 BACKUP 整棵拷进来。拒绝落盘。");
  process.exit(1);
}

// 1. 拷贝到 uploads/app-assets/{rel}
if (DRY_RUN) {
  console.log(`[sync-app-assets] DRY-RUN：跳过拷贝（本应写 ${all.length} 个文件到 ${DEST}）`);
} else {
  for (const f of all) {
    const target = join(DEST, f.rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(f.abs, target);
  }
  console.log(`[sync-app-assets] 已拷贝 ${all.length} 个文件 → ${DEST}`);
}

// 2. 生成注册 SQL（幂等：按本脚本写入的 url 清理后重建）
const paths = all.map((f) => f.rel.replace(/\\/g, "/"));
const whereClause = paths.map((p) => `url LIKE '${URL_PREFIX}${p}'`).join(" OR ");
const deleteSql = `DELETE FROM media_asset WHERE type='app_asset' AND (${whereClause});\n`;
const insertRows = paths
  .map((p) => {
    const name = p.split("/").pop();
    const mime = /\.png$/i.test(p) ? "image/png" : /\.(jpe?g)$/i.test(p) ? "image/jpeg" : "image/webp";
    return `  (0, 'app_asset', '/api/v1/media/app-assets/${p}', '${name}', '${mime}', 0, 400, 400, 'ready', 'approved', NOW())`;
  })
  .join(",\n");
const insertSql = `INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at) VALUES\n${insertRows};\n`;

if (!APPLY) {
  process.stdout.write(deleteSql + insertSql);
  console.error("[sync-app-assets] SQL 已打印；加 --apply 直接写库");
} else {
  const env = {
    ...process.env,
    DB_HOST: "127.0.0.1",
    DB_PORT: "3307",
    DB_USER: "root",
    DB_PASSWORD: "hyp5022940",
  };
  const dbArgs = ["-h127.0.0.1", "-P3307", "-uroot", "-phyp5022940", "campus_love"];
  execFileSync(MYSQL, [...dbArgs, "-e", deleteSql], { env, stdio: "inherit" });
  execFileSync(MYSQL, [...dbArgs, "-e", insertSql], { env, stdio: "inherit" });
  console.log(`[sync-app-assets] 已注册 ${paths.length} 条 media_asset 记录`);
}
