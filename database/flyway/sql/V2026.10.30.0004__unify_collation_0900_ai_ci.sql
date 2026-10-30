-- ============================================================
-- 迁移：全库排序规则统一到 utf8mb4_0900_ai_ci（S3-8，2026-10-30）
-- ============================================================
-- 为什么必须统一（实测，非推测）：
--   information_schema 实测本库 118 张基表中 76 张为 utf8mb4_0900_ai_ci、
--   42 张为 utf8mb4_unicode_ci；列级别 245 vs 137。且<b>库默认值本身就是
--   utf8mb4_unicode_ci</b>，所以任何"建表时不写 COLLATE"的新表都会继承少数派，
--   漂移会不断再生——只改表不改默认值等于白改，故本迁移一并 ALTER DATABASE。
--   不一致已经在业务上真实发生：activities.campus_name 是 0900_ai_ci，
--   shop_items.campus_name 是 unicode_ci，两者都按校区名做归属匹配（S2-2 那条链）。
--   V2026.08.08.0014 的 seed 语句里不得不写
--   `ucp.campus_name = s.name COLLATE utf8mb4_unicode_ci` 才跑得通——
--   这就是硬转证据：JPQL/HQL 侧没有等价手段，新增任何跨表字符串比较都是
--   一颗 MySQL 1267（Illegal mix of collations）哑弹。
--
-- 目标为什么是 0900_ai_ci：本库多数派（76:42），且它是 MySQL 8 对 utf8mb4 的默认，
--   与 Boot/Hibernate 生态的期望一致；反过来统一到 unicode_ci 要动的表更多。
--
-- 代价（务必在维护窗口执行）：
--   CONVERT TO CHARACTER SET 会<b>重建整表</b>（复制数据 + 重建所有索引），
--   期间占用大量 IO；大表（media_asset / posts / interaction_events 等）
--   按行数评估时长。执行前必须有可用备份：本仓 scripts/backup-mysql.sh。
--   本迁移是数据保持型的：不改列类型/长度/可空性，不 DROP 任何对象。
--   重复执行安全（已是目标排序规则的表转换是 no-op）。
--
-- 历史文件不改动：V2026.08.08.0014 等已应用的迁移里那句
--   COLLATE utf8mb4_unicode_ci 留在原地（Flyway 校验和不允许改历史），
--   统一之后它变成冗余但无害的显式转换；由 tests/collation-uniform.spec.mjs
--   的历史基线登记，并要求后续不得再新增这类硬转。
--
-- 回滚：本迁移不可逆（排序规则转换需按备份恢复），故执行前必须完成一次
--   恢复演练；这也是 doc/RUNBOOKS.md 演练日志长期空着的那一格必须补上的原因。
-- ============================================================

-- 1) 先把库默认值改成目标排序规则，避免新表继续继承 unicode_ci
--    注：MySQL 的 ALTER DATABASE 不能取变量，库名只能写死。本仓约定 schema 名 campus_love
--    （docker-compose.yml 的 MYSQL_DATABASE 默认值与 .env.example 的 DB_URL 都是它）；
--    若某站换用了别的库名，这句需按实际改名后手工执行，否则迁移会报未知库。
ALTER DATABASE campus_love CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 2) 再逐张收敛存量表（42 张，实测清单）
ALTER TABLE `campus_certifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `campus_topic_replies` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `campus_topics` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `circle_announcements` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `circle_topic_like_notices` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `circle_topic_likes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `consulting_course` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `consulting_signup` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `content_mentions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `dict_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `dicts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `error_reports` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `flyway_schema_history` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `icebreaker_topics` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `interaction_events` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `invite_code` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `invite_reward` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `legal_document` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `love_verification_application` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `media_asset` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `menus` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `official_accounts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `official_chat_messages` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `official_messages` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `post_draft` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `post_mentions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `post_tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `products` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `real_name_certifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `role_menus` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `roles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `school_majors` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `schools` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `sensitive_word_import_task` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `shop_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `task_claim` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `temp_chat_media_holds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `user_agreement_consent` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `user_block` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `user_device_session` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `user_online_status` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
ALTER TABLE `whisper_message` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
