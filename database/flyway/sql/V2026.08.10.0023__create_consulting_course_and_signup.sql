-- ============================================================
-- 迁移：恋爱咨询课程表 + 报名表（3-I 咨询报名）
-- ============================================================
-- 背景（2026-08-10）：
--   1. 恋爱咨询课程展示与报名（前端 pages/love-center/consulting.vue）；
--   2. 种子数据对齐前端 3 门常量课程（文案走前端 i18n
--      contentPages.consulting.course1/2/3，价格 ¥99/¥129/¥159）：
--      - 恋爱沟通课 ¥99
--      - 脱单攻略课 ¥129
--      - 亲密关系修复课 ¥159
--   3. category 与前端 COURSE_PRICES 语义对齐：
--      communication（恋爱沟通）/ dating（脱单攻略）/ intimacy_repair（亲密关系修复）；
--   4. 无支付：本阶段仅报名记录（consulting_signup），支付链路为明确占位
--      （接入支付后在同一课程上扩展订单表）。
-- ============================================================

CREATE TABLE consulting_course (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    title VARCHAR(64) NOT NULL COMMENT '课程标题',
    description VARCHAR(255) NULL COMMENT '课程简介',
    price DECIMAL(10,2) NOT NULL COMMENT '课程价格（元）',
    cover_url VARCHAR(512) NULL COMMENT '封面图 URL（空则前端回退占位图）',
    category VARCHAR(32) NOT NULL DEFAULT 'communication' COMMENT '课程分类：communication/dating/intimacy_repair',
    status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态：1=可报名，0=下架',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='恋爱咨询课程表';

CREATE TABLE consulting_signup (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id BIGINT NOT NULL COMMENT '报名用户ID（users.id）',
    course_id BIGINT NOT NULL COMMENT '课程ID（consulting_course.id）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
    UNIQUE KEY uk_consulting_signup_user_course (user_id, course_id),
    KEY idx_consulting_signup_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='咨询课程报名表';

-- 种子数据：对齐前端 consulting.vue 的 3 门常量课程（价格 ¥99/¥129/¥159）
INSERT INTO consulting_course (title, description, price, cover_url, category, status) VALUES
('恋爱沟通课', '掌握高情商沟通，让相处更舒服', 99.00, NULL, 'communication', 1),
('脱单攻略课', '从认识自己开始，找到对的TA', 129.00, NULL, 'dating', 1),
('亲密关系修复课', '化解矛盾，重建信任与亲密', 159.00, NULL, 'intimacy_repair', 1);
