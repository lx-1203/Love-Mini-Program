package com.campuslove.api.discover;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户偏好计算与持久化组件。
 *
 * <p>职责：从 {@link RecommendationPreferenceRepository} 加载/保存用户推荐偏好，
 * 并提供 JSON 字段（兴趣标签、字符串列表）的反序列化辅助方法供其他组件复用。</p>
 *
 * <p>从 RealRecommendationService 拆分而来（Task 4.1.2）。
 * 缓存失效操作（@CacheEvict）保持在本组件内，偏好更新时主动失效推荐缓存。</p>
 */
@Profile("real")
@Component
public class UserPreferenceCalculator {

    /** 推荐范围 scope 合法取值 */
    public static final Set<String> VALID_SCOPES = Set.of("campus_first", "city", "unlimited");

    private final RecommendationPreferenceRepository recommendationPreferenceRepository;
    private final ObjectMapper objectMapper;

    public UserPreferenceCalculator(
            RecommendationPreferenceRepository recommendationPreferenceRepository,
            ObjectMapper objectMapper) {
        this.recommendationPreferenceRepository = recommendationPreferenceRepository;
        this.objectMapper = objectMapper;
    }

    // ---- 偏好查询与保存 ----

    /**
     * 获取指定用户的推荐偏好设置。
     * 未持久化时返回默认值（preferredTime=12:00, scope=campus_first, campusPriority=true）。
     *
     * @param userId 用户 ID
     * @return 推荐偏好视图（永不为 null）
     */
    public RecommendationPreferencesView getPreferences(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return recommendationPreferenceRepository.findByUserId(userId)
                .map(pref -> new RecommendationPreferencesView(
                        pref.getPreferredTime(), pref.getScope(), pref.getCampusPriority()))
                .orElse(new RecommendationPreferencesView("12:00", "campus_first", true));
    }

    /**
     * 保存/更新指定用户的推荐偏好设置。
     * 偏好更新后通过 @CacheEvict 失效该用户的推荐缓存（{@link CacheNames#MATCH_RECOMMEND}）。
     *
     * @param userId         用户 ID
     * @param preferredTime  推荐时间偏好（HH:mm 格式）
     * @param scope          推荐范围（campus_first / city / unlimited）
     * @param campusPriority 校园优先开关（可为 null，默认 true）
     * @return 更新后的推荐偏好视图
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.MATCH_RECOMMEND, key = "'v2:' + #userId")
    public RecommendationPreferencesView savePreferences(
            Long userId, String preferredTime, String scope, Boolean campusPriority) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (preferredTime == null || preferredTime.isBlank()) {
            throw new IllegalArgumentException("preferredTime is required");
        }
        if (scope == null || scope.isBlank()) {
            throw new IllegalArgumentException("scope is required");
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        RecommendationPreference pref = recommendationPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    RecommendationPreference newPref = new RecommendationPreference();
                    newPref.setUserId(userId);
                    newPref.setCreatedAt(now);
                    return newPref;
                });

        pref.setPreferredTime(preferredTime);
        pref.setScope(scope);
        pref.setCampusPriority(campusPriority != null ? campusPriority : true);
        pref.setUpdatedAt(now);

        recommendationPreferenceRepository.save(pref);
        return new RecommendationPreferencesView(preferredTime, scope, pref.getCampusPriority());
    }

    /**
     * 更新指定用户的推荐偏好设置（实体形式）。
     * 偏好更新后通过 @CacheEvict 失效该用户的推荐缓存。
     *
     * @param userId 用户 ID
     * @param data   推荐偏好实体数据
     * @return 更新后的推荐偏好视图
     */
    @Transactional
    @CacheEvict(cacheNames = CacheNames.MATCH_RECOMMEND, key = "'v2:' + #userId")
    public RecommendationPreferencesView updatePreferences(Long userId, RecommendationPreference data) {
        if (userId == null) {
            throw new IllegalArgumentException(ErrorMessages.USER_ID_REQUIRED);
        }
        if (data == null) {
            throw new IllegalArgumentException(ErrorMessages.PREFERENCE_DATA_REQUIRED);
        }
        if (data.getPreferredTime() == null || data.getPreferredTime().isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PREFERRED_TIME_REQUIRED);
        }
        if (data.getScope() == null || data.getScope().isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.PREFERENCE_SCOPE_REQUIRED);
        }
        if (!VALID_SCOPES.contains(data.getScope())) {
            throw new IllegalArgumentException(
                    "推荐范围(scope)无效，有效值: campus_first, city, unlimited，当前值: " + data.getScope());
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        try {
            RecommendationPreference pref = recommendationPreferenceRepository.findByUserId(userId)
                    .orElseGet(() -> {
                        RecommendationPreference newPref = new RecommendationPreference();
                        newPref.setUserId(userId);
                        newPref.setCreatedAt(now);
                        return newPref;
                    });

            pref.setPreferredTime(data.getPreferredTime());
            pref.setScope(data.getScope());
            if (data.getCampusPriority() != null) {
                pref.setCampusPriority(data.getCampusPriority());
            }
            pref.setUpdatedAt(now);

            recommendationPreferenceRepository.save(pref);
            return new RecommendationPreferencesView(
                    pref.getPreferredTime(), pref.getScope(), pref.getCampusPriority());
        } catch (DataAccessException e) {
            throw new RuntimeException(ErrorMessages.SAVE_PREFERENCE_FAILED_PREFIX + userId, e);
        }
    }

    // ---- JSON 解析辅助 ----

    /**
     * 解析兴趣标签 JSON 字符串为 Set 集合。
     * JSON 格式示例: ["摄影", "篮球", "阅读", "编程"]
     * 解析失败时返回空集合，不影响推荐算法正常运行。
     *
     * @param interestTagsJson 兴趣标签 JSON 字符串
     * @return 兴趣标签集合
     */
    public Set<String> parseInterestTags(String interestTagsJson) {
        if (interestTagsJson == null || interestTagsJson.isBlank()) {
            return Collections.emptySet();
        }
        try {
            List<String> tags = objectMapper.readValue(interestTagsJson, new TypeReference<List<String>>() {});
            return new HashSet<>(tags);
        } catch (JsonProcessingException e) {
            return Collections.emptySet();
        }
    }

    /**
     * 解析 JSON 字符串数组为 List<String>。
     * 用于 photoGallery / futurePlanTags 等字段的解析。
     * 解析失败或 null 时返回空列表，不影响主流程。
     *
     * @param json JSON 字符串，例如 ["url1","url2"]
     * @return 字符串列表，永不为 null
     */
    public List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<String> result = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return result != null ? result : Collections.emptyList();
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
