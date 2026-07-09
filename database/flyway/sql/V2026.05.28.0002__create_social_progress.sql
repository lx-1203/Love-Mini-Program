-- ============================================================
-- 社交升温漏斗表
-- 用于追踪用户在校园恋爱社交路径中的进阶进度
-- 从曝光到线下见面的六层漏斗模型
-- ============================================================

CREATE TABLE IF NOT EXISTS social_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    current_tier VARCHAR(20) NOT NULL DEFAULT 'L1_EXPOSURE' COMMENT '当前社交层级: L1_EXPOSURE/L2_ATTENTION/L3_MATCH/L4_COMMUNICATION/L5_CIRCLE/L6_SCENE',
    exposure_count INT NOT NULL DEFAULT 0 COMMENT '曝光次数',
    like_count INT NOT NULL DEFAULT 0 COMMENT '喜欢/点赞次数',
    match_count INT NOT NULL DEFAULT 0 COMMENT '匹配次数',
    chat_count INT NOT NULL DEFAULT 0 COMMENT '聊天次数',
    circle_count INT NOT NULL DEFAULT 0 COMMENT '社区互动次数',
    activity_count INT NOT NULL DEFAULT 0 COMMENT '活动参与次数',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT uk_social_progress_user_id UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社交升温进度表';