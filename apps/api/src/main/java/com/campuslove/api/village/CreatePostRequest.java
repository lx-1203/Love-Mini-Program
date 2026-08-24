package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 发布帖子请求体。
 *
 * <p>支持统一发布：{@code targetType} 取值 {@code general|circle|campus}，
 * 当为 {@code circle} 时需携带 {@code targetId}（圈子 ID），由后端分发到圈子话题创建；
 * 缺省 {@code general} 走通用帖子创建。</p>
 */
public record CreatePostRequest(
    // 2026-08-08 走查 P1：发帖标题 5-30 字必填，落库（posts.title 列）。
    // 前端已保证必填，后端仅约束长度（null 由服务层校验转为 400）
    @Size(min = 5, max = 30) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotBlank String category,
    @Size(max = 20) List<@Size(max = 20) String> tags,
    @Size(max = 9) List<String> images,
    // 2026-08-09 帖子关联活动：可选的活动 ID（无效值由服务层宽松置 null）
    Long activityId,
    // 统一发布目标类型：general | circle | campus（默认 general）
    @Size(max = 20) String targetType,
    // 统一发布目标 ID：circle/campus 时必填
    Long targetId
) {
}
