package com.campuslove.api.admin;

import java.time.LocalDateTime;

/**
 * 管理后台 - 举报列表项视图。
 * <p>用于 GET /api/admin/reports 接口返回。</p>
 * <p>举报记录由 reports 表持久化，本视图呈现给管理后台前端。</p>
 *
 * @param id              举报 ID
 * @param targetType      举报对象类型：POST / COMMENT / USER / TOPIC
 * @param targetId        举报对象 ID
 * @param reporterId      举报人用户 ID
 * @param reporterNickname 举报人昵称
 * @param reason          举报原因分类
 * @param description     举报详细描述
 * @param status          举报处理状态：PENDING / HANDLED / REJECTED
 * @param handlerId       处理人用户 ID（未处理则为 null）
 * @param handleRemark    处理备注
 * @param createdAt       举报时间
 * @param handledAt       处理时间
 */
public record AdminReportView(
        Long id,
        String targetType,
        Long targetId,
        Long reporterId,
        String reporterNickname,
        String reason,
        String description,
        String status,
        Long handlerId,
        String handleRemark,
        LocalDateTime createdAt,
        LocalDateTime handledAt
) {
}
