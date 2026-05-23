package com.campuslove.api.match;

/**
 * 访客视图。
 * 用于展示谁访问了当前用户的主页。
 */
public record VisitorView(
    Long visitorId,
    String nickname,
    String avatarUrl,
    String campusName,
    String visitedAt
) {}
