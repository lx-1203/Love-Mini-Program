package com.campuslove.api.auth;

import java.util.Map;

/**
 * 用户会话视图，包含登录状态和 JWT 令牌。
 */
public record UserSessionView(
    String userId,
    boolean loggedIn,
    String loginMethod,
    String displayName,
    boolean phoneBound,
    boolean profileCompleted,
    boolean campusVerified,
    boolean scheduleCompleted,
    String campusName,
    Map<String, Boolean> featureFlags,
    String token
) {

    /**
     * 兼容旧调用方式的工厂方法（不含 token）。
     */
    public static UserSessionView withoutToken(
            String userId,
            boolean loggedIn,
            String loginMethod,
            String displayName,
            boolean phoneBound,
            boolean profileCompleted,
            boolean campusVerified,
            boolean scheduleCompleted,
            String campusName,
            Map<String, Boolean> featureFlags
    ) {
        return new UserSessionView(
                userId, loggedIn, loginMethod, displayName,
                phoneBound, profileCompleted, campusVerified,
                scheduleCompleted, campusName, featureFlags, null
        );
    }
}
