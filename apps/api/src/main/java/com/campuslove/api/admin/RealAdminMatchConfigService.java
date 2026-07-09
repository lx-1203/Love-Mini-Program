package com.campuslove.api.admin;

import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.config.RecommendationConfig;
import com.campuslove.api.entity.MatchConfigEntity;
import com.campuslove.api.entity.RecommendStrategyEntity;
import com.campuslove.api.repository.MatchConfigEntityRepository;
import com.campuslove.api.repository.RecommendStrategyRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 管理后台 - 匹配算法与推荐策略配置服务真实实现。
 * 在 real profile 下激活，从数据库 match_config / recommend_strategy 表读写配置。
 *
 * <p>实现要点：
 * <ul>
 *     <li>持久化：所有更新写入数据库表，保证重启后仍生效</li>
 *     <li>内存同步：更新数据库后同步刷新 {@link MatchConfig} / {@link RecommendationConfig} 内存 bean，
 *         使 RealMatchService / RealRecommendationService 立即生效（无需重启）</li>
 *     <li>仅更新 values 中包含的 key，未提供的 key 保持不变</li>
 *     <li>查询时如数据库无对应行，回退到内存 bean 的默认值</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealAdminMatchConfigService implements AdminMatchConfigService {

    private static final Logger log = LoggerFactory.getLogger(RealAdminMatchConfigService.class);

    private final MatchConfigEntityRepository matchConfigRepository;
    private final RecommendStrategyRepository recommendStrategyRepository;
    private final MatchConfig matchConfig;
    private final RecommendationConfig recommendationConfig;

    public RealAdminMatchConfigService(
            MatchConfigEntityRepository matchConfigRepository,
            RecommendStrategyRepository recommendStrategyRepository,
            MatchConfig matchConfig,
            RecommendationConfig recommendationConfig) {
        this.matchConfigRepository = matchConfigRepository;
        this.recommendStrategyRepository = recommendStrategyRepository;
        this.matchConfig = matchConfig;
        this.recommendationConfig = recommendationConfig;
    }

    @Override
    public MatchConfigView getMatchConfig() {
        Map<String, String> values = new LinkedHashMap<>();
        // 始终先放入内存默认值，再用数据库值覆盖（保证未持久化的字段也有返回）
        putMatchConfigDefaults(values);
        try {
            for (MatchConfigEntity entity : matchConfigRepository.findAll()) {
                if (entity.getConfigKey() != null) {
                    values.put(entity.getConfigKey(), entity.getConfigValue());
                }
            }
        } catch (Exception e) {
            log.warn("查询 match_config 表失败，仅返回内存默认值", e);
        }
        return new MatchConfigView(values);
    }

    @Override
    @Transactional
    public MatchConfigView updateMatchConfig(Map<String, String> values, Long operatorId) {
        if (values == null || values.isEmpty()) {
            return getMatchConfig();
        }

        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<String, String> entry : values.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key == null || value == null) {
                continue;
            }

            try {
                MatchConfigEntity entity = matchConfigRepository.findByConfigKey(key)
                        .orElseGet(() -> {
                            MatchConfigEntity e = new MatchConfigEntity();
                            e.setConfigKey(key);
                            e.setDescription("");
                            return e;
                        });
                entity.setConfigValue(value);
                entity.setUpdatedBy(operatorId);
                entity.setUpdatedAt(now);
                matchConfigRepository.save(entity);

                // 同步刷新内存 bean，使 RealMatchService 立即生效
                applyToMatchConfigBean(key, value);
            } catch (Exception e) {
                log.warn("更新 match_config[{}={}] 失败: {}", key, value, e.getMessage());
            }
        }

        return getMatchConfig();
    }

    @Override
    public RecommendStrategyView getRecommendStrategy() {
        Map<String, String> values = new LinkedHashMap<>();
        putRecommendStrategyDefaults(values);
        try {
            for (RecommendStrategyEntity entity : recommendStrategyRepository.findAll()) {
                if (entity.getStrategyKey() != null) {
                    values.put(entity.getStrategyKey(), entity.getStrategyValue());
                }
            }
        } catch (Exception e) {
            log.warn("查询 recommend_strategy 表失败，仅返回内存默认值", e);
        }
        return new RecommendStrategyView(values);
    }

    @Override
    @Transactional
    public RecommendStrategyView updateRecommendStrategy(Map<String, String> values, Long operatorId) {
        if (values == null || values.isEmpty()) {
            return getRecommendStrategy();
        }

        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<String, String> entry : values.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key == null || value == null) {
                continue;
            }

            try {
                RecommendStrategyEntity entity = recommendStrategyRepository.findByStrategyKey(key)
                        .orElseGet(() -> {
                            RecommendStrategyEntity e = new RecommendStrategyEntity();
                            e.setStrategyKey(key);
                            e.setDescription("");
                            return e;
                        });
                entity.setStrategyValue(value);
                entity.setUpdatedBy(operatorId);
                entity.setUpdatedAt(now);
                recommendStrategyRepository.save(entity);

                // 同步刷新内存 bean
                applyToRecommendationConfigBean(key, value);
            } catch (Exception e) {
                log.warn("更新 recommend_strategy[{}={}] 失败: {}", key, value, e.getMessage());
            }
        }

        return getRecommendStrategy();
    }

    // ==================== 内存 bean 同步 ====================

    /**
     * 将内存 MatchConfig bean 的当前值放入 Map（作为默认值兜底）。
     */
    private void putMatchConfigDefaults(Map<String, String> values) {
        values.put("heartSignalExpireHours", String.valueOf(matchConfig.getHeartSignalExpireHours()));
        values.put("candidatePageSize", String.valueOf(matchConfig.getCandidatePageSize()));
        values.put("defaultChatDuration", String.valueOf(matchConfig.getDefaultChatDuration()));
        values.put("campusWeight", String.valueOf(matchConfig.getCampusWeight()));
        values.put("cityWeight", String.valueOf(matchConfig.getCityWeight()));
        values.put("interestWeight", String.valueOf(matchConfig.getInterestWeight()));
        values.put("scheduleWeight", String.valueOf(matchConfig.getScheduleWeight()));
    }

    /**
     * 将给定 key/value 应用到内存 MatchConfig bean。
     * 仅支持已知字段，未知字段忽略（仍会持久化到数据库）。
     */
    private void applyToMatchConfigBean(String key, String value) {
        try {
            switch (key) {
                case "heartSignalExpireHours" -> matchConfig.setHeartSignalExpireHours(Integer.parseInt(value));
                case "candidatePageSize" -> matchConfig.setCandidatePageSize(Integer.parseInt(value));
                case "defaultChatDuration" -> matchConfig.setDefaultChatDuration(Integer.parseInt(value));
                case "campusWeight" -> matchConfig.setCampusWeight(Integer.parseInt(value));
                case "cityWeight" -> matchConfig.setCityWeight(Integer.parseInt(value));
                case "interestWeight" -> matchConfig.setInterestWeight(Integer.parseInt(value));
                case "scheduleWeight" -> matchConfig.setScheduleWeight(Integer.parseInt(value));
                default -> log.debug("match_config 字段 {} 未同步到内存 bean（未知字段）", key);
            }
        } catch (NumberFormatException e) {
            log.warn("match_config[{}={}] 数值格式非法，跳过内存同步", key, value);
        }
    }

    /**
     * 将内存 RecommendationConfig bean 的当前值放入 Map（作为默认值兜底）。
     */
    private void putRecommendStrategyDefaults(Map<String, String> values) {
        values.put("dailyLimit", String.valueOf(recommendationConfig.getDailyLimit()));
        values.put("discussionLimit", String.valueOf(recommendationConfig.getDiscussionLimit()));
        values.put("candidatePageSize", String.valueOf(recommendationConfig.getCandidatePageSize()));
        values.put("campusWeight", String.valueOf(recommendationConfig.getCampusWeight()));
        values.put("cityWeight", String.valueOf(recommendationConfig.getCityWeight()));
        values.put("interestWeight", String.valueOf(recommendationConfig.getInterestWeight()));
        values.put("scheduleWeight", String.valueOf(recommendationConfig.getScheduleWeight()));
        values.put("sameSchoolBoostPercent", String.valueOf(recommendationConfig.getSameSchoolBoostPercent()));
        values.put("sameMajorWeight", String.valueOf(recommendationConfig.getSameMajorWeight()));
        values.put("commonCircleWeight", String.valueOf(recommendationConfig.getCommonCircleWeight()));
        values.put("commonDailyAnswerWeight", String.valueOf(recommendationConfig.getCommonDailyAnswerWeight()));
        values.put("circleWeight", String.valueOf(recommendationConfig.getCircleWeight()));
        values.put("sameSchoolBoostEnabled", String.valueOf(recommendationConfig.isSameSchoolBoostEnabled()));
    }

    /**
     * 将给定 key/value 应用到内存 RecommendationConfig bean。
     */
    private void applyToRecommendationConfigBean(String key, String value) {
        try {
            switch (key) {
                case "dailyLimit" -> recommendationConfig.setDailyLimit(Integer.parseInt(value));
                case "discussionLimit" -> recommendationConfig.setDiscussionLimit(Integer.parseInt(value));
                case "candidatePageSize" -> recommendationConfig.setCandidatePageSize(Integer.parseInt(value));
                case "campusWeight" -> recommendationConfig.setCampusWeight(Integer.parseInt(value));
                case "cityWeight" -> recommendationConfig.setCityWeight(Integer.parseInt(value));
                case "interestWeight" -> recommendationConfig.setInterestWeight(Integer.parseInt(value));
                case "scheduleWeight" -> recommendationConfig.setScheduleWeight(Integer.parseInt(value));
                case "sameSchoolBoostPercent" -> recommendationConfig.setSameSchoolBoostPercent(Double.parseDouble(value));
                case "sameMajorWeight" -> recommendationConfig.setSameMajorWeight(Integer.parseInt(value));
                case "commonCircleWeight" -> recommendationConfig.setCommonCircleWeight(Integer.parseInt(value));
                case "commonDailyAnswerWeight" -> recommendationConfig.setCommonDailyAnswerWeight(Integer.parseInt(value));
                case "circleWeight" -> recommendationConfig.setCircleWeight(Integer.parseInt(value));
                case "sameSchoolBoostEnabled" -> recommendationConfig.setSameSchoolBoostEnabled(Boolean.parseBoolean(value));
                default -> log.debug("recommend_strategy 字段 {} 未同步到内存 bean（未知字段）", key);
            }
        } catch (NumberFormatException e) {
            log.warn("recommend_strategy[{}={}] 数值格式非法，跳过内存同步", key, value);
        }
    }
}
