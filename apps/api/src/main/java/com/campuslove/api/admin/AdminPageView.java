package com.campuslove.api.admin;

import java.util.List;

/**
 * 管理后台通用分页响应视图。
 * <p>用于返回分页查询结果，包含数据列表与分页元信息。</p>
 *
 * @param items      当前页数据列表
 * @param total      总记录数
 * @param page       当前页码（1-based）
 * @param pageSize   每页大小
 * @param totalPages 总页数
 * @param <T>        列表元素类型
 */
public record AdminPageView<T>(
        List<T> items,
        long total,
        int page,
        int pageSize,
        int totalPages
) {
    /**
     * 根据总记录数与分页参数计算总页数。
     *
     * @param total    总记录数
     * @param pageSize 每页大小
     * @return 总页数（至少为 1，避免空列表时返回 0 页）
     */
    public static int calculateTotalPages(long total, int pageSize) {
        if (pageSize <= 0) {
            return 1;
        }
        return (int) Math.max(1, (total + pageSize - 1) / pageSize);
    }
}
