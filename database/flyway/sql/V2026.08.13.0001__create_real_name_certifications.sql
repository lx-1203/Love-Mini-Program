-- ============================================================
-- 迁移：创建实名认证表 real_name_certifications
-- ============================================================
-- 背景：
--   实名认证（B1-2）：用户提交姓名 + 身份证号 + 身份证正反面照片，
--   由运营审核通过后置位 user_basic_profile.id_card_verified，
--   作为校园认证（学历认证 B1-3）的前置门槛（未实名不得提交学历认证）。
--
-- 安全说明：
--   * id_card_no 为 AES-GCM 加密密文（Base64），禁止明文落库；
--     应用层通过 AesEncryptor 加解密，数据库侧不感知明文。
--
-- 状态取值（大写，与校园认证 campus_certifications 对齐）：
--   PENDING  —— 审核中
--   APPROVED —— 已认证（重复提交报业务错误）
--   REJECTED —— 未通过（可重新提交覆盖）
--
-- 注意：
--   * user_id 唯一：每用户一条申请记录，rejected 后重新提交覆盖原记录
--   * version 乐观锁列：与项目 Task 2.1.1 数据一致性基础设施保持一致
--   * status CHECK 约束：对齐 posts.category 的 chk_posts_category 惯例
-- ============================================================

CREATE TABLE IF NOT EXISTS real_name_certifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE COMMENT '申请人用户 ID（每人一条）',
    user_name VARCHAR(64) NOT NULL COMMENT '真实姓名',
    id_card_no VARCHAR(512) NOT NULL COMMENT '身份证号（AES-GCM 加密密文）',
    id_card_front_url VARCHAR(512) COMMENT '身份证人像面（正面）照片 URL',
    id_card_back_url VARCHAR(512) COMMENT '身份证国徽面（背面）照片 URL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    reviewer_id BIGINT UNSIGNED COMMENT '审核人 ID',
    review_comment VARCHAR(500) COMMENT '审核意见（驳回原因等）',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    reviewed_at DATETIME COMMENT '审核时间',
    version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    CONSTRAINT chk_real_name_cert_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
) COMMENT='实名认证申请表';

-- 状态筛选索引（管理后台默认按 PENDING 查询）
CREATE INDEX idx_real_name_cert_status ON real_name_certifications (status, submitted_at DESC);
