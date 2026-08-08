-- ============================================================
-- R4-00372 / R4-00374 / R4-00375：notifications.type 增加 system / unmatch 枚举值
--
-- 背景：
--   * 签到奖励等系统通知此前无独立类型，被归入 match（用户收到"匹配"语义的错误通知）
--   * 取消匹配（unmatch）事件持久化通知也用 match，被取消匹配的用户收到
--     「你们互相喜欢了」同型通知，语义混淆
--   * NotificationConsumer.mapType 对未知类型静默映射为 match
--
-- 处理：
--   * 扩展 notifications.type 的 CHECK 约束，允许 'system' / 'unmatch' 两个新值
--     （列已由 V2026.07.27.0005 从 ENUM 转为 VARCHAR(32) + CHECK 约束）
--   * Java 侧 NotificationType 枚举已同步补齐（entity/Notification.java）
--   * 消费端（NotificationConsumer / CheckInEventConsumer / MatchEventConsumer）
--     已按新类型映射/持久化
--
-- 幂等性：通过 information_schema 条件判断，可重复执行（对齐
-- V2026.07.27.0005 的幂等风格）。
-- ============================================================

-- 1. 删除旧 CHECK 约束（存在才删除，幂等）
SET @drop_check := (
    SELECT IF(COUNT(*) > 0,
              'ALTER TABLE notifications DROP CHECK chk_notifications_type',
              'SELECT 1')
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND CONSTRAINT_NAME = 'chk_notifications_type'
      AND CONSTRAINT_TYPE = 'CHECK');
PREPARE stmt_drop_check FROM @drop_check;
EXECUTE stmt_drop_check;
DEALLOCATE PREPARE stmt_drop_check;

-- 2. 重建 CHECK 约束（含 system / unmatch；不存在才添加，幂等）
SET @add_check := (
    SELECT IF(COUNT(*) = 0,
              'ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (type IN (''follow'',''like'',''comment'',''visitor'',''match'',''system'',''unmatch''))',
              'SELECT 1')
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND CONSTRAINT_NAME = 'chk_notifications_type'
      AND CONSTRAINT_TYPE = 'CHECK');
PREPARE stmt_add_check FROM @add_check;
EXECUTE stmt_add_check;
DEALLOCATE PREPARE stmt_add_check;
