package com.campuslove.api.match;

/**
 * 访客视图。
 * 用于展示谁访问了当前用户的主页。
 *
 * @param unlocked P0-17：当前用户是否已解锁该条访客信息
 *                 （已解锁可查看完整昵称/头像，未解锁由前端打码并引导解锁）
 */
public record VisitorView(
    Long visitorId,
    String nickname,
    String avatarUrl,
    String campusName,
    String visitedAt,
    boolean unlocked
) {}
