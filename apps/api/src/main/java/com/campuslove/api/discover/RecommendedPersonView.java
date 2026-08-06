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
 *
 * <p>Phase Feedback1（寻觅页卡片重设计）扩展字段：
 * <ul>
 *   <li>{@code displayId} —— 展示用个人 ID（用户编号，如 CL-1024）</li>
 *   <li>{@code distanceText} —— 距离文案（如 1.2km / 同校）</li>
 *   <li>{@code activeStatusText} —— 活跃状态文案（just_now/today/hours_{n}/days_{n}/offline）</li>
 *   <li>{@code machineVerified} / {@code humanVerified} —— 机器 + 人工双重认证</li>
 *   <li>{@code personality} —— 性格标签</li>
 *   <li>{@code mbti} —— MBTI 人格类型</li>
 *   <li>{@code whisper} / {@code whisperSent} —— 悄悄话内容与发送状态</li>
 *   <li>{@code recentPosts} —— 动态预览（详情页动态 Tab）</li>
 *   <li>{@code expectedPartner} —— 期待的人物画像</li>
 *   <li>{@code allowMessage} —— 是否允许私信（未解锁时前端走交友币/会员扣费）</li>
 *   <li>{@code ipLocation} —— IP 属地（如 江苏 · 南京）</li>
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
    String verificationBadgeLevel,
    // ---- Phase Feedback1：寻觅页卡片重设计新增字段 ----
    /** 展示用个人 ID（用户编号，如 CL-1024），可空 */
    String displayId,
    /** 距离文案（如 1.2km / 同校），可空 */
    String distanceText,
    /** 活跃状态文案（just_now/today/hours_{n}/days_{n}/offline），可空 */
    String activeStatusText,
    /** 机器认证（头像/照片真实性机审） */
    Boolean machineVerified,
    /** 人工认证（人工审核通过） */
    Boolean humanVerified,
    /** 性格标签 */
    List<String> personality,
    /** MBTI 人格类型 */
    String mbti,
    /** 悄悄话内容（付费可见/发送） */
    String whisper,
    /** 是否已发送悄悄话 */
    Boolean whisperSent,
    /** 动态预览（详情页动态 Tab） */
    List<RecentPostView> recentPosts,
    /** 期待的人物画像描述 */
    String expectedPartner,
    /** 是否允许私信（未解锁时需付费；未提供时默认 false） */
    Boolean allowMessage,
    /** IP 属地（如 江苏 · 南京） */
    String ipLocation
) {
    /**
     * 紧凑构造器：确保 List 字段非 null，避免下游 NPE。
     */
    public RecommendedPersonView {
        tags = tags == null ? List.of() : List.copyOf(tags);
        images = images == null ? List.of() : List.copyOf(images);
        photoGallery = photoGallery == null ? List.of() : List.copyOf(photoGallery);
        personality = personality == null ? List.of() : List.copyOf(personality);
        recentPosts = recentPosts == null ? List.of() : List.copyOf(recentPosts);
    }

    /**
     * 动态预览视图（详情页动态 Tab 消费）。
     */
    public record RecentPostView(
        String id,
        String content,
        List<String> images,
        long likes,
        long comments,
        boolean liked,
        String createdAt
    ) {
        public RecentPostView {
            images = images == null ? List.of() : List.copyOf(images);
        }
    }
}
