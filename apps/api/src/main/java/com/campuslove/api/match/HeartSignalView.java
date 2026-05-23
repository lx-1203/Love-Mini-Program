package com.campuslove.api.match;

/**
 * 心动信号视图。
 * 用于展示互相喜欢后的心动信号，包含发起方用户信息。
 */
public record HeartSignalView(
    Long id,
    Long userAId,
    Long userBId,
    String status,
    String expiresAt,
    String createdAt,
    /** 发起方用户名称（userA） */
    String fromUserName,
    /** 发起方用户头像（userA） */
    String fromUserAvatar
) {}
