package com.campuslove.api.auth;

import java.util.Map;

/**
 * 用户会话视图，返回给客户端。
 * token 字段在 mock 模式下为 null，在 db 模式下为有效的会话 token。
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
}