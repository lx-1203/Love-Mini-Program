package com.campuslove.api.growth;

import java.util.Map;

/**
 * 客户端应用配置聚合视图（B6：后台配置即时生效，前后端联动）。
 *
 * <p>GET /api/v1/app-config 返回的扁平视图（仅包含对客户端开放的配置子集，
 * 与管理后台的 AdminConfigView / AdminSwitchView / AdminRuleView 信封结构解耦）：
 * <ul>
 *   <li>{@code switches}：功能开关（key → 是否开启），缺失开关默认视为开启（true）</li>
 *   <li>{@code rules}：业务规则（key → 数值），缺失规则使用内置默认值</li>
 *   <li>{@code siteTitle}：站点标题（app_config.site.title，默认「校园恋爱」）</li>
 * </ul>
 * </p>
 *
 * <p>数据源为 app_switch / app_rule / app_config 三张表，读取时不缓存，
 * 管理后台更新后客户端下一次拉取即可拿到最新值（即时生效）。</p>
 *
 * @param switches 功能开关映射（如 maintenance_mode / register_open / login_open / match_open / recommend_open / post_publish_open / feedback_open）
 * @param rules    业务规则映射（如 daily_recommend_limit / heart_signal_expire_hours）
 * @param siteTitle 站点标题
 */
public record AppConfigView(
    Map<String, Boolean> switches,
    Map<String, Integer> rules,
    String siteTitle
) {
}
