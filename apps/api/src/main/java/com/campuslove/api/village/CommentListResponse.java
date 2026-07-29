package com.campuslove.api.village;

import java.util.List;

/**
 * 评论列表响应。
 */
public record CommentListResponse(List<CommentItemView> items, int total, int page, int pageSize) {
}
