package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * 发表评论请求体。
 */
public record CreateCommentRequest(
    @NotBlank @Size(max = 1000) String content,
    @Positive Long parentId
) {
}
