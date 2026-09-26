-- G8/G9 遗留测试数据：清理骨架。默认且仅默认是演练，不生成可执行 DELETE。
-- 生成时间 2026-09-26T14:11:07.379Z；来源清单 test-data-inventory.md
-- 表名未确认：日志里只有 HTTP 路径，没有库表名。填 <TABLE:...> 之前本文件不可执行。

START TRANSACTION;
-- 类型 post（1 个主键：236）
-- DELETE FROM <TABLE:post> WHERE id IN (236);
-- 类型 comment（1 个主键：1205）
-- DELETE FROM <TABLE:comment> WHERE id IN (1205);
-- 类型 user（1 个主键：100151）
-- DELETE FROM <TABLE:user> WHERE id IN (100151);
-- 标题/上传指纹（人工核对用，不进 DELETE）：G8取证2609250743号
-- 弱指纹（只在报告文字里、日志已覆盖，不许进 DELETE）：posts.270 / comments.1238 / campus_topics.299 / campus_replies.31

ROLLBACK; -- 影响行数与清单逐条一致，且 <TABLE:...> 已由实名替换，才允许改成提交
