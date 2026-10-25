/**
 * P0-1 历史绑定核查件的契约测试。
 *
 * 该脚本存在的意义是「只核查、不处置」：投毒行的处置（解绑/要求重新验证/保留）
 * 属产品裁定，且必须先备份 + ROLLBACK 干跑。所以本测试守两条性质：
 *   1) 它永远只是 SELECT——不许有人把核查脚本顺手改成清理脚本；
 *   2) 判据不许被掏空——时间切界与「身份自然主人是另一账号」两处连接条件是
 *      这份核查唯一能区分 SUSPECT 的东西，删掉它们脚本照样返回一堆行，
 *      但读出来的是「无嫌疑」的假安静。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SQL_PATH = fileURLToPath(
  new URL("../database/audit/third-party-binding-provenance.sql", import.meta.url),
);
const raw = readFileSync(SQL_PATH, "utf8");

// 去掉行注释与块注释后再判语句形态，免得文档正文里的「解绑/删除」被误判成 DML。
const code = raw
  .replace(/^\s*--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const FORBIDDEN = [
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\b[\s\S]{0,40}\bSET\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
  /\bDROP\s+(TABLE|DATABASE|INDEX)\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bCREATE\s+(TABLE|DATABASE|INDEX|USER)\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /^\s*COMMIT\s*;/im,
  /^\s*ROLLBACK\s*;/im,
  /\bSELECT\s+[\s\S]{0,200}\bINTO\s+(OUTFILE|DUMPFILE)\b/i,
];
for (const re of FORBIDDEN) {
  assert.equal(re.test(code), false, `核查脚本含被禁语句 ${re}：本文件只允许 SELECT`);
}

// 只读哨兵：@cutoff 未设置时退化成 1970，而不是全表扫（那会把「没给参数」读成「全部可信」）。
assert.match(code, /SET @cutoff = IFNULL\(@cutoff,\s*'1970-01-01 00:00:00'\)/u, "缺 @cutoff 哨兵");

// 时间切界必须真的作用在每一段取数上（总览 + 强嫌疑 + 待处置）。
const cutoffHits = (code.match(/t\.created_at\s*<\s*@cutoff/gu) ?? []).length;
assert.ok(cutoffHits >= 3, `cutoff 谓词只剩 ${cutoffHits} 处，掏空判据即等于放行全部历史行`);

// 「身份自然主人是另一个账号」这条形状判据是本核查的核心，两处连接条件都要在。
// 别名必须是 natural_owner：`natural` 是 MySQL 8 保留字，真库实测报 1064。
assert.match(
  code,
  /natural_owner\.openid\s*=\s*CONCAT\(LOWER\(t\.provider\),\s*':',\s*t\.open_id\)/u,
  "缺少按 provider:hash 反查身份自然主人的连接条件",
);
assert.match(code, /natural_owner\.id\s*<>\s*t\.user_id/u, "缺少「自然主人必须是另一个账号」的排除条件");
assert.equal(
  /\bJOIN\s+users\s+natural\s/i.test(code),
  false,
  "别名不许退回保留字 natural（MySQL 8 报 1064）",
);

// 判读词表：SUSPECT / UNVERIFIED 是下游唯一能分桶的两个值，改名必须同步消费方。
for (const token of ["SUSPECT", "UNVERIFIED"]) {
  assert.ok(code.includes(token), `判定词表缺少 ${token}`);
}

// open_id 是身份派生值，只能出前缀：禁止裸列输出，且两段取数都要各有一次脱敏投影。
assert.equal(/t\.open_id\s+AS/i.test(code), false, "存在未脱敏的 open_id 整列输出");
const maskedProjections = (code.match(/CONCAT\(LEFT\(t\.open_id,\s*\d+\)/gu) ?? []).length;
assert.ok(
  maskedProjections >= 2,
  `open_id 脱敏投影只有 ${maskedProjections} 处（强嫌疑段与待处置段各需一处）`,
);

console.log("third-party binding audit sql contract ok");
