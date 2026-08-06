package com.campuslove.api.village;

/**
 * 同校动态流中的话题简要视图。
 * FIN-00056 修复：从 VillageController 独立出来作为 public 顶层类型，
 * 供 mock 包（MockVillageService）跨包构造。
 */
public record CampusTopicView(
    Long id,
    Long circleId,
    String circleName,
    String title,
    String authorName,
    int replyCount,
    String createdAt
) {}
