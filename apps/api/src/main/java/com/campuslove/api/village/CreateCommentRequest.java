package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 发表评论请求体。
 *
 * <p>2026-09-06 评论图片上传：{@code images} 为已上传图片 URL 列表（可选，
 * 经 /media/upload 换取；服务端限最多 3 张，超限截断）。</p>
 */
public record CreateCommentRequest(
    @NotBlank @Size(max = 1000) String content,
    @Positive Long parentId,
    @Size(max = 3, message = "评论图片最多 3 张") List<@Size(max = 512) String> images
) {
    /**
     * 兼容旧调用（两参构造：content + parentId，无图片）。
     */
    public CreateCommentRequest(String content, Long parentId) {
        this(content, parentId, List.of());
    }

    /**
     * 紧凑构造器：images 缺省时归一化为空列表。
     */
    public CreateCommentRequest {
        if (images == null) {
            images = List.of();
        }
        images = List.copyOf(images);
    }
}
