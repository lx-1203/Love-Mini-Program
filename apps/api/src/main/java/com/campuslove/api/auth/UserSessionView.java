package com.campuslove.api.auth;

import java.util.Map;

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
    Map<String, Boolean> featureFlags
) {
}
