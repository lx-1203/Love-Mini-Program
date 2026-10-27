import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 管理员口令静态门（2026-10-25 P0 收口）。
 *
 * 背景：Flyway 迁移链曾把公开口令写进 users.password。此门不修改已应用迁移，
 * 而是做两件事：
 *   1) 新迁移若再写非 BCrypt 口令字面量，直接红；
 *   2) 历史危险值只允许出现在登记过的 grandfather 文件中，且必须有补偿迁移
 *      把这些账号置为 disabled / password=NULL。
 *
 * 历史文件不能改（Flyway checksum），所以 grandfather 是显式例外，不是免检：
 * 每条例外都绑定它当初写入的危险值；文件被改动或例外被滥用都会红。
 */

const SQL_DIR = fileURLToPath(new URL("../database/flyway/sql/", import.meta.url));
const REPO = fileURLToPath(new URL("../", import.meta.url));
const files = readdirSync(SQL_DIR).filter((name) => name.endsWith(".sql")).sort();

/**
 * 「在盘上」不等于「在库里」：Flyway 按盘上文件应用，所以一条只存在于工作树的迁移
 * 会让本地库和干净 checkout 的库长出不一样的一生，而本门的 existsSync 判据照样绿。
 * 2026-10-27 实测：V2026.10.26.0001__disable_public_test_admin.sql 在盘上、不在 HEAD
 * ⇒ 从空库跑完整**已入库**迁移链得到的是「active + 仓库里公开的口令」，
 * 而本机已被那条未入库迁移手工收口 ⇒ 每一项本地探针都是绿的。
 * 判据因此改为 git ls-files：干净 checkout 拿不到的东西不算存在。
 */
const trackedSqlNames = new Set(
  execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "--", "database/flyway/sql"], {
    cwd: REPO,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((p) => p.split("/").pop()),
);

/** 历史危险迁移：文件 -> 它当初写入的危险字面量（必须是唯一且仍存在）。 */
const GRANDFATHERED = new Map([
  [
    "V2026.08.07.0004__seed_super_test_account.sql",
    ["Admin@12345"],
  ],
  [
    "V2026.08.07.0019__reset_super_admin_password.sql",
    ["$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe"],
  ],
  [
    "V2026.08.09.0009__harden_super_admin_account.sql",
    [
      "47e0623afa20f48d5e8c396e87af741e5496f554e4334ec5b19fb929f24708cb",
      "Admin@12345",
      "$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe",
    ],
  ],
]);

const KNOWN_DANGEROUS_LITERALS = [
  "Admin@12345",
  "47e0623afa20f48d5e8c396e87af741e5496f554e4334ec5b19fb929f24708cb",
  "$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe",
];

const SET_PASSWORD_RE = /\bSET\s+password\s*=\s*'([^']*)'/giu;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/u;
const PLACEHOLDER_RE = /^\$\{[^}]+\}$/u;

/** 去掉 SQL 注释：文档里解释漏洞时不可避免地会引用危险值，不能把注释当可执行写入。 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/--[^\n]*/gu, "");
}

/**
 * 扫描一段 SQL，返回违规描述。纯函数，便于正/负对照。
 * @param {string} sql
 * @param {string} label
 * @returns {string[]}
 */
function findViolations(sql, label, allowed = []) {
  const violations = [];
  for (const match of sql.matchAll(SET_PASSWORD_RE)) {
    const literal = match[1];
    if (PLACEHOLDER_RE.test(literal) || BCRYPT_RE.test(literal)) continue;
    if (allowed.includes(literal)) continue;
    violations.push(`${label}: SET users.password 写了非 BCrypt 字面量（${literal.slice(0, 12)}…）`);
  }
  return violations;
}

/** 历史危险值：只允许出现在对应 grandfather 文件里。 */
function findDangerousLiteral(sql, label, allowed = []) {
  const violations = [];
  for (const literal of KNOWN_DANGEROUS_LITERALS) {
    if (sql.includes(literal) && !allowed.includes(literal)) {
      violations.push(`${label}: 出现已知泄露口令字面量（${literal.slice(0, 12)}…）`);
    }
  }
  return violations;
}

// 1) grandfather 文件必须仍在盘上，且仍含其登记的危险值（防止例外清单腐化）
for (const [file, literals] of GRANDFATHERED) {
  const absolute = join(SQL_DIR, file);
  assert.ok(
    trackedSqlNames.has(file) && existsSync(absolute),
    `grandfather 文件不在库里或不在盘上：${file}（应删除该例外或恢复文件）`,
  );
  const sql = stripComments(readFileSync(absolute, "utf8"));
  for (const literal of literals) {
    assert.ok(
      sql.includes(literal),
      `grandfather 文件 ${file} 已不再包含登记的危险值，例外清单需同步收缩`,
    );
  }
}

// 2) 所有迁移：新写非 BCrypt 口令必红；已知泄露值只许出现在登记文件
const violations = [];
for (const file of files) {
  const sql = stripComments(readFileSync(join(SQL_DIR, file), "utf8"));
  const allowed = GRANDFATHERED.get(file) ?? [];
  violations.push(...findViolations(sql, file, allowed));
  violations.push(...findDangerousLiteral(sql, file, allowed));
}
assert.deepEqual(violations, [], `管理员口令静态门未通过：\n${violations.join("\n")}`);

// 3) 补偿迁移必须**入库**且真的把公开账号关掉（盘上有不算：干净 checkout 拿不到它，等于没有）
const COMPENSATING_NAME = "V2026.10.26.0001__disable_public_test_admin.sql";
const compensating = join(SQL_DIR, COMPENSATING_NAME);
assert.ok(
  trackedSqlNames.has(COMPENSATING_NAME),
  `补偿迁移 ${COMPENSATING_NAME} 未入库（只在盘上）⇒ 空库跑已入库迁移链仍会产出公开口令超管`,
);
assert.ok(existsSync(compensating), `缺少补偿迁移 ${COMPENSATING_NAME}`);
const fixSql = readFileSync(compensating, "utf8");
assert.match(
  fixSql,
  /openid\s*=\s*'local-dev-admin-openid-123456'/u,
  "补偿迁移必须按公开 openid 精确圈定账号",
);
assert.match(fixSql, /status\s*=\s*'disabled'/u, "补偿迁移必须把账号置为 disabled");
assert.match(fixSql, /password\s*=\s*NULL/u, "补偿迁移必须清空公开口令");

// 4) 正/负对照：证明门本身不是空转
assert.deepEqual(
  findViolations("UPDATE users SET password = 'plain' WHERE id=1;", "synthetic"),
  ["synthetic: SET users.password 写了非 BCrypt 字面量（plain…）"],
  "负对照失败：非 BCrypt 字面量未被识别",
);
assert.deepEqual(
  findViolations(
    "UPDATE users SET password = '$2a$10$CjX5HfkDnKv7gfy6oGi3g.PWizPQ2D1h1QO6D/yhqwmm/dGOJ8TYe' WHERE id=1;",
    "synthetic",
  ),
  [],
  "正对照失败：合法 BCrypt 字面量被误判",
);
assert.deepEqual(
  findViolations("UPDATE users SET password = '${admin_password_hash}' WHERE id=1;", "synthetic"),
  [],
  "正对照失败：Flyway 占位符被误判",
);
assert.deepEqual(
  findDangerousLiteral("INSERT INTO users (password) VALUES ('Admin@12345');", "synthetic"),
  ["synthetic: 出现已知泄露口令字面量（Admin@12345…）"],
  "负对照失败：已知泄露字面量未被识别",
);
assert.deepEqual(
  findDangerousLiteral(stripComments("-- Admin@12345 是历史漏洞值"), "synthetic"),
  [],
  "正对照失败：SQL 注释里的漏洞说明不应被当成可执行写入",
);

console.log(
  `ADMIN_CREDENTIAL_GATE=OK files=${files.length} grandfathered=${GRANDFATHERED.size} ` +
  `compensating=V2026.10.26.0001`,
);
