package com.campuslove.api.campus;

/**
 * 校园活动列表项视图。
 *
 * <p>缺陷修复（走查）：前端 {@code stores/campus.ts} 的
 * {@code fetchCampusActivities()} 调用 {@code GET /api/v1/campus/activities}，
 * 期望直接返回与前端 {@code CampusActivity} 接口对齐的数组
 * （id / title / description / coverUrl / startTime / endTime / location /
 * organizer / participantCount / maxParticipants）。本视图将
 * {@link com.campuslove.api.entity.Activity} 实体映射为前端期望的结构：
 * 缺失字段（coverUrl / endTime / maxParticipants）返回安全默认值，
 * 避免前端渲染 undefined。</p>
 *
 * @param id              活动 ID
 * @param title           活动标题
 * @param description     活动描述
 * @param coverUrl        封面 URL（实体暂无封面字段，默认空串由前端兜底）
 * @param startTime       开始时间（ISO 字符串，取自 activityDate）
 * @param endTime         结束时间（实体暂无该字段，默认空串）
 * @param location        活动地点
 * @param organizer       组织方（复用校区名作为主办方信息，可空）
 * @param participantCount 报名人数
 * @param maxParticipants 人数上限（实体暂无该字段，可空）
 */
public record CampusActivityListItemView(
        Long id,
        String title,
        String description,
        String coverUrl,
        String startTime,
        String endTime,
        String location,
        String organizer,
        int participantCount,
        Integer maxParticipants
) {}
