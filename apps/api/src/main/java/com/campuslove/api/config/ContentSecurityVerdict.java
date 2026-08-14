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

    /** 判定通过（内容可放行） */
    public static ContentSecurityVerdict pass() {
        return new ContentSecurityVerdict("pass", null, "local");
    }

    public boolean isPass() {
        return "pass".equals(suggest);
    }
}
