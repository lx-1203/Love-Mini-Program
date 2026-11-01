/**
 * 登录主页 / 反馈 / AI 预留 这批能力的迁移侧契约。
 *
 * ── 文件名为什么留着、内容为什么换了 ──
 * 原名 `prototype contract`：校验仓库根那份遗留静态原型（index.html + script.js）。
 * 静态原型随 monorepo 化被删除后，本文件写成「文件不存在就 process.exit(0) 跳过」，
 * 于是 13 条断言**永远不再执行，而门永远绿**（第五轮 C 泳道实测判红：
 * 它在 test:contracts 里跑，输出 skipped 却计通过——正是本仓反复出现的
 * 「coverage that is a lie」，而且是链内第一环，后面所有绿的印象都从它开始）。
 *
 * ── 现在的判据（全部每次都会执行）──
 *   A. 遗留原型必须【不再出现】在仓库根：这条把「静默跳过」翻成「主动断言」，
 *      以后谁把静态原型加回来，本门立刻红，而不是悄悄恢复一堆死断言。
 *   B. V2026.05.18.1600 必须建出那 4 张表（登录主页配置 / 反馈工单 / 活动提案 / AI 预留开关）。
 *   C. AI 功能默认关闭：迁移里 `chat_ai_enabled` 的默认值必须是 false（原断言看的是
 *      已删除的原型 JS，现在看它真正的权威来源——库里那一行默认值）。
 *   D. 断言数下限：本文件实际执行的 assert 次数 ≥ 6，防止判据被整体删空后仍然绿。
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

let assertionsRun = 0;
const check = (fn) => {
  assertionsRun += 1;
  fn();
};

const LEGACY_HTML = new URL("../index.html", import.meta.url);
const LEGACY_SCRIPT = new URL("../script.js", import.meta.url);

// A. 静态原型不许回到仓库根
check(() => {
  assert.ok(
    !existsSync(LEGACY_HTML) && !existsSync(LEGACY_SCRIPT),
    "仓库根又出现了遗留静态原型（index.html / script.js）。产品入口是 apps/client 与 apps/admin；"
      + "把静态原型加回来会让本门的历史断言复活成假契约，请先说明它服务谁。",
  );
});

// B. 迁移必须建出这四张表
const migrationPath = new URL(
  "../database/flyway/sql/V2026.05.18.1600__add_growth_feedback_and_ai_reserved.sql",
  import.meta.url
);
check(() => assert.ok(existsSync(migrationPath), "Flyway 迁移 V2026.05.18.1600（反馈与 AI 预留）不存在"));
const migrationSql = readFileSync(migrationPath, "utf8");
const REQUIRED_TABLES = [
  ["app_login_hero_config", "登录主页配置"],
  ["user_feedback_ticket", "反馈工单"],
  ["activity_proposal", "活动提案"],
  ["chat_ai_feature_flag", "聊天 AI 预留开关"],
];
let createdTables = 0;
for (const [table, label] of REQUIRED_TABLES) {
  check(() => assert.match(
    migrationSql,
    // 名字后面必须收口（(?![A-Za-z0-9_])）：少了这个前瞻，
    // `user_feedback_ticket_x` 也会被 `user_feedback_ticket` 前缀匹配到——
    // 实测把表改名后本门仍然绿（第五轮 C 泳道的 mutation 之一），故补上。
    new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?\`?${table}\`?(?![A-Za-z0-9_])`, "iu"),
    `迁移应建出 ${label} 表 ${table}`,
  ));
  createdTables += 1;
}

// C. AI 默认关：权威来源是库里的列默认值与种子里那一行，不是已删除的原型 JS
check(() => {
  assert.match(
    migrationSql,
    /enabled\s+TINYINT\(1\)\s+NOT\s+NULL\s+DEFAULT\s+0/iu,
    "chat_ai_feature_flag.enabled 的列默认值必须是 0（AI 能力默认关闭是本仓既有决定；"
      + "改成默认打开应走一次显式改动，而不是顺着迁移脚本漂过去）",
  );
  assert.match(
    migrationSql,
    /'chat_ai_enabled',\s*(?:\r?\n\s*)?0\s*,/iu,
    "种子行里 chat_ai_enabled 这一条必须写 0（关）：列默认 0 但种子写 1 同样是默认打开",
  );
});

// D. 判据自身不许空转
check(() => {
  assert.ok(
    assertionsRun >= 6 && createdTables === REQUIRED_TABLES.length,
    `本门只执行了 ${assertionsRun} 条断言（下限 6），判据可能被人整段删空：`
      + `建表核对 ${createdTables}/${REQUIRED_TABLES.length}`,
  );
});

console.log(`prototype-contract（迁移侧契约）ok：断言 ${assertionsRun} 条全部执行，建表核对 ${createdTables}/4，遗留原型缺席已核对`);
