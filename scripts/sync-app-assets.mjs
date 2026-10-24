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
 *   node scripts/sync-app-assets.mjs              # 拷贝 + 打印 SQL
 *   node scripts/sync-app-assets.mjs --apply      # 拷贝 + 直接执行 SQL（需 mysql 客户端与连接参数）
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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

/* 路径泄漏守卫：桶目录名不该出现在**自己映射后的目标基名之下**。
   历史事故是有人把源根写成 BACKUP 本身（而不是 BACKUP/assets-images），
   于是 rel 变成 assets/images/assets-images/covers/x.png —— 与规范路径
   assets/images/covers/x.png **字节相同、路径不同**，两代并存：
   110 个文件 + 110 条 media_asset 注册行，且被服务的那条恰好是旧原图，
   直接表现为"包内已压缩、后端还在发原图"的字节漂移（2026-10-24 结案）。
   这类东西不会 404、不会报错，只会让画面静默回退，所以在这里当场拦死。

   注意判的是"映射基名**之后**还出现桶名"，不是"路径里任何一段等于桶名"——
   generated 桶的目标基名本身就是 generated，按后者判会把 18 个合法路径
   （generated/images/activities/art-exhibition.jpg 等）全部误杀，
   第一版就是这么错的，实测拦下后修正。 */
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
