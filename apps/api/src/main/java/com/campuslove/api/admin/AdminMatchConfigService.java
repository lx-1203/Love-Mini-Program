package com.campuslove.api.admin;

import java.util.Map;

/**
 * 管理后台 - 匹配算法与推荐策略配置服务接口（任务 10）。
 * 提供匹配算法配置和推荐策略配置的查询与更新能力。
 *
 * <p>对应任务 10 的 4 个接口：
 * <ul>
 *     <li>GET /api/admin/match-config       - 匹配算法配置查询</li>
 *     <li>PUT /api/admin/match-config       - 匹配算法配置更新</li>
 *     <li>GET /api/admin/recommend-strategy - 推荐策略查询</li>
 *     <li>PUT /api/admin/recommend-strategy - 推荐策略更新</li>
 * </ul>
 */
public interface AdminMatchConfigService {

    /**
     * 查询匹配算法配置。
     *
     * @return 匹配算法配置视图
     */
    MatchConfigView getMatchConfig();

    /**
     * 更新匹配算法配置。
     * 仅更新 values 中包含的 key，未提供的 key 保持不变。
     *
     * @param values     配置项 Map（key 为配置键，value 为新值字符串）
     * @param operatorId 操作者用户ID
     * @return 更新后的匹配算法配置视图
     */
    MatchConfigView updateMatchConfig(Map<String, String> values, Long operatorId);

    /**
     * 查询推荐策略配置。
     *
     * @return 推荐策略配置视图
     */
    RecommendStrategyView getRecommendStrategy();

    /**
     * 更新推荐策略配置。
     * 仅更新 values 中包含的 key，未提供的 key 保持不变。
     *
     * @param values     策略项 Map（key 为策略键，value 为新值字符串）
     * @param operatorId 操作者用户ID
     * @return 更新后的推荐策略配置视图
     */
    RecommendStrategyView updateRecommendStrategy(Map<String, String> values, Long operatorId);
}
