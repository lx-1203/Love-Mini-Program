package com.campuslove.api.auth;

import com.campuslove.api.monitor.AuthMetrics;

/**
 * 微信登录端点共享实现（R4-00268）。
 *
 * <p>原 {@link WechatAuthController#loginWithWechat}（/api/v1/auth/wechat，推荐路径）
 * 与 {@link AuthController#loginWithWechat}（/api/v1/auth/wechat-login，旧路径别名）
 * 各自重复实现"调用 AuthService + 指标埋点 + 失败原因记录"，存在双实现契约漂移风险。
 * 现收敛为单一共享实现：两个端点保留（兼容旧客户端），均委托本类的
 * {@link #login(AuthService, AuthMetrics, String)}，指标与异常处理语义唯一。</p>
 */
final class WechatLoginSupport {

    private WechatLoginSupport() {
        // 工具类，禁止实例化
    }

    /**
     * 微信登录共享实现：委托 {@link AuthService#loginWithWechat} 并统一指标埋点。
     *
     * @param authService 认证服务（real/mock 由 profile 决定）
     * @param authMetrics 登录指标
     * @param code        wx.login() 返回的临时 code
     * @param deviceId    客户端设备标识（3-D 设备管理：可空）
     * @return 用户会话视图
     */
    static UserSessionView login(AuthService authService, AuthMetrics authMetrics, String code, String deviceId) {
        try {
            UserSessionView session = authService.loginWithWechat(code, deviceId);
            // 登录成功：记录成功指标（指标失败不影响主流程）
            try {
                if (session != null && session.userId() != null) {
                    authMetrics.recordLoginSuccess(parseUserId(session.userId()));
                }
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略，不影响登录主流程
            }
            return session;
        } catch (RuntimeException e) {
            // 登录失败：记录失败指标，原因取异常类名避免泄露敏感信息
            try {
                authMetrics.recordLoginFailure(e.getClass().getSimpleName());
            } catch (RuntimeException ignore) {
                // 监控逻辑失败忽略
            }
            throw e;
        }
    }

    /**
     * 将会话视图中的 userId 字符串安全转换为 Long。
     * 转换失败返回 null，避免监控逻辑因数据格式问题影响主流程。
     */
    private static Long parseUserId(String userIdStr) {
        if (userIdStr == null || userIdStr.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(userIdStr);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
