package com.campuslove.api.village;

import java.util.List;

/**
 * 帖子列表响应。
 */
public record PostListResponse(List<PostSummaryView> items, int total, int page, int pageSize) {
}
