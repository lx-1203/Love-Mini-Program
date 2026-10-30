import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 排序规则统一棘轮门（S3-8，2026-10-30）。
 *
 * 实测（不是推测）：统一之前本库 118 张基表里 76 张 utf8mb4_0900_ai_ci、42 张
 * utf8mb4_unicode_ci；列级别 245 vs 137；而库默认值本身就是 utf8mb4_unicode_ci——
 * 也就是说「建表时不写 COLLATE」的新表会不断继承少数派，只改存量表不改默认值会反复再生。
 * 混用已经在业务上发生：activities.campus_name 是 0900、shop_items.campus_name 是
 * unicode_ci（两者都按校区名做归属），V2026.08.08.0014 的 seed 甚至必须写
 * `ucp.campus_name = s.name COLLATE utf8mb4_unicode_ci` 才跑得通。JPQL/HQL 没有等价手段，
 * 所以新增任何跨表字符串比较都是一颗 MySQL 1267（Illegal mix of collations）哑弹。
 *
 * V2026.10.30.0004 把库默认值与全部存量表收敛到 utf8mb4_0900_ai_ci（实测收敛后
 * 非目标排序规则的表数 42 → 0、列数 137 → 0）。本门负责让它不许再烂回去：
 *   A. 晚于统一迁移的文件里出现任何非目标排序规则声明或 COLLATE 硬转 ⇒ 红；
 *   B. 已应用的历史迁移不能改写（Flyway 校验和），故历史里的非目标声明按文件计数进基线：
 *      变多 ⇒ 红；变少却没同步收缩基线 ⇒ 也红（豁免清单只准变短）；
 *   C. 统一迁移必须存在且同时改了库默认值，否则整条规则是空转。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const SQL_DIR = join(root, "database", "flyway", "sql");
const TARGET = "utf8mb4_0900_ai_ci";
const UNIFICATION = "V2026.10.30.0004__unify_collation_0900_ai_ci.sql";

/** 历史基线：已应用迁移里的非目标排序规则声明数（collations）与 COLLATE 硬转数（casts）。 */
const HISTORICAL_BASELINE = {
  "V2026.05.28.0002__create_social_progress.sql": { collations: 1, casts: 0 },
  "V2026.05.28.0008__create_daily_benefits.sql": { collations: 1, casts: 0 },
  "V2026.08.07.0003__create_official_accounts.sql": { collations: 2, casts: 0 },
  "V2026.08.07.0010__create_schools.sql": { collations: 1, casts: 0 },
  "V2026.08.07.0011__create_menus.sql": { collations: 1, casts: 0 },
  "V2026.08.07.0012__create_roles_and_role_menu.sql": { collations: 2, casts: 0 },
  "V2026.08.07.0013__create_dicts.sql": { collations: 2, casts: 0 },
  "V2026.08.07.0018__create_shop_items.sql": { collations: 1, casts: 0 },
  "V2026.08.07.0027__create_error_reports.sql": { collations: 1, casts: 0 },
  // 这条同时贡献了唯一一处 COLLATE 硬转：统一之后它冗余但无害，历史文件不可改写
  "V2026.08.08.0014__seed_campus_topics_more.sql": { collations: 1, casts: 1 },
  "V2026.08.09.0014__create_sensitive_word_import_task.sql": { collations: 1, casts: 0 },
  "V2026.08.10.0020__create_user_block.sql": { collations: 1, casts: 0 },
  "V2026.08.10.0022__create_products.sql": { collations: 1, casts: 0 },
  "V2026.08.10.0023__create_consulting_course_and_signup.sql": { collations: 2, casts: 0 },
  "V2026.08.10.0024__create_task_claim.sql": { collations: 1, casts: 0 },
  "V2026.08.10.0025__create_invite_code_and_reward.sql": { collations: 2, casts: 0 },
  "V2026.08.14.0002__create_whisper_message.sql": { collations: 1, casts: 0 },
  "V2026.08.24.0001__create_post_draft.sql": { collations: 1, casts: 0 },
  "V2026.09.07.0001__create_official_chat_messages.sql": { collations: 1, casts: 0 },
  "V2026.10.27.0001__create_school_majors.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0001__create_legal_document.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0002__add_circle_tags_announcement_and_topic_likes.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0005__create_post_mentions.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0009__create_circle_announcements.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0010__extend_notification_types_and_topic_like_notices.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0011__create_content_mentions.sql": { collations: 1, casts: 0 },
  "V2026.10.28.0012__add_temp_chat_media.sql": { collations: 1, casts: 0 },
};

/** 统计一个 SQL 文件里的非目标排序规则声明与 COLLATE 硬转（注释行不计）。 */
function countOffTarget(text) {
  const body = text
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  const collations = (body.match(/utf8mb4_(?!0900_ai_ci)[a-z0-9_]+/giu) ?? []).length;
  const casts = (body.match(/COLLATE\s+utf8mb4_(?!0900_ai_ci)[a-z0-9_]+/giu) ?? []).length;
  return { collations, casts };
}

// —— 自测：三种情形都必须按预期，否则「全绿」只是解析失效 ——
assert.deepEqual(
  countOffTarget("CREATE TABLE t (a VARCHAR(10)) COLLATE utf8mb4_0900_ai_ci;"),
  { collations: 0, casts: 0 },
  "目标排序规则被误判，本门会天天报红",
);
assert.deepEqual(
  countOffTarget("CREATE TABLE t (a VARCHAR(10)) COLLATE utf8mb4_unicode_ci;"),
  { collations: 1, casts: 1 },
  "非目标声明没被抓到，本门是空门",
);
assert.deepEqual(
  countOffTarget("-- COLLATE utf8mb4_general_ci 这是说明文字"),
  { collations: 0, casts: 0 },
  "注释被计入，会制造假红",
);

// —— C：统一迁移必须存在，且把库默认一起改掉 ——
assert.ok(existsSync(join(SQL_DIR, UNIFICATION)), `统一迁移 ${UNIFICATION} 不存在，本门失去锚点`);
const unify = readFileSync(join(SQL_DIR, UNIFICATION), "utf8");
assert.match(
  unify,
  /ALTER\s+DATABASE\s+\S+\s+CHARACTER SET\s+utf8mb4\s+COLLATE\s+utf8mb4_0900_ai_ci/iu,
  "统一迁移必须同时改库默认值：只改存量表的话新表仍会继承 utf8mb4_unicode_ci",
);
assert.match(
  unify,
  /CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci/iu,
  "统一迁移必须用 CONVERT TO（同时收敛列与索引），只改表默认值不够",
);

const files = readdirSync(SQL_DIR).filter((f) => f.endsWith(".sql")).sort();
assert.ok(files.length >= 200, `只扫描到 ${files.length} 个迁移文件（<200），目录或扫描失效`);

const violations = [];
const stale = [];
for (const file of files) {
  const { collations, casts } = countOffTarget(readFileSync(join(SQL_DIR, file), "utf8"));
  if (file > UNIFICATION) {
    if (collations > 0 || casts > 0) {
      violations.push(`${file}: 统一之后新迁移里出现 ${collations} 处非目标排序规则 / ${casts} 处 COLLATE 硬转`);
    }
    continue;
  }
  const allowed = HISTORICAL_BASELINE[file];
  if (collations === 0 && casts === 0) {
    if (allowed) stale.push(`${file}: 基线登记 ${allowed.collations}/${allowed.casts}，实测 0/0`);
    continue;
  }
  if (!allowed) {
    violations.push(`${file}: 未登记的历史非目标声明 ${collations}/${casts}`);
    continue;
  }
  if (collations > allowed.collations || casts > allowed.casts) {
    violations.push(`${file}: 实测 ${collations}/${casts} 超出基线 ${allowed.collations}/${allowed.casts}`);
  } else if (collations < allowed.collations || casts < allowed.casts) {
    stale.push(`${file}: 实测 ${collations}/${casts} 低于基线 ${allowed.collations}/${allowed.casts}，请同步收缩`);
  }
}

const baselineTotal = Object.values(HISTORICAL_BASELINE).reduce((a, b) => a + b.collations, 0);
assert.ok(baselineTotal > 0, "历史基线为空 ⇒ 规则 B 失去意义");
assert.deepEqual(violations, [], `排序规则漂移：\n  ${violations.join("\n  ")}`);
assert.deepEqual(stale, [], `以下项已清理，请把 HISTORICAL_BASELINE 收缩：\n  ${stale.join("\n  ")}`);

console.log(
  `collation uniform ok（扫描 ${files.length} 个迁移；目标 ${TARGET}；晚于统一迁移的非目标声明 0 处；`
  + `历史基线 ${Object.keys(HISTORICAL_BASELINE).length} 个文件共 ${baselineTotal} 处，只减不增）`,
);
