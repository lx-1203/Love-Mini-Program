package com.campuslove.api.discover;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

/**
 * 推荐人物视图，用于推荐列表展示。
 * 包含用户基本信息、共同点、可用时间、校区、个人简介、图片等字段。
 *
 * <p>2026-08-12 Redis 序列化修复：record 为 final 类，Redis 的 Jackson
 * default typing（NON_FINAL）不会为 final 类型写 {@code @class} 类型信息；
 * 而 Spring Cache 反序列化 {@code List<RecommendedPersonView>} 时泛型擦除为
 * {@code Object}，数组元素（尤其 {@link RecentPostView} 嵌套对象）缺 {@code @class}
 * 直接报 {@code Unexpected token (START_OBJECT)} → 缓存命中失败 → 每次全量重算
 * （游客接口 300ms+ 卡顿根因）。加 {@code @JsonTypeInfo} 强制所有实例写类型信息，
 * 与序列化器 default typing 兼容（NON_FINAL 下 @class 由注解补充 final 类）。</p>
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
@JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@class")
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
    String ipLocation,
    // ---- V2026.08.08.0015：寻觅页卡片完整字段 ----
    /**
     * 职业（展示文本，如 产品经理），可空。
     * 注：R4-00337 月收入档位（incomeRange）已从公开推荐视图移除——收入档位属
     * 敏感经济信息，不再随推荐列表对全体用户公开（前端已含 incomeRange 缺省回退）。
     */
    String occupation,
    /** 年龄（由出生年份推导），可空 */
    Integer age,
    /** 注册时间（ISO 字符串，供「最新注册」排序），可空 */
    String registeredAt,
    // ---- V3（2026-08-12）：他人主页背景 ----
    /** 个人主页背景图 URL（他人主页按对方显示；可空，前端纯色兜底） */
    String profileBackgroundUrl
) {
    /**
     * 紧凑构造器：确保 List 字段非 null 且不含 null 元素，避免下游 NPE。
     *
     * <p>2026-08-08 修复：存量 JSON 数组可能含 null 元素（如 photo_gallery 出现
     * [null]），List.copyOf 会抛 NPE 导致整个推荐列表 500——统一过滤 null 元素。</p>
     *
     * <p>2026-08-12 修复：过滤结果改返回 {@code ArrayList}（可变）而非
     * {@code List.of()/Stream.toList()}（ImmutableCollections）——Redis 的
     * Jackson default typing 对嵌套不可变集合写出特殊类型名
     * （{"@class":"java.util.ImmutableCollections$ListN"}），反序列化时字段声明
     * 类型（如 {@code List<RecentPostView>}）的元素期望 {@code @class} 对象而
     * 遇到字符串报 {@code Unexpected token (START_OBJECT)} → 缓存命中失败 →
     * 每次全量重算（游客接口 300ms+ 卡顿根因之一）。</p>
     */
    public RecommendedPersonView {
        tags = filterNullElements(tags);
        images = filterNullElements(images);
        photoGallery = filterNullElements(photoGallery);
        personality = filterNullElements(personality);
        recentPosts = filterNullElements(recentPosts);
    }

    /** 过滤列表中的 null 元素（null 列表 → 空 ArrayList；可变，兼容 Redis 序列化）。 */
    private static <T> List<T> filterNullElements(List<T> list) {
        if (list == null) {
            return new java.util.ArrayList<>();
        }
        return new java.util.ArrayList<>(list.stream().filter(java.util.Objects::nonNull).toList());
    }

    /**
     * 动态预览视图（详情页动态 Tab 消费）。
     * 2026-08-12：@JsonTypeInfo 强制写类型信息（final record + 嵌套对象，
     * 否则 Redis 反序列化泛型擦除时缺 @class 报错）。
     */
    @JsonTypeInfo(use = JsonTypeInfo.Id.CLASS, property = "@class")
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
            // 2026-08-12：改返回可变 ArrayList（List.copyOf 为不可变，
            // Redis Jackson default typing 对嵌套不可变集合反序列化失败）
            images = images == null ? new java.util.ArrayList<>()
                    : new java.util.ArrayList<>(List.copyOf(images));
        }
    }
}
