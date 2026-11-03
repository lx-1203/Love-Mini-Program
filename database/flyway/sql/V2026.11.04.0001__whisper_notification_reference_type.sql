-- 悄悄话到达通知（2026-11-04，第三辑审查 F-10）
-- 背景：悄悄话（付费留言）发送链路完整（发送 UI/后端/扣费/敏感词过滤），但收件侧无到达通知、
--       无收件箱 UI——发送者付费后收件人感知不到（商业付费功能收件侧断点）。
-- 本迁移：notifications.reference_type 的 CHECK 约束增加 'whisper' 值（幂等，沿用
--       V2026.10.28.0010 风格），供「收到悄悄话」系统通知携带落点语义；
--       Java 侧 ReferenceType 枚举同步补 whisper（entity/Notification.java）。
-- 幂等性：通过 information_schema 条件判断，可重复执行。

-- 1. 删除旧 CHECK 约束（存在才删除，幂等）
SET @drop_whisper_reference_check := (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND CONSTRAINT_NAME = 'chk_notifications_reference_type'
              AND CONSTRAINT_TYPE = 'CHECK'
        ),
        'ALTER TABLE notifications DROP CHECK chk_notifications_reference_type',
        'SELECT 1'
    )
);
PREPARE stmt_drop_whisper_reference_check FROM @drop_whisper_reference_check;
EXECUTE stmt_drop_whisper_reference_check;
DEALLOCATE PREPARE stmt_drop_whisper_reference_check;

-- 2. 重建 CHECK 约束（含 whisper；reference_type 可空语义保持）
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_reference_type
    CHECK (reference_type IS NULL OR reference_type IN ('post','comment','user','topic','whisper'));
