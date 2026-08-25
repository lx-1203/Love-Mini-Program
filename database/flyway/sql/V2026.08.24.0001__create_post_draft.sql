-- 创建发布草稿表 post_draft
-- 每用户一条草稿（upsert 语义），前端本地 storage 双写兜底
CREATE TABLE IF NOT EXISTS post_draft (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL COMMENT '用户 ID',
    target_type     VARCHAR(20)  NOT NULL DEFAULT 'general' COMMENT '发布目标：general/circle/campus',
    target_id       BIGINT       NULL     COMMENT '圈子 ID（targetType=circle 时有值）',
    title           VARCHAR(30)  NULL     COMMENT '标题（备用，当前未使用）',
    content         VARCHAR(5000) NULL    COMMENT '正文内容',
    images          JSON         NULL     COMMENT '图片 URL 列表',
    tags            JSON         NULL     COMMENT '话题标签列表',
    topics          JSON         NULL     COMMENT '话题列表',
    location        VARCHAR(120) NULL     COMMENT '位置描述',
    visibility      VARCHAR(20)  NOT NULL DEFAULT 'circle_members' COMMENT '可见范围',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- 每用户一条草稿
    UNIQUE KEY uk_post_draft_user (user_id),
    INDEX idx_post_draft_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发布草稿';
