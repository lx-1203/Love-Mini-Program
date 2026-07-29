package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 发布帖子请求体。
 */
public record CreatePostRequest(
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotBlank String category,
    @Size(max = 20) List<@Size(max = 20) String> tags,
    @Size(max = 9) List<String> images
) {
}
