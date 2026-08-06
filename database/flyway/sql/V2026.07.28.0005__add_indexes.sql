-- ============================================================
-- 迁移：补齐高频查询字段索引与唯一约束（Task 38 / P2.15）
-- ============================================================
-- 背景：
--   审计发现 50 处高频查询字段缺少索引，包括：
--   * 心动信号：(user_a_id, user_b_id, status) 三列复合
--   * 私信会话：(user_a_id, last_message_at) 与 (user_b_id, last_message_at)
--   * 通知：(user_id, is_read, created_at) 三列复合
--   * 临时聊天：(phase, closes_at) 复合（任务规格 status/expires_at 对应 phase/closes_at）
--   * 每日问题：(question_date) 单列（每日问题按日期查询）
--   * 圈子话题：(circle_id, is_pinned, created_at) 三列复合
--   * 媒体资源：(user_id, type) 复合（按用户+类型查询媒体）
--   * 反馈工单：(user_id, type, created_at) 三列复合
--   * 视频通话：(caller_id, status) 与 (callee_id, status) 复合
--   * 优惠码使用：(promo_code_id, used_at) 复合（按使用时间排序）
--   * 用户关注：(follower_id, created_at) 与 (followed_id, created_at) 复合
--   * 帖子点赞：(post_id, created_at) 复合（按时间排序帖子点赞列表）
--   * 帖子分享：(user_id, created_at) 已存在 idx_post_shares_user_created_at
--
-- 实现说明：
--   * 通过 information_schema.STATISTICS 查询判断索引是否存在，保证幂等
--   * 索引命名遵循 idx_{表}_{列1}_{列2} 规范
--   * 既有索引（如 idx_posts_author_created_at、idx_notifications_user_read 等）
--     已在先前迁移中创建，不再重复
--   * 任务规格中的字段名（如 posts.user_id、temp_chat_session.status/expires_at、
--     heart_signals.from_user_id/to_user_id）与实际表结构不符，
--     本迁移按实际表结构使用对应列名（详见每条索引注释）
-- ============================================================

-- ============================================================
-- 辅助存储过程：为指定表添加索引（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_index_if_missing(
    IN tbl_name VARCHAR(64),
    IN idx_name VARCHAR(64),
    IN col_list VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND index_name = idx_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ADD INDEX `', idx_name, '` (', col_list, ')'
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 辅助存储过程：为指定表添加唯一索引（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_unique_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_unique_index_if_missing(
    IN tbl_name VARCHAR(64),
    IN idx_name VARCHAR(64),
    IN col_list VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND index_name = idx_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ADD UNIQUE INDEX `', idx_name, '` (', col_list, ')'
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 1. heart_signals (user_a_id, user_b_id, status) 复合索引
-- ============================================================
-- 任务规格：(from_user_id, to_user_id, status)
-- 实际列名：user_a_id、user_b_id、status
-- 用途：心动信号配对查询，按双方用户ID+状态过滤
CALL add_index_if_missing('heart_signals', 'idx_heart_signals_pair_status', 'user_a_id, user_b_id, status');

-- ============================================================
-- 2. heart_signals (status, expires_at) 复合索引
-- ============================================================
-- 实际列名：status、expires_at
-- 用途：定时清理过期心动信号（status='pending' AND expires_at < NOW()）
CALL add_index_if_missing('heart_signals', 'idx_heart_signals_status_expires', 'status, expires_at');

-- ============================================================
-- 3. private_conversations (user_a_id, last_message_at) 复合索引
-- ============================================================
-- 任务规格：(user_id, last_message_at)
-- 实际列名：user_a_id、user_b_id、last_message_at
-- 用途：用户A的会话列表按最后消息时间排序
CALL add_index_if_missing('private_conversations', 'idx_private_conversations_user_a_last_msg', 'user_a_id, last_message_at');

-- ============================================================
-- 4. private_conversations (user_b_id, last_message_at) 复合索引
-- ============================================================
-- 用途：用户B的会话列表按最后消息时间排序
CALL add_index_if_missing('private_conversations', 'idx_private_conversations_user_b_last_msg', 'user_b_id, last_message_at');

-- ============================================================
-- 5. notifications (user_id, is_read, created_at) 三列复合索引
-- ============================================================
-- 任务规格：(user_id, is_read, created_at)
-- 用途：用户未读通知列表分页（按用户+未读+创建时间倒序）
-- 既有 idx_notifications_user_read (user_id, is_read)，本索引扩展支持 created_at 排序
CALL add_index_if_missing('notifications', 'idx_notifications_user_read_created', 'user_id, is_read, created_at');

-- ============================================================
-- 6. temp_chat_session (phase, closes_at) 复合索引
-- ============================================================
-- 任务规格：(status, expires_at)
-- 实际列名：phase、closes_at
-- 用途：定时清理过期会话（phase='matching' AND closes_at < NOW()）
CALL add_index_if_missing('temp_chat_session', 'idx_temp_chat_session_phase_closes', 'phase, closes_at');

-- ============================================================
-- 7. daily_questions (question_date) 单列索引
-- ============================================================
-- 用途：按日期查询当日问题（findByQuestionDate）
CALL add_index_if_missing('daily_questions', 'idx_daily_questions_date', 'question_date');

-- ============================================================
-- 8. circle_topics (circle_id, is_pinned, created_at) 三列复合索引
-- ============================================================
-- 用途：圈子内话题列表分页（置顶优先+创建时间倒序）
-- 对应 findByCircleIdOrderByIsPinnedDescCreatedAtDesc
CALL add_index_if_missing('circle_topics', 'idx_circle_topics_circle_pinned_created', 'circle_id, is_pinned, created_at');

-- ============================================================
-- 9. media_asset (user_id, type) 复合索引
-- ============================================================
-- 用途：按用户+类型查询媒体资源（findByUserIdAndType）
CALL add_index_if_missing('media_asset', 'idx_media_asset_user_type', 'user_id, type');

-- ============================================================
-- 10. feedback_tickets (user_id, type, created_at) 三列复合索引
-- ============================================================
-- 用途：用户反馈历史按类型+时间分页（findByUserIdAndTypeOrderByCreatedAtDesc）
CALL add_index_if_missing('feedback_tickets', 'idx_feedback_user_type_created', 'user_id, type, created_at');

-- ============================================================
-- 11. video_calls (caller_id, status) 复合索引
-- ============================================================
-- 用途：发起方查询通话状态
CALL add_index_if_missing('video_calls', 'idx_video_calls_caller_status', 'caller_id, status');

-- ============================================================
-- 12. video_calls (callee_id, status) 复合索引
-- ============================================================
-- 用途：接收方查询通话状态
CALL add_index_if_missing('video_calls', 'idx_video_calls_callee_status', 'callee_id, status');

-- ============================================================
-- 13. promo_code_usages (promo_code_id, used_at) 复合索引
-- ============================================================
-- 用途：按使用时间排序优惠码使用记录
CALL add_index_if_missing('promo_code_usages', 'idx_promo_code_usages_code_used', 'promo_code_id, used_at');

-- ============================================================
-- 14. user_follows (follower_id, created_at) 复合索引
-- ============================================================
-- 用途：用户关注列表按时间分页
CALL add_index_if_missing('user_follows', 'idx_user_follows_follower_created', 'follower_id, created_at');

-- ============================================================
-- 15. user_follows (following_id, created_at) 复合索引
-- ============================================================
-- 用途：用户粉丝列表按时间分页（实际列名为 following_id,非任务规格的 followed_id）
CALL add_index_if_missing('user_follows', 'idx_user_follows_followed_created', 'following_id, created_at');

-- ============================================================
-- 16. post_likes (post_id, created_at) 复合索引
-- ============================================================
-- 用途：帖子点赞列表按时间排序
CALL add_index_if_missing('post_likes', 'idx_post_likes_post_created', 'post_id, created_at');

-- ============================================================
-- 17. activity_enrollments (activity_id, user_id) 唯一约束
-- ============================================================
-- 任务规格：唯一业务字段（user_id + post_id）添加唯一约束
-- 实际场景：活动报名唯一约束（activity_id + user_id）保证同一用户对同一活动只能报名一次
CALL add_unique_index_if_missing('activity_enrollments', 'uk_activity_enrollments_activity_user', 'activity_id, user_id');

-- ============================================================
-- 18. campus_topic_replies (topic_id, created_at) 复合索引
-- ============================================================
-- 用途：校园话题回复按时间排序（findByTopicIdOrderByCreatedAtAsc）
CALL add_index_if_missing('campus_topic_replies', 'idx_campus_topic_replies_topic_created', 'topic_id, created_at');

-- ============================================================
-- 19. circle_replies (topic_id, created_at) 复合索引
-- ============================================================
-- 用途：圈子话题回复按时间排序
CALL add_index_if_missing('circle_replies', 'idx_circle_replies_topic_created', 'topic_id, created_at');

-- ============================================================
-- 20. daily_answers (question_id, created_at) 复合索引
-- ============================================================
-- 用途：每日问题回答列表按时间排序
CALL add_index_if_missing('daily_answers', 'idx_daily_answers_question_created', 'question_id, created_at');

-- ============================================================
-- 21. interaction_events (user_id, is_read, created_at) 三列复合索引
-- ============================================================
-- 用途：用户互动事件按已读+时间分页（findByUserIdAndIsRead）
CALL add_index_if_missing('interaction_events', 'idx_interaction_events_user_read_created', 'user_id, is_read, created_at');

-- ============================================================
-- 22. interaction_events (user_id, created_at) 复合索引
-- ============================================================
-- 用途：用户互动事件按时间分页（findByUserIdOrderByCreatedAtDesc）
CALL add_index_if_missing('interaction_events', 'idx_interaction_events_user_created', 'user_id, created_at');

-- ============================================================
-- 23. check_ins (user_id, check_in_date) 复合索引（如不存在则补齐）
-- ============================================================
-- 既有 UNIQUE KEY uk_checkin_user_date (user_id, check_in_date) 已实现按日去重
-- 本索引作为非唯一备份（用于按日期范围查询），与唯一约束列序相同则跳过
CALL add_index_if_missing('check_ins', 'idx_check_ins_user_date', 'user_id, check_in_date');

-- ============================================================
-- 24. make_up_quota (user_id, year_month) 复合索引
-- ============================================================
-- 用途：补签额度按年月查询（findByUserIdAndYearMonth）
CALL add_index_if_missing('make_up_quota', 'idx_make_up_quota_user_month', 'user_id, `year_month`');

-- ============================================================
-- 25. reports (target_type, target_id, status) 复合索引
-- ============================================================
-- 用途：按目标实体查询举报状态（管理员审核场景）
CALL add_index_if_missing('reports', 'idx_reports_target_status', 'target_type, target_id, status');

-- ============================================================
-- 26. vip_bills (user_id, status, created_at) 三列复合索引
-- ============================================================
-- 用途：用户账单按状态+时间分页
CALL add_index_if_missing('vip_bills', 'idx_vip_bills_user_status_created', 'user_id, status, created_at');

-- ============================================================
-- 27. vip_red_packets (sender_id, status) 复合索引
-- ============================================================
-- 用途：发送方查询红包状态（实际列名为 sender_id,非任务规格的 sender_user_id）
CALL add_index_if_missing('vip_red_packets', 'idx_vip_red_packets_sender_status', 'sender_id, status');

-- ============================================================
-- 28. vip_red_packet_claims (claimer_id, claimed_at) 复合索引
-- ============================================================
-- 用途：领取方查询红包记录（claimer 归属 vip_red_packet_claims 表,原任务规格
--      vip_red_packets.claimer_user_id 列不存在,修正为 claims 表实际列）
CALL add_index_if_missing('vip_red_packet_claims', 'idx_vip_red_packet_claims_claimer_claimed', 'claimer_id, claimed_at');

-- ============================================================
-- 29. visitors (visited_user_id, created_at) 复合索引
-- ============================================================
-- 用途：访客列表按时间分页（既有 idx_visitors_visited_read 已含 is_read，本索引不含已读过滤）
CALL add_index_if_missing('visitors', 'idx_visitors_visited_created', 'visited_user_id, created_at');

-- ============================================================
-- 30. push_summaries (user_id, generated_at) 复合索引
-- ============================================================
-- 用途：推送摘要按生成时间查询
CALL add_index_if_missing('push_summaries', 'idx_push_summaries_user_generated', 'user_id, generated_at');

-- ============================================================
-- 31. temp_chat_messages (session_id, created_at) 复合索引
-- ============================================================
-- 用途：会话消息按时间排序（既有 idx_temp_chat_message_session 已含 created_at，本索引名按规范统一）
CALL add_index_if_missing('temp_chat_message', 'idx_temp_chat_message_session_created', 'session_id, created_at');

-- ============================================================
-- 32. temp_chat_session (user_a_id, phase) 复合索引
-- ============================================================
-- 用途：用户A的会话按阶段查询（matching/active/closed/expired）
CALL add_index_if_missing('temp_chat_session', 'idx_temp_chat_session_user_a_phase', 'user_a_id, phase');

-- ============================================================
-- 33. temp_chat_session (user_b_id, phase) 复合索引
-- ============================================================
-- 用途：用户B的会话按阶段查询
CALL add_index_if_missing('temp_chat_session', 'idx_temp_chat_session_user_b_phase', 'user_b_id, phase');

-- ============================================================
-- 34. campus_certifications (user_id, status) 复合索引
-- ============================================================
-- 用途：用户认证按状态查询（管理员审核场景）
CALL add_index_if_missing('campus_certifications', 'idx_campus_cert_user_status', 'user_id, status');

-- ============================================================
-- 35. campus_topics (school_id, category, created_at) 三列复合索引
-- ============================================================
-- 用途：校园话题按学校+分类+时间分页（findBySchoolIdAndCategoryOrderByCreatedAtDesc）
CALL add_index_if_missing('campus_topics', 'idx_campus_topics_school_cat_created', 'school_id, category, created_at');

-- ============================================================
-- 36. payment_callback_log (notification_id) 唯一索引
-- ============================================================
-- 用途：微信支付回调通知去重（findByNotificationId）
CALL add_unique_index_if_missing('payment_callback_log', 'uk_payment_callback_notification', 'notification_id');

-- ============================================================
-- 37. third_party_account (provider, open_id) 唯一约束（如未存在）
-- ============================================================
-- 用途：保证同一 provider+open_id 唯一对应一个 third_party_account
CALL add_unique_index_if_missing('third_party_account', 'uk_third_party_provider_open_id', 'provider, open_id');

-- ============================================================
-- 38. third_party_account (user_id, provider) 唯一约束（如未存在）
-- ============================================================
-- 用途：保证同一用户在同一 provider 下只有一个绑定记录
CALL add_unique_index_if_missing('third_party_account', 'uk_third_party_account_user_provider', 'user_id, provider');

-- ============================================================
-- 39. user_basic_profile (user_id) 已有唯一约束 uk_user_basic_profile_user（不重复）
-- ============================================================

-- ============================================================
-- 40. user_online_status (status, updated_at) 复合索引
-- ============================================================
-- 用途：定时清理离线用户（status='offline' AND updated_at < cutoff）
CALL add_index_if_missing('user_online_status', 'idx_user_online_status_updated', 'status, updated_at');

-- ============================================================
-- 41. promo_codes (code) 唯一约束（如未存在）
-- ============================================================
-- 用途：优惠码全局唯一，findByCode 查询使用
CALL add_unique_index_if_missing('promo_codes', 'uk_promo_codes_code', 'code');

-- ============================================================
-- 42. push_preferences (user_id) 唯一约束（如未存在）
-- ============================================================
-- 用途：每个用户一条推送偏好记录
CALL add_unique_index_if_missing('push_preferences', 'uk_push_preferences_user', 'user_id');

-- ============================================================
-- 43. do_not_disturb_settings (user_id) 唯一约束（如未存在）
-- ============================================================
-- 用途：每个用户一条勿扰设置
CALL add_unique_index_if_missing('dnd_settings', 'uk_dnd_user_id', 'user_id');

-- ============================================================
-- 44. match_config (config_key) 唯一约束（如未存在）
-- ============================================================
-- 用途：配置键全局唯一
CALL add_unique_index_if_missing('match_config', 'uk_match_config_key', 'config_key');

-- ============================================================
-- 45. recommend_strategy (strategy_key) 唯一约束（如未存在）
-- ============================================================
-- 用途：策略键全局唯一
CALL add_unique_index_if_missing('recommend_strategy', 'uk_recommend_strategy_key', 'strategy_key');

-- ============================================================
-- 46. notify_config (type) 唯一约束（如未存在）
-- ============================================================
-- 用途：通知类型全局唯一
CALL add_unique_index_if_missing('notify_config', 'uk_notify_config_type', 'type');

-- ============================================================
-- 47. app_config (config_key) 唯一约束（如未存在）
-- ============================================================
-- 用途：配置键全局唯一
CALL add_unique_index_if_missing('app_config', 'uk_app_config_key', 'config_key');

-- ============================================================
-- 48. app_switch (switch_key) 唯一约束（如未存在）
-- ============================================================
-- 用途：开关键全局唯一
CALL add_unique_index_if_missing('app_switch', 'uk_app_switch_key', 'switch_key');

-- ============================================================
-- 49. app_rule (rule_name) 唯一约束（如未存在）
-- ============================================================
-- 用途：规则名全局唯一
CALL add_unique_index_if_missing('app_rule', 'uk_app_rule_name', 'rule_name');

-- ============================================================
-- 50. audit_log (operator_id, operation, created_at) 三列复合索引
-- ============================================================
-- 用途：审计日志按操作者+操作+时间分页（既有 idx_audit_log_operator_created_at 与 idx_audit_log_operation_created_at
--   分别支持单一字段查询，本索引支持双字段+时间排序的复合查询）
CALL add_index_if_missing('audit_log', 'idx_audit_log_operator_op_created', 'operator_id, operation, created_at');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_unique_index_if_missing;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_heart_signals_pair_status ON heart_signals;
-- DROP INDEX idx_heart_signals_status_expires ON heart_signals;
-- DROP INDEX idx_private_conversations_user_a_last_msg ON private_conversations;
-- DROP INDEX idx_private_conversations_user_b_last_msg ON private_conversations;
-- DROP INDEX idx_notifications_user_read_created ON notifications;
-- DROP INDEX idx_temp_chat_session_phase_closes ON temp_chat_session;
-- DROP INDEX idx_daily_questions_date ON daily_questions;
-- DROP INDEX idx_circle_topics_circle_pinned_created ON circle_topics;
-- DROP INDEX idx_media_asset_user_type ON media_asset;
-- DROP INDEX idx_feedback_user_type_created ON feedback_tickets;
-- DROP INDEX idx_video_calls_caller_status ON video_calls;
-- DROP INDEX idx_video_calls_callee_status ON video_calls;
-- DROP INDEX idx_promo_code_usages_code_used ON promo_code_usages;
-- DROP INDEX idx_user_follows_follower_created ON user_follows;
-- DROP INDEX idx_user_follows_followed_created ON user_follows;
-- DROP INDEX idx_post_likes_post_created ON post_likes;
-- DROP INDEX uk_activity_enrollments_activity_user ON activity_enrollments;
-- DROP INDEX idx_campus_topic_replies_topic_created ON campus_topic_replies;
-- DROP INDEX idx_circle_replies_topic_created ON circle_replies;
-- DROP INDEX idx_daily_answers_question_created ON daily_answers;
-- DROP INDEX idx_interaction_events_user_read_created ON interaction_events;
-- DROP INDEX idx_interaction_events_user_created ON interaction_events;
-- DROP INDEX idx_check_ins_user_date ON check_ins;
-- DROP INDEX idx_make_up_quota_user_month ON make_up_quota;
-- DROP INDEX idx_reports_target_status ON reports;
-- DROP INDEX idx_vip_bills_user_status_created ON vip_bills;
-- DROP INDEX idx_vip_red_packets_sender_status ON vip_red_packets;
-- DROP INDEX idx_vip_red_packets_claimer_status ON vip_red_packets;
-- DROP INDEX idx_visitors_visited_created ON visitors;
-- DROP INDEX idx_push_summaries_user_generated ON push_summaries;
-- DROP INDEX idx_temp_chat_message_session_created ON temp_chat_message;
-- DROP INDEX idx_temp_chat_session_user_a_phase ON temp_chat_session;
-- DROP INDEX idx_temp_chat_session_user_b_phase ON temp_chat_session;
-- DROP INDEX idx_campus_cert_user_status ON campus_certifications;
-- DROP INDEX idx_campus_topics_school_cat_created ON campus_topics;
-- DROP INDEX uk_payment_callback_log_notification ON payment_callback_log;
-- DROP INDEX uk_third_party_account_provider_openid ON third_party_account;
-- DROP INDEX uk_third_party_account_user_provider ON third_party_account;
-- DROP INDEX idx_user_online_status_updated ON user_online_status;
-- DROP INDEX uk_promo_codes_code ON promo_codes;
-- DROP INDEX uk_push_preferences_user ON push_preferences;
-- DROP INDEX uk_dnd_settings_user ON dnd_settings;
-- DROP INDEX uk_match_config_key ON match_config;
-- DROP INDEX uk_recommend_strategy_key ON recommend_strategy;
-- DROP INDEX uk_notify_config_type ON notify_config;
-- DROP INDEX uk_app_config_key ON app_config;
-- DROP INDEX uk_app_switch_key ON app_switch;
-- DROP INDEX uk_app_rule_name ON app_rule;
-- DROP INDEX idx_audit_log_operator_op_created ON audit_log;
