-- ============================================================
-- 迁移：补充 Entity 索引注解对应的新增数据库索引
-- ============================================================
-- 背景：
--   本次任务在 JPA Entity 上补充了 @Index / @UniqueConstraint 注解，
--   用于声明索引元数据。由于项目使用 spring.jpa.hibernate.ddl-auto=validate，
--   Hibernate 不会根据注解自动创建索引，必须通过 Flyway 脚本在数据库中创建。
--
--   本脚本只创建数据库中尚不存在的索引，已有的索引（如 uk_users_openid、
--   idx_users_phone、idx_posts_author、idx_notifications_user_read、
--   uk_checkin_user_date、uk_likes_user_target、idx_heart_signals_user_a/b、
--   idx_vip_bills_user/status/transaction、idx_feedback_user_id/type/status、
--   idx_private_messages_sender_created_at 等）已在先前迁移中创建，不再重复。
--
-- 新增索引清单（共 7 条）：
--   1. notifications (user_id, created_at)              — 用户通知按时间分页
--   2. heart_signals (created_at)                       — 心动信号按时间排序
--   3. vip_bills (created_at)                           — VIP 账单按时间排序
--   4. feedback_tickets (created_at)                    — 反馈工单按时间排序
--   5. private_messages (conversation_id, created_at)   — 会话消息按时间分页
--   6. private_messages (created_at)                    — 消息按时间全局扫描
--   7. private_messages (delivery_status)               — 按投递状态过滤
--
-- 实现说明：
--   * 使用 CREATE INDEX IF NOT EXISTS（MySQL 8.0+ 支持），避免重复执行报错
--   * 索引命名与 Entity 注解中 @Index(name=...) 完全一致，便于双向维护
--   * 任务规格中部分字段名（session_id/status/order_no/sender_id+receiver_id）
--     与实际表结构不符，本迁移按实际表结构使用对应列名（详见每条索引注释）
-- ============================================================

-- 1. notifications (user_id, created_at) — 用户通知按时间分页
--    用途：通知列表分页查询，按用户+创建时间倒序获取
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
    ON notifications (user_id, created_at);

-- 2. heart_signals (created_at) — 心动信号按时间排序
--    用途：心动信号列表按时间分页，全局扫描过期信号
CREATE INDEX IF NOT EXISTS idx_heart_signals_created_at
    ON heart_signals (created_at);

-- 3. vip_bills (created_at) — VIP 账单按时间排序
--    用途：账单列表按时间分页，财务对账按时间范围查询
CREATE INDEX IF NOT EXISTS idx_vip_bills_created_at
    ON vip_bills (created_at);

-- 4. feedback_tickets (created_at) — 反馈工单按时间排序
--    用途：工单列表按时间分页，管理员按时间范围筛选
CREATE INDEX IF NOT EXISTS idx_feedback_created_at
    ON feedback_tickets (created_at);

-- 5. private_messages (conversation_id, created_at) — 会话消息按时间分页
--    用途：会话内消息分页查询（任务规格 session_id+created_at 的对应）
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation_created_at
    ON private_messages (conversation_id, created_at);

-- 6. private_messages (created_at) — 消息按时间全局扫描
--    用途：全局消息按时间排序、定时清理任务
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at
    ON private_messages (created_at);

-- 7. private_messages (delivery_status) — 按投递状态过滤
--    用途：按投递状态（sent/delivered/read）筛选消息，任务规格 status 的对应
CREATE INDEX IF NOT EXISTS idx_private_messages_delivery_status
    ON private_messages (delivery_status);

-- ============================================================
-- DOWN 回滚脚本（手动执行，Flyway 不自动回滚）
-- ============================================================
-- DROP INDEX idx_notifications_user_created_at ON notifications;
-- DROP INDEX idx_heart_signals_created_at ON heart_signals;
-- DROP INDEX idx_vip_bills_created_at ON vip_bills;
-- DROP INDEX idx_feedback_created_at ON feedback_tickets;
-- DROP INDEX idx_private_messages_conversation_created_at ON private_messages;
-- DROP INDEX idx_private_messages_created_at ON private_messages;
-- DROP INDEX idx_private_messages_delivery_status ON private_messages;
