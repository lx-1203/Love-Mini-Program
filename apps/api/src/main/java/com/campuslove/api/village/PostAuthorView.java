package com.campuslove.api.village;

/**
 * 帖子作者视图。
 *
 * <p>P1-16 扩展：增加 {@code age / city / education} 三个可选展示字段
 * （客户端展示作者信息卡片用，缺失时前端按缺省兜底）：</p>
 * <ul>
 *   <li>{@code age} —— 由 user_basic_profile.grade_label 推导（无出生日期字段，
 *       大一 19 ~ 研三 25，见 {@link #deriveAgeFromGradeLabel}）</li>
 *   <li>{@code city} —— 来自 user_campus_profile.city_name（作者所在城市）</li>
 *   <li>{@code education} —— 来自 user_basic_profile.education_level（bachelor/master/phd）</li>
 * </ul>
 */
public record PostAuthorView(
    Long userId,
    String nickname,
    String avatarUrl,
    String campusName,
    Integer age,
    String city,
    String education
) {

    /**
     * 兼容旧调用（mock 服务等无 age/city/education 数据的场景），三个新字段默认 null。
     */
    public PostAuthorView(Long userId, String nickname, String avatarUrl, String campusName) {
        this(userId, nickname, avatarUrl, campusName, null, null, null);
    }

    /**
     * 根据年级标签推导年龄（P1-16）。
     *
     * <p>user_basic_profile 无出生日期字段，按年级估算：
     * 大一 19 / 大二 20 / 大三 21 / 大四 22 / 研一 23 / 研二 24 / 研三 25。
     * 无法识别时返回 null（前端按缺省兜底）。</p>
     *
     * @param gradeLabel 年级标签（如"大三"、"研一"）
     * @return 估算年龄；无法识别返回 null
     */
    public static Integer deriveAgeFromGradeLabel(String gradeLabel) {
        if (gradeLabel == null) {
            return null;
        }
        return switch (gradeLabel.trim()) {
            case "大一" -> 19;
            case "大二" -> 20;
            case "大三" -> 21;
            case "大四" -> 22;
            case "研一" -> 23;
            case "研二" -> 24;
            case "研三" -> 25;
            default -> null;
        };
    }
}
