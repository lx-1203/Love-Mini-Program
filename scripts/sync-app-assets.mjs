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
const MYSQL = "D:/mysql-8.0.45-winx64/bin/mysql.exe";
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
  for (const f of collectFiles(srcDir, srcDir)) {
    all.push({ abs: f.abs, rel: join(destBase, f.rel) });
  }
}

if (all.length === 0) {
  console.error("[sync-app-assets] 备份目录为空，无法同步");
  process.exit(1);
}

// 1. 拷贝到 uploads/app-assets/{rel}
for (const f of all) {
  const target = join(DEST, f.rel);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(f.abs, target);
}
console.log(`[sync-app-assets] 已拷贝 ${all.length} 个文件 → ${DEST}`);

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
