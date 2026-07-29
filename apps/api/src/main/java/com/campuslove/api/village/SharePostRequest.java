package com.campuslove.api.village;

import jakarta.validation.constraints.Size;

/**
 * 转发帖子请求体。
 */
public record SharePostRequest(
    @Size(max = 500) String comment
) {
}
