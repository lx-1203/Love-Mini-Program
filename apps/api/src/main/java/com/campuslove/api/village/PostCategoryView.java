package com.campuslove.api.village;

/**
 * 帖子分类视图。
 */
public record PostCategoryView(
    Long id,
    String name,
    String code,
    String icon,
    int sortOrder
) {}
