// 实体 ↔ 迁移链的静态对账门（2026-10-31，第四轮审查）。
//
// 这扇门存在的理由是一起已经发生过的 P0：circle_layer / admin_layer 是映射好的 JPA 实体，
// 但【没有任何迁移创建过它们】——库里那两张表只存在于 database/backup 的人工 dump 里，
// 而 V2026.10.14.0005/.0007 却在 UPDATE / INSERT 它们。后果不是运行时报错，
// 而是"新环境按迁移链建库"这件事根本做不到，且老库上一切看起来正常（因为表在）。
// ddl-auto=validate 看不见它：validate 只在表存在时比形状，表不存在时按配置也不创建。
//
// 判点全部是【结构对账】，不读注释、不读文档、不接受"我记得加过"：
//   1) 每个 @Table(name = "x") 实体，迁移链里必须有 CREATE TABLE x；
//   2) 迁移链里任何 UPDATE / INSERT INTO 目标表，必须在更早（或同文件更早）被 CREATE 过；
//   3) 实体不许再出现 columnDefinition = "ENUM(...)"（枚举列已由
//      V2026.07.27.0005__enum_to_varchar_check.sql 统一改为 varchar，
//      留着 ENUM 声明在 ddl-auto=update 环境下会把列原地退回 ENUM）。
// 三个计数（实体数、建表数、扫描文件数）都被钉了下限：扫不到文件时本门必须自己表态，
// 而不是安静地输出"0 个问题"当作绿。
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const ENTITY_ROOT = resolve(REPO, "apps/api/src/main/java/com/campuslove/api");
const SQL_DIR = resolve(REPO, "database/flyway/sql");

function walkJava(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walkJava(abs, acc);
    else if (entry.endsWith(".java")) acc.push(abs);
  }
  return acc;
}

const javaFiles = walkJava(ENTITY_ROOT);
assert.ok(
  javaFiles.length > 300,
  `必须扫到 apps/api 的全部主源文件（当前 ${javaFiles.length}）——扫面变小时本门会假绿，先让它自己表态`,
);

// 迁移按 Flyway 的执行顺序排列：V<version>__name.sql 按 version 字符串序（本仓库的版本号
// 都是 2026.MM.DD.NNNN 定宽格式，字典序 == 数值序；一旦有人写出不定宽版本号，
// 下面这条自证会把这一点直接暴露出来）。
const migrations = readdirSync(SQL_DIR)
  .filter((f) => f.endsWith(".sql") && /^V/.test(f))
  .sort((a, b) => {
    const va = a.split("__")[0].slice(1);
    const vb = b.split("__")[0].slice(1);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(va) === false || /^\d+\.\d+\.\d+\.\d+$/.test(vb) === false) {
      throw new Error(`版本号格式不在预期的 2026.MM.DD.NNNN 定宽形态，无法判定执行顺序：${va} / ${vb}`);
    }
    return va.localeCompare(vb, "en", { numeric: true });
  });
assert.ok(migrations.length > 200, `迁移文件应有 200+ 份（当前 ${migrations.length}）`);

/** 去掉块注释与行注释：判点只许看真正会被 MySQL 执行的语句 */
function stripSqlComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

const created = new Map(); // 小写表名 => 首次创建它的迁移文件
for (const file of migrations) {
  const body = stripSqlComments(readFileSync(join(SQL_DIR, file), "utf8"));
  for (const m of body.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/gi)) {
    const name = m[1].toLowerCase();
    if (!created.has(name)) created.set(name, file);
  }
}
assert.ok(created.size > 100, `迁移链应建出 100+ 张表（当前 ${created.size}）`);

// —— 判点 2：引用先于创建 ——
const referencedTooEarly = [];
for (const file of migrations) {
  const body = stripSqlComments(readFileSync(join(SQL_DIR, file), "utf8"));
  for (const m of body.matchAll(/\b(?:UPDATE|INSERT\s+INTO|REPLACE\s+INTO)\s+`?([A-Za-z0-9_]+)`?/gi)) {
    const name = m[1].toLowerCase();
    if (/^(select|set|ignore|into|values|low_priority|delayed)$/.test(name)) continue;
    const creator = created.get(name);
    if (creator === undefined) continue; // 不是链里建的表（视图/临时表/外部对象），交给判点 1 管实体侧
    if (migrations.indexOf(creator) > migrations.indexOf(file)) {
      referencedTooEarly.push(`${file} 里引用 ${name}，但它直到 ${creator} 才被 CREATE`);
    }
  }
}
assert.deepEqual(
  referencedTooEarly,
  [],
  `迁移链存在"引用先于创建"（空库按链建库必炸，炸点在后面的文件上、报错看不出根因）：\n${referencedTooEarly.join("\n")}`,
);

// —— 判点 1：实体表必须由迁移链创建 ——
const entityTables = new Map();
for (const file of javaFiles) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/u);
  if (m) entityTables.set(m[1], file);
}
assert.ok(
  entityTables.size > 100,
  `应扫到 100+ 个带 @Table 的实体（当前 ${entityTables.size}）——数字掉了就是扫描面出问题，不是实体变少了`,
);
const noDdl = [...entityTables.entries()]
  .filter(([table]) => !created.has(table.toLowerCase()))
  .map(([table, file]) => `${table} ← ${file.replace(REPO + "/", "")}`);
assert.deepEqual(
  noDdl,
  [],
  `这些 JPA 实体映射的表在迁移链里没有 CREATE TABLE（老库里可能有、新环境一定没有）：\n${noDdl.join("\n")}`,
);

// —— 判点 3：枚举列退回 ENUM ——
const enumDecls = [];
for (const file of javaFiles) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (/^(\*|\/\/|\/\*)/.test(trimmed)) continue; // 注释里谈"别再写 ENUM"是允许的
    if (/columnDefinition\s*=\s*"ENUM/iu.test(trimmed)) enumDecls.push(`${file}: ${trimmed.slice(0, 120)}`);
  }
}
assert.deepEqual(
  enumDecls,
  [],
  `实体又把枚举列声明回 ENUM 了（库里它们是 varchar，见 V2026.07.27.0005）：\n${enumDecls.join("\n")}`,
);

console.log(
  `entity-ddl-drift ok（实体 @Table ${entityTables.size} 个 / 链建表 ${created.size} 张 / 迁移 ${migrations.length} 份 / 无 ENUM 回退）`,
);
