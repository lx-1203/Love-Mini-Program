package com.campuslove.api.village;

import java.util.List;

/**
 * 帖子浏览历史分页响应（2026-08-08 论坛互动真实化）。
 *
 * @param items     浏览记录列表（按 viewed_at 倒序）
 * @param total     总记录数（已过滤删除/下架帖）
 * @param page      当前页码（从 1 开始）
 * @param pageSize  每页条数
 */
public record PostHistoryResponse(
    List<PostHistoryItemView> items,
    int total,
    int page,
    int pageSize
) {
}
