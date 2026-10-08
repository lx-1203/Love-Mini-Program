-- ============================================================
-- 迁移：创建协议同意留痕表 user_agreement_consent
-- ============================================================
-- 背景（2026-10-05 合规落库，任务 9 服务端半边）：
--   记录用户对法律文本（用户协议/隐私政策，按版本号标识）的同意行为，
--   满足同意可追溯的合规要求。注册链路由应用层写入（source=REGISTER）；
--   存量用户由 V2026.10.05.0003 回填（source=BACKFILL，以其注册时间为 agreed_at）。
--
-- 语义唯一键 (user_id, legal_version, source)：
--   同一用户对同一版本+来源只留一条，重复写入幂等跳过。
--
-- 回滚：DROP TABLE user_agreement_consent;
-- ============================================================

CREATE TABLE IF NOT EXISTS user_agreement_consent (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户 ID',
    legal_version VARCHAR(32) NOT NULL COMMENT '同意的法律文本版本（如 v1.0.0）',
    agreed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '同意时间',
    ip VARCHAR(64) COMMENT '同意时的客户端 IP（尽力记录，可空）',
    source VARCHAR(16) NOT NULL COMMENT '同意来源：REGISTER/PAYMENT/BACKFILL',
    CONSTRAINT chk_user_agreement_consent_source CHECK (source IN ('REGISTER', 'PAYMENT', 'BACKFILL')),
    CONSTRAINT uk_user_agreement_consent UNIQUE (user_id, legal_version, source),
    CONSTRAINT fk_user_agreement_consent_user FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='协议同意留痕表（法律文本版本可追溯）';

-- 按版本查询统计场景（如合规报表：某版本共多少人同意）
CREATE INDEX idx_user_agreement_consent_version ON user_agreement_consent (legal_version, source);
