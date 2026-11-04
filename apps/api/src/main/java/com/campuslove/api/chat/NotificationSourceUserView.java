package com.campuslove.api.chat;

/**
 * 通知源用户视图。
 *
 * <p>R14-4（2026-11-05）：新增 {@code id}（首位，nullable）——客户端通知跳转此前只能用
 * 显示名查 ID（P1 BUG 根因）；id 缺失时（mock 档假想用户）客户端回退 resourceId 跳转。</p>
 */
public record NotificationSourceUserView(
    Long id,
    String displayName,
    String avatar
) {}
