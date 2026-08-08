package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 发布帖子请求体。
 */
public record CreatePostRequest(
    // 2026-08-08 走查 P1：发帖标题 5-30 字必填，落库（posts.title 列）。
    // 前端已保证必填，后端仅约束长度（null 由服务层校验转为 400）
    @Size(min = 5, max = 30) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotBlank String category,
    @Size(max = 20) List<@Size(max = 20) String> tags,
    @Size(max = 9) List<String> images
) {
}
