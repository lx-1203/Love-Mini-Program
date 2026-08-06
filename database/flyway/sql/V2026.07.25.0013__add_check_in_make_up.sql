-- 功能7：签到补签
-- 1. 在 check_ins 表新增 source 列，标记签到来源（NORMAL=正常签到，MAKE_UP=补签）
-- 2. 新增 make_up_quota 表，记录用户每月补签次数配额与已用次数（每月重置）

-- 1. check_ins 表新增 source 列（默认 NORMAL，兼容历史数据）
ALTER TABLE check_ins
    ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'NORMAL' COMMENT '签到来源：NORMAL=正常签到，MAKE_UP=补签' AFTER consecutive_days;

-- 为 source 列添加索引，便于按来源统计
ALTER TABLE check_ins
    ADD INDEX idx_checkin_source (source);

-- 2. 新增 make_up_quota 表：记录用户每月补签配额
-- 每月生成一条记录，记录当月已用补签次数
CREATE TABLE IF NOT EXISTS make_up_quota (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
    `year_month` VARCHAR(7) NOT NULL COMMENT '年月（yyyy-MM），每月一条',
    used_count INT NOT NULL DEFAULT 0 COMMENT '当月已用补签次数',
    limit_count INT NOT NULL DEFAULT 3 COMMENT '当月补签次数上限（默认 3）',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_makeup_user_month (user_id, `year_month`),
    KEY idx_makeup_year_month (`year_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='签到补签每月配额表';
