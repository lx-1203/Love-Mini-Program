package com.campuslove.api.discover;

import java.util.List;

/**
 * 推荐人物视图，用于推荐列表展示。
 * 包含用户基本信息、共同点、可用时间、校区、个人简介、图片等字段。
 *
 * <p>Phase B - Task B2 扩展字段：
 * <ul>
 *   <li>{@code height} —— 身高（cm，可空）</li>
 *   <li>{@code educationLevel} —— 学历层级（high_school/bachelor/master/phd，可空）</li>
 *   <li>{@code photoGallery} —— 照片墙 URL 列表（最多 6 张）</li>
 *   <li>{@code halfBodyPhotoUrl} —— 半身照 URL（用于推荐卡片大图）</li>
 *   <li>{@code personalVideoUrl} —— 个人视频 URL</li>
 *   <li>{@code verificationBadgeLevel} —— 认证徽章级别（school/email/idcard/none）</li>
 * </ul>
 * </p>
 */
public record RecommendedPersonView(
    Long id,
    String name,
    String initials,
    String headline,
    String commonGround,
    String availability,
    String campusName,
    String avatarUrl,
    List<String> tags,
    /** 个人简介 */
    String bio,
    /** 用户图片列表（兼容旧字段，保持空列表，前端可改用 photoGallery） */
    List<String> images,
    /** 是否同校 */
    boolean isSameSchool,
    /** 是否同专业 */
    boolean isSameMajor,
    /** 共同兴趣圈数量 */
    int commonCircleCount,
    // ---- Phase B - Task B2 新增字段 ----
    /** 身高（cm），可空 */
    Integer height,
    /** 学历层级：high_school/bachelor/master/phd，可空 */
    String educationLevel,
    /** 照片墙 URL 列表（最多 6 张） */
    List<String> photoGallery,
    /** 半身照 URL（推荐卡片大图） */
    String halfBodyPhotoUrl,
    /** 个人视频 URL */
    String personalVideoUrl,
    /** 认证徽章级别：school/email/idcard/none */
    String verificationBadgeLevel
) {
    /**
     * 紧凑构造器：确保 List 字段非 null，避免下游 NPE。
     */
    public RecommendedPersonView {
        tags = tags == null ? List.of() : List.copyOf(tags);
        images = images == null ? List.of() : List.copyOf(images);
        photoGallery = photoGallery == null ? List.of() : List.copyOf(photoGallery);
    }
}
