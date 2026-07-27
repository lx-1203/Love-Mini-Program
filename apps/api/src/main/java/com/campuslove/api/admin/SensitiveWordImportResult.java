package com.campuslove.api.admin;

/**
 * SubTask 5.3.5：敏感词异步批量导入任务受理结果。
 *
 * <p>{@link SensitiveWordImportService#importBatchAsync} 立即返回本记录，
 * 客户端可凭 {@code taskId} 后续轮询任务状态（如有需要可扩展状态查询接口）。</p>
 *
 * @param taskId      任务 ID（用于后续状态查询）
 * @param total       待导入总条数
 * @param imported    已导入条数（异步任务完成前为 0）
 * @param skipped     已跳过条数（异步任务完成前为 0）
 * @param status      任务状态（ACCEPTED / EMPTY_INPUT / RUNNING / DONE / FAILED）
 * @param message     状态描述
 */
public record SensitiveWordImportResult(
        String taskId,
        int total,
        int imported,
        int skipped,
        String status,
        String message
) {}
