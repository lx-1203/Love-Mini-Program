package com.campuslove.api.auth;

/**
 * Token 黑名单服务接口。
 *
 * <p>Task 0.5.3 新增：提供 JWT 撤销能力，支持用户主动登出后令牌立即失效。
 * 实现类负责将 jti（JWT ID）写入持久化存储（如 Redis），并支持后续查询是否已撤销。</p>
 *
 * <p>设计说明：</p>
 * <ul>
 *   <li>使用 jti（JWT ID）作为黑名单键，而非完整 token 字符串：
 *     <ul>
 *       <li>更短的 Redis key（jti 通常是 UUID），节省内存</li>
 *       <li>遵循 JWT 标准（jti 是 RFC 7519 定义的 Token ID claim）</li>
 *       <li>避免将完整 token 写入 Redis，降低泄露风险</li>
 *     </ul>
 *   </li>
 *   <li>TTL = JWT 剩余有效期：Token 自然过期后黑名单条目自动清理，避免无限增长</li>
 *   <li>Redis Key 格式：{@code jwt:blacklist:{jti}}</li>
 * </ul>
 *
 * <p>调用方：</p>
 * <ul>
 *   <li>{@link com.campuslove.api.config.JwtTokenProvider#revokeToken} —— 登出时调用</li>
 *   <li>{@link com.campuslove.api.config.JwtAuthenticationFilter} —— 每次请求校验 jti 是否已撤销</li>
 *   <li>{@link com.campuslove.api.auth.AuthController#logout} —— 通过 AuthService 间接调用</li>
 * </ul>
 */
public interface TokenBlacklistService {

    /**
     * 将指定 jti 加入黑名单，TTL 为 JWT 剩余有效期。
     *
     * <p>实现应保证幂等性：同一 jti 多次 revoke 不报错，TTL 以最后一次调用为准。</p>
     *
     * @param jti         JWT ID（RFC 7519 标准 claim）
     * @param ttlSeconds  TTL（秒），等于 JWT 剩余有效期；&lt;= 0 时实现可跳过写入
     */
    void revoke(String jti, long ttlSeconds);

    /**
     * 查询指定 jti 是否已在黑名单中（即已被主动撤销）。
     *
     * <p>实现应保证：</p>
     * <ol>
     *   <li>jti 为 null/blank 时返回 false（不阻塞未携带 jti 的兼容场景）</li>
     *   <li>底层存储不可用时降级返回 false（不阻塞主流程，由后续签名校验兜底）</li>
     * </ol>
     *
     * @param jti JWT ID
     * @return true 表示已撤销，应拒绝认证；false 表示未撤销
     */
    boolean isRevoked(String jti);
}
