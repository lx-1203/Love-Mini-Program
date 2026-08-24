package com.campuslove.api.draft;

import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 保存发布草稿请求体。
 */
public record SaveDraftRequest(
    @Size(max = 20) String targetType,
    Long targetId,
    @Size(max = 30) String title,
    @Size(max = 5000) String content,
    @Size(max = 9) List<String> images,
    @Size(max = 20) List<String> tags,
    @Size(max = 10) List<String> topics,
    @Size(max = 120) String location,
    @Size(max = 20) String visibility
) {
}
