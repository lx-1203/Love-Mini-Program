package com.campuslove.api.official;

/**
 * 官方账号视图（2026-08-07 官方号体系）。
 * 供消息列表官方号会话、官方号会话页元信息使用。
 */
public record OfficialAccountView(
        Long id,
        String code,
        String name,
        String description,
        String iconUrl) {
}
