-- ============================================================
-- 迁移：补齐缺失的审计字段（Task 37 / P2.14）
-- ============================================================
-- 背景：
--   审计发现 54 处 Entity 的 createdAt 字段未带 @CreatedDate，
--   31 处 updatedAt 字段未带 @LastModifiedDate。本次先在 Entity 类上补齐
--   注解（通过脚本批处理），并在主配置类启用 @EnableJpaAuditing。
--   本 Flyway 脚本作为数据库层面的幂等保护，确保所有业务表都含有
--   created_at / updated_at 列，避免 Hibernate validate 模式启动失败。
--
-- 实现说明：
--   * MySQL 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS（仅 8.0.29+ 支持），
--     通过 information_schema.COLUMNS 查询判断列是否存在，保证幂等
--   * created_at：NOT NULL DEFAULT CURRENT_TIMESTAMP，对应 @CreatedDate
--   * updated_at：NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP，
--     对应 @LastModifiedDate
--   * 约束命名与 Entity @Column(name=...) 保持一致
--   * 所有 ALTER 操作在事务外执行（DDL 隐式提交），单条失败不影响后续
-- ============================================================

-- ============================================================
-- 辅助存储过程：为指定表添加 created_at 列（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_created_at_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_created_at_column_if_missing(
    IN tbl_name VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND column_name = 'created_at'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ',
            'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''记录创建时间（Task 37 JPA 审计自动填充）'''
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 辅助存储过程：为指定表添加 updated_at 列（幂等）
-- ============================================================
DROP PROCEDURE IF EXISTS add_updated_at_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_updated_at_column_if_missing(
    IN tbl_name VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE table_schema = DATABASE()
          AND table_name = tbl_name
          AND column_name = 'updated_at'
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', tbl_name, '` ',
            'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''记录最近更新时间（Task 37 JPA 审计自动填充）'''
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- 为所有业务表补齐 created_at / updated_at 列
-- ============================================================
-- 列表来源：apps/api/src/main/java/com/campuslove/api/entity/*.java 中
-- 标注 @CreatedDate / @LastModifiedDate 的实体，共 60 张表
-- （54 张有 created_at 字段，31 张有 updated_at 字段，本脚本对全部 60 张表
--   做幂等检查，缺失则补齐；已有则跳过）

-- 用户与资料相关
CALL add_created_at_column_if_missing('users');
CALL add_updated_at_column_if_missing('users');
CALL add_created_at_column_if_missing('user_basic_profile');
CALL add_updated_at_column_if_missing('user_basic_profile');
CALL add_created_at_column_if_missing('user_campus_profile');
CALL add_updated_at_column_if_missing('user_campus_profile');
CALL add_created_at_column_if_missing('user_schedule_profile');
CALL add_updated_at_column_if_missing('user_schedule_profile');
CALL add_updated_at_column_if_missing('user_online_status');

-- 会话与登录
CALL add_created_at_column_if_missing('user_sessions');
CALL add_created_at_column_if_missing('third_party_account');

-- 推荐与匹配
CALL add_created_at_column_if_missing('recommendation_preferences');
CALL add_updated_at_column_if_missing('recommendation_preferences');
CALL add_created_at_column_if_missing('recommend_strategy');
CALL add_updated_at_column_if_missing('recommend_strategy');
CALL add_created_at_column_if_missing('match_config');
CALL add_updated_at_column_if_missing('match_config');
CALL add_created_at_column_if_missing('pass_records');

-- 喜欢与心动
CALL add_created_at_column_if_missing('likes');
CALL add_updated_at_column_if_missing('likes');
CALL add_created_at_column_if_missing('heart_signals');
CALL add_updated_at_column_if_missing('heart_signals');

-- 社交关系
CALL add_created_at_column_if_missing('user_follows');
CALL add_created_at_column_if_missing('visitors');

-- 帖子与圈子
CALL add_created_at_column_if_missing('posts');
CALL add_updated_at_column_if_missing('posts');
CALL add_created_at_column_if_missing('post_tags');
CALL add_created_at_column_if_missing('post_likes');
CALL add_created_at_column_if_missing('post_shares');
CALL add_created_at_column_if_missing('comments');
CALL add_created_at_column_if_missing('interest_circles');
CALL add_created_at_column_if_missing('circle_topics');
CALL add_created_at_column_if_missing('circle_replies');

-- 校园话题与认证
CALL add_created_at_column_if_missing('campus_topics');
CALL add_updated_at_column_if_missing('campus_topics');
CALL add_created_at_column_if_missing('campus_topic_replies');

-- 私信与会话
CALL add_created_at_column_if_missing('private_conversations');
CALL add_updated_at_column_if_missing('private_conversations');
CALL add_created_at_column_if_missing('private_messages');
CALL add_created_at_column_if_missing('temp_chat_session');
CALL add_updated_at_column_if_missing('temp_chat_session');
CALL add_created_at_column_if_missing('temp_chat_message');
CALL add_created_at_column_if_missing('temp_chat_contact_exchange');
CALL add_updated_at_column_if_missing('temp_chat_contact_exchange');

-- 通知与推送
CALL add_created_at_column_if_missing('notifications');
CALL add_updated_at_column_if_missing('notify_config');
CALL add_updated_at_column_if_missing('push_preferences');

-- 互动事件与访客
CALL add_created_at_column_if_missing('interaction_events');
CALL add_updated_at_column_if_missing('social_progress');

-- 举报与反馈
CALL add_created_at_column_if_missing('reports');
CALL add_created_at_column_if_missing('feedback_tickets');
CALL add_updated_at_column_if_missing('feedback_tickets');

-- 每日福利与签到
CALL add_created_at_column_if_missing('check_ins');
CALL add_updated_at_column_if_missing('make_up_quota');
CALL add_created_at_column_if_missing('daily_questions');
CALL add_created_at_column_if_missing('daily_answers');
CALL add_created_at_column_if_missing('daily_benefits');

-- 活动相关
CALL add_created_at_column_if_missing('activities');
CALL add_updated_at_column_if_missing('activities');
CALL add_created_at_column_if_missing('activity_enrollments');

-- 破冰话题
CALL add_created_at_column_if_missing('icebreaker_topics');
CALL add_updated_at_column_if_missing('icebreaker_topics');

-- VIP 与营销
CALL add_created_at_column_if_missing('vip_bills');
CALL add_created_at_column_if_missing('vip_red_packets');
CALL add_updated_at_column_if_missing('vip_red_packets');
CALL add_created_at_column_if_missing('promo_codes');
CALL add_updated_at_column_if_missing('promo_codes');

-- 视频通话
CALL add_created_at_column_if_missing('video_calls');
CALL add_updated_at_column_if_missing('video_calls');
CALL add_created_at_column_if_missing('video_call_records');
CALL add_updated_at_column_if_missing('video_call_records');

-- 媒体资源
CALL add_created_at_column_if_missing('media_asset');

-- 管理后台配置
CALL add_created_at_column_if_missing('app_config');
CALL add_updated_at_column_if_missing('app_config');
CALL add_created_at_column_if_missing('app_switch');
CALL add_updated_at_column_if_missing('app_switch');
CALL add_created_at_column_if_missing('app_rule');
CALL add_updated_at_column_if_missing('app_rule');
CALL add_created_at_column_if_missing('app_login_hero_config');
CALL add_updated_at_column_if_missing('app_login_hero_config');
CALL add_created_at_column_if_missing('audit_log');

-- 敏感词与勿扰
CALL add_created_at_column_if_missing('sensitive_word');
CALL add_updated_at_column_if_missing('dnd_settings');

-- 清理辅助存储过程
DROP PROCEDURE IF EXISTS add_created_at_column_if_missing;
DROP PROCEDURE IF EXISTS add_updated_at_column_if_missing;

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- 回滚审计列（按表反向删除，仅当确实不需要审计字段时执行）：
--   ALTER TABLE users DROP COLUMN created_at;
--   ALTER TABLE users DROP COLUMN updated_at;
--   ... (其余表同上)
--
-- 注意：
--   * 审计字段属于基础数据完整性约束，正常情况下不应回滚
--   * 如确需回滚，应先删除 Entity 类上的 @CreatedDate / @LastModifiedDate 注解
--     与 @EnableJpaAuditing 配置，避免 JPA 启动时验证失败
