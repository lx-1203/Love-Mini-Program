/**
 * 管理后台 - 匹配算法与推荐策略配置 API（任务 10）。
 * 对应后端 AdminMatchConfigController（/api/v1/admin/match-config、/recommend-strategy）。
 */
import { get, put } from "./http";

/** 匹配算法配置视图 */
export interface MatchConfigView {
  /** 配置项 Map，key 为配置键（如 heartSignalExpireHours），value 为字符串值 */
  values: Record<string, string>;
}

/** 推荐策略配置视图 */
export interface RecommendStrategyView {
  /** 策略项 Map，key 为策略键（如 dailyLimit），value 为字符串值 */
  values: Record<string, string>;
}

/** 更新请求体（通用 key/value） */
export interface UpdateKeyValueRequest {
  values: Record<string, string>;
}

/**
 * 查询匹配算法配置。
 * GET /api/v1/admin/match-config
 */
export function getMatchConfig(): Promise<MatchConfigView> {
  return get<MatchConfigView>("/v1/admin/match-config");
}

/**
 * 更新匹配算法配置（仅更新 values 中包含的 key）。
 * PUT /api/v1/admin/match-config
 */
export function updateMatchConfig(
  values: Record<string, string>
): Promise<MatchConfigView> {
  return put<MatchConfigView>("/v1/admin/match-config", { values });
}

/**
 * 查询推荐策略配置。
 * GET /api/v1/admin/recommend-strategy
 */
export function getRecommendStrategy(): Promise<RecommendStrategyView> {
  return get<RecommendStrategyView>("/v1/admin/recommend-strategy");
}

/**
 * 更新推荐策略配置。
 * PUT /api/v1/admin/recommend-strategy
 */
export function updateRecommendStrategy(
  values: Record<string, string>
): Promise<RecommendStrategyView> {
  return put<RecommendStrategyView>("/v1/admin/recommend-strategy", { values });
}
