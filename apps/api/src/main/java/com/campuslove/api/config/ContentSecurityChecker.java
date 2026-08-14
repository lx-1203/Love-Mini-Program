package com.campuslove.api.config;

/**
 * 内容安全检查器接口（2026-08-10 C1）。
 *
 * <p>微信审核红线要求：UGC（用户生成内容）功能必须具备违规内容过滤机制。
 * 本接口抽象统一入口，默认实现为本地敏感词过滤（{@link LocalContentSecurityChecker}，
 * 兜底保障）；配置了微信小程序凭据后由 {@link WeChatMsgSecCheckClient} 优先调用
 * 微信官方 msgSecCheck（有凭据才启用），微信侧不可用时自动降级本地过滤。
 * 现有 UGC 服务继续直接使用 {@link SensitiveWordFilter}（已覆盖 10+ 入口），
 * 本接口面向新接入入口与统一审计，不重写存量调用。</p>
 *
 * <p>调用方约定：高风险（risky）内容必须拦截；review 内容允许通过但记录日志；
 * 检查失败（网络/超时）必须降级为本地过滤而非直接放行（fail-closed 语义）。</p>
 */
public interface ContentSecurityChecker {

    /**
     * 检查文本内容。
     *
     * @param content 待检查文本（短文本，≤2500 字符，超出截断）
     * @param userId  内容发布者用户 ID（微信 msgSecCheck v2 需要 openid 映射，可空）
     * @param scene   场景标识（1=资料 2=评论 3=论坛 4=社交日志）
     * @return 检查结果（never null）
     */
    ContentSecurityVerdict check(String content, Long userId, String scene);
}
