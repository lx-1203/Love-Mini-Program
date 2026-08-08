-- ============================================================
-- 迁移：为高频查询表添加性能索引
-- ============================================================
-- 背景：
--   Phase 3 后端基础设施任务要求为高频访问表补充复合索引，
--   解决随数据量增长出现的慢查询问题，覆盖以下场景：
--   * likes：用户喜欢列表、被喜欢列表、按状态筛选
--   * posts：作者主页、圈子内帖子列表、状态筛选
--   * post_likes：帖子点赞去重与查询
--   * post_shares：帖子转发记录查询
--   * comments：帖子评论分页、用户评论历史
--   * check_ins：用户签到记录查询
--   * activities：按状态与时间筛选活动
--   * audit_log：审计日志按操作者、操作类型查询
--   * reports：举报按状态、举报人查询
--   * private_messages：私信会话消息分页、未读消息统计
--
-- 实现说明：
--   * 索引命名遵循 idx_{表}_{列1}_{列2} 规范
--   * 既有 UNIQUE 约束（如 uk_post_likes_user_post）不重复创建
--   * 幂等性说明（R4-00413 注释修正）：MySQL 不支持 CREATE INDEX IF NOT EXISTS，
--     本脚本依赖 Flyway 单次执行（validateOnMigrate 校验 checksum），
--     不要手动重复执行本脚本；如需重放请用下方 DOWN 回滚段先删索引。
--
-- 注：原始任务规格中部分列名（如 likes.from_user_id、posts.circle_id、
--   activities.creator_id/start_time、audit_log.user_id/action、
--   messages.sender_id/receiver_id/is_read）与实际表结构不符，
--   本迁移按实际表结构使用对应列名（详见每条索引注释）。
-- ============================================================

-- ---------- likes 表 ----------
-- 任务规格：(from_user_id, created_at)、(to_user_id, created_at)、(status, created_at)
-- 实际列名：user_id（发起方）、target_user_id（被喜欢方）、status、created_at
CREATE INDEX idx_likes_user_created_at ON likes (user_id, created_at);
CREATE INDEX idx_likes_target_user_created_at ON likes (target_user_id, created_at);
CREATE INDEX idx_likes_status_created_at ON likes (status, created_at);

-- ---------- posts 表 ----------
-- 任务规格：(author_id, created_at)、(circle_id, created_at)、(status, created_at)
-- 实际列名：author_id、category（无 circle_id 列）、status、created_at
-- circle_id 仅存在于 circle_topics / circle_memberships 表，posts 无该列，跳过该项
CREATE INDEX idx_posts_author_created_at ON posts (author_id, created_at);
CREATE INDEX idx_posts_status_created_at ON posts (status, created_at);

-- ---------- post_likes 表 ----------
-- 任务规格：(post_id, user_id) UNIQUE、(user_id, created_at)
-- 既有 UNIQUE 约束 uk_post_likes_user_post (user_id, post_id) 已实现去重，
-- 任务规格的 (post_id, user_id) 与之等价（仅列顺序不同），无需重复创建
CREATE INDEX idx_post_likes_user_created_at ON post_likes (user_id, created_at);

-- ---------- post_shares 表 ----------
-- 任务规格：(post_id, created_at)、(user_id, created_at)
CREATE INDEX idx_post_shares_post_created_at ON post_shares (post_id, created_at);
CREATE INDEX idx_post_shares_user_created_at ON post_shares (user_id, created_at);

-- ---------- comments 表 ----------
-- 任务规格：(post_id, created_at)、(user_id, created_at)
-- 实际列名：post_id、author_id（评论作者 ID）、created_at
CREATE INDEX idx_comments_post_created_at ON comments (post_id, created_at);
CREATE INDEX idx_comments_author_created_at ON comments (author_id, created_at);

-- ---------- check_ins 表 ----------
-- 任务规格：(user_id, check_in_date) UNIQUE、(user_id, created_at)
-- 既有 UNIQUE 约束 uk_checkin_user_date (user_id, check_in_date) 已实现按日去重，
-- 不重复创建 UNIQUE 索引
CREATE INDEX idx_check_ins_user_created_at ON check_ins (user_id, created_at);

-- ---------- activities 表 ----------
-- 任务规格：(status, start_time)、(creator_id, created_at)
-- 实际列名：status、activity_date（无 start_time 列）、created_at（无 creator_id 列）
-- creator_id / start_time 列不存在，跳过相关索引
CREATE INDEX idx_activities_status_activity_date ON activities (status, activity_date);

-- ---------- audit_log 表 ----------
-- 任务规格：(user_id, created_at)、(action, created_at)
-- 实际列名：operator_id（操作者）、operation（操作类型）、created_at
CREATE INDEX idx_audit_log_operator_created_at ON audit_log (operator_id, created_at);
CREATE INDEX idx_audit_log_operation_created_at ON audit_log (operation, created_at);

-- ---------- reports 表 ----------
-- 任务规格：(status, created_at)、(reporter_id, created_at)
CREATE INDEX idx_reports_status_created_at ON reports (status, created_at);
CREATE INDEX idx_reports_reporter_created_at ON reports (reporter_id, created_at);

-- ---------- private_messages 表 ----------
-- 任务规格：(sender_id, receiver_id, created_at)、(receiver_id, created_at, is_read)
-- 实际表名：private_messages（任务规格中为 messages）
-- 实际列名：conversation_id、sender_id、is_read、created_at
-- 私信无 receiver_id（接收方由 conversation 隐含），按实际可用列建索引
CREATE INDEX idx_private_messages_sender_created_at ON private_messages (sender_id, created_at);
CREATE INDEX idx_private_messages_conversation_read ON private_messages (conversation_id, is_read, created_at);

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_likes_user_created_at ON likes;
-- DROP INDEX idx_likes_target_user_created_at ON likes;
-- DROP INDEX idx_likes_status_created_at ON likes;
-- DROP INDEX idx_posts_author_created_at ON posts;
-- DROP INDEX idx_posts_status_created_at ON posts;
-- DROP INDEX idx_post_likes_user_created_at ON post_likes;
-- DROP INDEX idx_post_shares_post_created_at ON post_shares;
-- DROP INDEX idx_post_shares_user_created_at ON post_shares;
-- DROP INDEX idx_comments_post_created_at ON comments;
-- DROP INDEX idx_comments_author_created_at ON comments;
-- DROP INDEX idx_check_ins_user_created_at ON check_ins;
-- DROP INDEX idx_activities_status_activity_date ON activities;
-- DROP INDEX idx_audit_log_operator_created_at ON audit_log;
-- DROP INDEX idx_audit_log_operation_created_at ON audit_log;
-- DROP INDEX idx_reports_status_created_at ON reports;
-- DROP INDEX idx_reports_reporter_created_at ON reports;
-- DROP INDEX idx_private_messages_sender_created_at ON private_messages;
-- DROP INDEX idx_private_messages_conversation_read ON private_messages;
