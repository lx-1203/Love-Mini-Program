package com.campuslove.api.admin.audit;

/**
 * 审计操作类型枚举。
 * <p>用于 {@link Auditable} 注解标识管理端操作的类型，
 * 切面将该枚举名写入 audit_log.operation 字段，便于后续按类型筛选审计记录。</p>
 */
public enum AuditOperation {

    AUDIT_POST("审核帖子"),
    DELETE_POST("删除帖子"),
    DELETE_COMMENT("删除评论"),
    DISABLE_USER("禁用用户"),
    ENABLE_USER("启用用户"),
    EDIT_USER("编辑用户"),
    HANDLE_REPORT("处理举报"),
    REVIEW_CERTIFICATION("审核认证"),
    UPDATE_CONFIG("更新配置"),
    UPDATE_RULE("更新规则"),
    UPDATE_SWITCH("更新开关"),
    UPDATE_MATCH_CONFIG("更新匹配配置"),
    UPDATE_RECOMMEND_STRATEGY("更新推荐策略"),
    UPDATE_NOTIFY_CONFIG("更新通知配置"),
    ADD_SENSITIVE_WORD("新增敏感词"),
    DELETE_SENSITIVE_WORD("删除敏感词");

    private final String description;

    AuditOperation(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
