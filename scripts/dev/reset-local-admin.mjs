#!/usr/bin/env node
/**
 * 本地开发：给公开测试超管 openid 写入一个新的强口令并重新启用。
 *
 * 背景：V2026.10.26.0001 会把 local-dev-admin-openid-123456 置为 disabled、password=NULL，
 * 这是生产安全收口。本地 QA/联调仍需要这个账号时，用本脚本注入一个**仓库里不存在**的
 * 新口令（BCrypt），不要把任何口令写回源码或迁移。
 *
 * 用法（默认只预览，不改库）：
 *   LOCAL_ADMIN_PASSWORD='<至少12位含大小写数字特殊字符>' \
 *   DB_PASSWORD='<数据库口令>' \
 *   node scripts/dev/reset-local-admin.mjs --apply
 *
 * 可选环境变量：
 *   LOCAL_ADMIN_OPENID   默认 local-dev-admin-openid-123456
 *   DB_HOST/DB_PORT/DB_NAME/DB_USERNAME  默认 127.0.0.1/3306/campus_love/campus
 *   MYSQL_BIN            默认 mysql
 *
 * 依赖：本机 python 的 bcrypt 模块（本仓已有 Python 图像脚本，故沿用）。
 * 仅限本地/测试库；生产环境禁止运行（脚本会在 NODE_ENV=production 时拒绝）。
 */
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const openidArg = args.find((a) => a.startsWith("--openid="));
const openid = openidArg ? openidArg.slice("--openid=".length) : (process.env.LOCAL_ADMIN_OPENID || "local-dev-admin-openid-123456");
const password = process.env.LOCAL_ADMIN_PASSWORD || "";

const host = process.env.DB_HOST || "127.0.0.1";
const port = process.env.DB_PORT || "3306";
const database = process.env.DB_NAME || "campus_love";
const user = process.env.DB_USERNAME || "campus";
const dbPassword = process.env.DB_PASSWORD || "";
const mysqlBin = process.env.MYSQL_BIN || "mysql";

function fail(message) {
  console.error(`RESET_LOCAL_ADMIN=FAIL ${message}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  fail("拒绝在 NODE_ENV=production 下运行；本脚本只用于本地/测试库");
}
if (!/^[A-Za-z0-9._:-]+$/u.test(openid)) {
  fail("openid 只允许字母、数字、点、下划线、冒号、连字符");
}
if (!password) {
  fail("缺少 LOCAL_ADMIN_PASSWORD（不提供默认口令）");
}
if (password.length < 12
    || !/[a-z]/u.test(password)
    || !/[A-Z]/u.test(password)
    || !/\d/u.test(password)
    || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/u.test(password)) {
  fail("新口令至少 12 位，且包含大写、小写、数字、特殊字符");
}
if (!dbPassword) {
  fail("缺少 DB_PASSWORD");
}

// 口令走 stdin，不进 argv；hash 只在本进程内存与 SQL 里出现
const hashResult = spawnSync(
  "python",
  ["-c", "import bcrypt,sys; pw=sys.stdin.read(); print(bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=10)).decode())"],
  { input: password, encoding: "utf8" },
);
if (hashResult.status !== 0 || !hashResult.stdout.trim().startsWith("$2")) {
  fail(`生成 BCrypt 失败（需要 python bcrypt）：${String(hashResult.stderr || "").slice(0, 200)}`);
}
const hash = hashResult.stdout.trim();

function mysql(sql, { quiet = false } = {}) {
  const result = spawnSync(
    mysqlBin,
    ["-h", host, "-P", port, "-u", user, database, "--batch", "--raw", "-e", sql],
    {
      env: { ...process.env, MYSQL_PWD: dbPassword },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    fail(`mysql 执行失败：${String(result.stderr || result.stdout || "").slice(0, 300)}`);
  }
  if (!quiet) process.stdout.write(result.stdout || "");
  return result.stdout || "";
}

const exists = mysql(
  `SELECT id, status FROM users WHERE openid='${openid}' LIMIT 1;`,
  { quiet: true },
).trim();
if (!exists) {
  fail(`找不到 openid=${openid} 的账号；请先跑完 Flyway 迁移链`);
}

if (!apply) {
  console.log(`RESET_LOCAL_ADMIN=DRY openid=${openid} hash=${hash.slice(0, 7)}…`);
  console.log("未改库。确认后加 --apply 执行。");
  process.exit(0);
}

mysql(
  `UPDATE users SET status='active', password='${hash}', updated_at=NOW() WHERE openid='${openid}';`,
  { quiet: true },
);
const check = mysql(
  `SELECT id, status, LEFT(password, 7) AS hash_prefix FROM users WHERE openid='${openid}' LIMIT 1;`,
  { quiet: true },
).trim();
console.log(`RESET_LOCAL_ADMIN=OK openid=${openid}`);
console.log(check);
console.log("口令未写入仓库；请勿把 LOCAL_ADMIN_PASSWORD 或哈希提交到版本库。");
