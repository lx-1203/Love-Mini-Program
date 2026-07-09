package com.campuslove.api.discover;

import java.util.Set;

/**
 * 推荐人物筛选参数（Phase B - Task B2）。
 *
 * <p>所有字段均可空，null/空集合表示该维度不参与筛选，向后兼容无参数调用。
 * 由 {@link RecommendationController} 从 query string 解析后传入
 * {@link RecommendationService#getRecommendations(Long, RecommendationFilter)}。</p>
 *
 * <ul>
 *   <li>{@code heightMin} / {@code heightMax} —— 身高范围（闭区间）</li>
 *   <li>{@code educationLevels} —— 学历多选（high_school/bachelor/master/phd）</li>
 *   <li>{@code relationshipStatuses} —— 感情状态多选（never/married_before/divorced/widowed）</li>
 *   <li>{@code hometownProvince} / {@code hometownCity} —— 籍贯省/市</li>
 *   <li>{@code futureCity} —— 未来定居城市</li>
 *   <li>{@code keyword} —— 模糊匹配 nickname/bio/interestTags</li>
 * </ul>
 */
public record RecommendationFilter(
        Integer heightMin,
        Integer heightMax,
        Set<String> educationLevels,
        Set<String> relationshipStatuses,
        String hometownProvince,
        String hometownCity,
        String futureCity,
        String keyword
) {
    /**
     * 紧凑构造器：将 null 与空字符串规整为 null，将 List 规整为不可变 Set。
     */
    public RecommendationFilter {
        educationLevels = educationLevels == null ? Set.of() : Set.copyOf(educationLevels);
        relationshipStatuses = relationshipStatuses == null ? Set.of() : Set.copyOf(relationshipStatuses);
        hometownProvince = (hometownProvince == null || hometownProvince.isBlank()) ? null : hometownProvince;
        hometownCity = (hometownCity == null || hometownCity.isBlank()) ? null : hometownCity;
        futureCity = (futureCity == null || futureCity.isBlank()) ? null : futureCity;
        keyword = (keyword == null || keyword.isBlank()) ? null : keyword;
    }

    /**
     * 判断当前筛选条件是否为空（所有维度都未设置）。
     * 空筛选条件下，service 应返回完整推荐列表以保证向后兼容。
     *
     * @return true 表示无任何筛选维度被激活
     */
    public boolean isEmpty() {
        return heightMin == null
                && heightMax == null
                && educationLevels.isEmpty()
                && relationshipStatuses.isEmpty()
                && hometownProvince == null
                && hometownCity == null
                && futureCity == null
                && keyword == null;
    }
}
