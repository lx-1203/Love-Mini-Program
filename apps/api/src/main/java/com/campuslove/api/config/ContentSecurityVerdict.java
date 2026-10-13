package com.campuslove.api.config;

/**
 * 内容安全检查结果（2026-08-10 C1）。
 *
 * <p>对齐微信 msgSecCheck v2 语义：suggest 为综合判定
 * （pass=通过 / review=需人工复核 / risky=高风险违规）。</p>
 *
 * @param suggest 综合判定（pass/review/risky）
 * @param label   违规类型标签（本地过滤时为敏感词命中标识，微信检测时为 label 编码）
 * @param source  判定来源（local / wechat），用于审计日志
 */
public record ContentSecurityVerdict(
    String suggest,
    String label,
    String source
) {

    /**
     * 规范化 suggest 为小写：调用方一律用 {@code "risky".equals(verdict.suggest())} 判定拦截，
     * 而 wechat 侧日志判断用的是 equalsIgnoreCase。若上游返回 "Risky"/"RISKY"，
     * 大小写敏感的 equals 会漏判，违规内容被放行（静默 fail-open）。在此收口一次，
     * 避免逐个调用点改成 equalsIgnoreCase。
     */
    public ContentSecurityVerdict {
        if (suggest != null) {
            suggest = suggest.trim().toLowerCase(java.util.Locale.ROOT);
        }
    }

    /** 判定通过（内容可放行） */
    public static ContentSecurityVerdict pass() {
        return new ContentSecurityVerdict("pass", null, "local");
    }

    public boolean isPass() {
        return "pass".equals(suggest);
    }
}
