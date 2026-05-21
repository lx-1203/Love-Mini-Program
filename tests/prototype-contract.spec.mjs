import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");

assert.match(html, /欢迎来到.*校园恋爱/u, "login welcome screen should exist");
assert.match(html, /微信登录/u, "wechat login entry should exist");
assert.match(html, /手机号登录/u, "phone login entry should exist");
assert.match(html, /id="loginHeroVideo"/, "login hero video shell should exist");

assert.doesNotMatch(html, /suggestion-strip/u, "chat AI suggestion strip should not be visible");
assert.doesNotMatch(html, /智能回复|AI 助手|破冰建议/u, "chat screen should not expose AI UI");

assert.match(html, /问题反馈/u, "profile should include feedback entry");
assert.match(html, /功能建议/u, "profile should include suggestion entry");
assert.match(html, /推荐举办活动/u, "profile should include activity proposal entry");
assert.match(html, /提交记录/u, "submission center should include submission history");
assert.match(html, /课表推荐/u, "home page should default to schedule recommendation");
assert.match(html, /我的关注/u, "home page should include followed content");
assert.match(html, /活动快捷入口|快捷入口/u, "home page should include quick activity entry");
assert.match(html, /课表设置|推荐偏好/u, "home page should expose quick settings");

assert.match(script, /chat_ai_enabled\s*:\s*false/u, "AI feature flag should default to false");
assert.match(script, /heroMode/u, "hero mode config should exist");

const migrationPath = new URL(
  "../database/flyway/sql/V2026.05.18.1600__add_growth_feedback_and_ai_reserved.sql",
  import.meta.url
);
assert.ok(existsSync(migrationPath), "Flyway migration for feedback and AI reservation should exist");

const migrationSql = readFileSync(migrationPath, "utf8");
assert.match(migrationSql, /create table .*app_login_hero_config/iu, "migration should create login hero config");
assert.match(migrationSql, /create table .*user_feedback_ticket/iu, "migration should create feedback ticket table");
assert.match(migrationSql, /create table .*activity_proposal/iu, "migration should create activity proposal table");
assert.match(migrationSql, /create table .*chat_ai_feature_flag/iu, "migration should create chat ai flag table");

console.log("prototype contract ok");
