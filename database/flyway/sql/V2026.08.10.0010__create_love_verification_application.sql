-- ============================================================
-- 迁移：创建恋爱认证申请表 love_verification_application
-- ============================================================
-- 背景：
--   恋爱认证（恋爱小程序「认证」页）：用户提交学生证照片 + 姓名/学号/学校，
--   由运营审核后获得「已认证」身份徽章（与校园认证 campus_certifications 独立，
--   校园认证面向校园社交内容可见性，恋爱认证面向身份信任体系）。
--
-- 状态取值（小写，与前端 VerifyStatus 对齐）：
--   pending  —— 审核中
--   approved —— 已认证（重复提交报业务错误）
--   rejected —— 未通过（可重新提交覆盖）
--
-- 注意：
--   * user_id 唯一：每用户一条申请记录，rejected 后重新提交覆盖原记录
--   * version 乐观锁列：与项目 Task 2.1.1 数据一致性基础设施保持一致
-- ============================================================

CREATE TABLE IF NOT EXISTS love_verification_application (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE COMMENT '申请人用户 ID（每人一条）',
    student_name VARCHAR(64) NOT NULL COMMENT '学生姓名',
    student_id VARCHAR(64) NOT NULL COMMENT '学号',
    school_name VARCHAR(128) NOT NULL COMMENT '学校名称',
    student_id_card_url VARCHAR(512) COMMENT '学生证照片 URL',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
    reject_reason VARCHAR(500) COMMENT '驳回原因（审核不通过时填写）',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    reviewed_at DATETIME COMMENT '审核时间',
    version BIGINT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='恋爱认证申请表';
