package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 发布帖子请求体。
 */
public record CreatePostRequest(
    // infra R2-00217: 实体 Post 无 title 字段，原 @NotBlank 强制必填与 API 契约矛盾（必填但丢失），
    // 移除必填校验，保留字段以兼容旧客户端；后续如需要标题功能应扩展实体
    @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotBlank String category,
    @Size(max = 20) List<@Size(max = 20) String> tags,
    @Size(max = 9) List<String> images
) {
}
