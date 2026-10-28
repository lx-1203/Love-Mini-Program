-- 通知类型增加 mention（2026-10-28）
-- 沿用 V2026.08.09.0011 的幂等写法：存在旧 CHECK 先删，再重建含 mention 的约束。
SET @drop_mention_check = (
    SELECT IF(
        EXISTS(
            SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'notifications'
              AND CONSTRAINT_NAME = 'chk_notifications_type'
              AND CONSTRAINT_TYPE = 'CHECK'
        ),
        'ALTER TABLE notifications DROP CHECK chk_notifications_type',
        'SELECT 1'
    )
);
PREPARE stmt_drop_mention_check FROM @drop_mention_check;
EXECUTE stmt_drop_mention_check;
DEALLOCATE PREPARE stmt_drop_mention_check;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
    CHECK (type IN ('follow','like','comment','visitor','match','system','unmatch','mention'));
