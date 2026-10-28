-- 法律文本 CMS（2026-10-28）
-- 背景：客户端 legal-texts.ts 按 { items: [...] } 解析，而后端 /config/legal 原先返回裸
-- LegalTextView 且无 version/type，real 模式永远落本地兜底。本表是正式文本的唯一真源；
-- 首次启动由 LegalDocumentService 用 LegalTextProvider 的现有文本种成 v1.0.0（待法务复核）。
CREATE TABLE IF NOT EXISTS legal_document (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_type VARCHAR(32) NOT NULL COMMENT 'user_agreement / privacy_policy',
    title VARCHAR(128) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    version VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT 'published / draft',
    effective_at DATETIME NULL,
    updated_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_legal_document_type_version (doc_type, version),
    KEY idx_legal_document_type_status (doc_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法律文本（用户协议/隐私政策）';
