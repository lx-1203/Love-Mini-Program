package com.campuslove.api.admin;

import java.util.List;

/**
 * 管理后台 - 系统配置服务接口。
 * 提供系统参数、业务规则、功能开关的查询与更新能力。
 *
 * <p>对应任务 8 的 6 个接口：
 * <ul>
 *     <li>GET  /api/admin/configs</li>
 *     <li>PUT  /api/admin/configs/{key}</li>
 *     <li>GET  /api/admin/rules</li>
 *     <li>PUT  /api/admin/rules/{id}</li>
 *     <li>GET  /api/admin/switches</li>
 *     <li>PUT  /api/admin/switches/{key}</li>
 * </ul>
 */
public interface AdminConfigService {

    /**
     * 列出全部系统参数配置。
     *
     * @return 系统参数配置列表
     */
    List<AdminConfigView> listConfigs();

    /**
     * 按 key 更新系统参数配置。
     *
     * @param key        配置键
     * @param value      新配置值
     * @param description 配置说明（可选，null 表示不修改）
     * @param operatorId 操作者用户ID
     * @return 更新后的配置视图
     */
    AdminConfigView updateConfig(String key, String value, String description, Long operatorId);

    /**
     * 列出全部业务规则。
     *
     * @return 业务规则列表
     */
    List<AdminRuleView> listRules();

    /**
     * 按 id 更新业务规则。
     *
     * @param id         规则 ID
     * @param expression 新规则表达式/值（可选，null 表示不修改）
     * @param enabled    是否启用（可选，null 表示不修改）
     * @param description 规则说明（可选，null 表示不修改）
     * @param operatorId 操作者用户ID
     * @return 更新后的规则视图
     */
    AdminRuleView updateRule(Long id, String expression, Boolean enabled, String description, Long operatorId);

    /**
     * 列出全部功能开关。
     *
     * @return 功能开关列表
     */
    List<AdminSwitchView> listSwitches();

    /**
     * 按 key 切换功能开关。
     *
     * @param key        开关键
     * @param enabled    是否启用
     * @param operatorId 操作者用户ID
     * @return 更新后的开关视图
     */
    AdminSwitchView updateSwitch(String key, Boolean enabled, Long operatorId);
}
