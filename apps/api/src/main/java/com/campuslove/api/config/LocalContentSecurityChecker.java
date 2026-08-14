package com.campuslove.api.config;

import org.springframework.stereotype.Component;

/**
 * 本地敏感词内容安全检查器（默认实现，兜底保障）。
 *
 * <p>包装 {@link SensitiveWordFilter}（敏感词库由 admin 端管理，见 AdminSensitiveWordController）：
 * 命中敏感词 → risky（必须拦截）；未命中 → pass。
 * 微信 msgSecCheck 未配置凭据时，这是唯一生效的检查器（审核红线要求的本地过滤机制）。</p>
 */
@Component
public class LocalContentSecurityChecker implements ContentSecurityChecker {

    private final SensitiveWordFilter sensitiveWordFilter;

    public LocalContentSecurityChecker(SensitiveWordFilter sensitiveWordFilter) {
        this.sensitiveWordFilter = sensitiveWordFilter;
    }

    @Override
    public ContentSecurityVerdict check(String content, Long userId, String scene) {
        if (content == null || content.isBlank() || !sensitiveWordFilter.isEnabled()) {
            return ContentSecurityVerdict.pass();
        }
        if (sensitiveWordFilter.containsSensitive(content)) {
            return new ContentSecurityVerdict("risky", "sensitive-word", "local");
        }
        return ContentSecurityVerdict.pass();
    }
}
