package com.campuslove.api.match;

/**
 * 喜欢我的用户视图。
 * 用于展示谁喜欢了当前用户。
 *
 * @param unlocked P0-17：当前用户是否已解锁该条喜欢我的信息
 *                 （已解锁可查看完整昵称/头像，未解锁由前端打码并引导解锁）
 */
public record LikedUserView(
    Long userId,
    String nickname,
    String avatarUrl,
    String campusName,
    String likedAt,
    boolean unlocked
) {}
