package com.campuslove.api.match;

/**
 * 破冰话题视图。
 *
 * @param content  话题内容
 * @param category 话题分类
 * @param source   话题来源（common_interest / daily_question / generic）
 */
public record IcebreakerView(
    String content,
    String category,
    String source
) {}
