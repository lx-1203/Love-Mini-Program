package com.campuslove.api.clientconfig;

/**
 * 客户端通知配置视图。
 *
 * <p>与管理后台 {@code AdminNotifyConfigController} 的 NotifyConfigView
 * 结构一致（type / enabled / template / updatedAt），供客户端按通知类型
 * 读取启停状态与模板内容。</p>
 *
 * @param type      通知类型（LIKE / COMMENT / FOLLOW / VISITOR / MATCH / SYSTEM 等）
 * @param enabled   是否启用
 * @param template  通知模板内容（可空）
 * @param updatedAt 最近更新时间（ISO 字符串，可空）
 */
public record ClientNotifyConfigView(
        String type,
        Boolean enabled,
        String template,
        String updatedAt
) {}
