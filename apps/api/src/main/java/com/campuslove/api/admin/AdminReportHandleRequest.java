package com.campuslove.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 管理后台 - 举报处理请求体。
 * <p>用于 POST /api/admin/reports/{id}/handle 接口。</p>
 * <p>管理员处理举报时，选择 HANDLE（已处理，对应 status=HANDLED）
 * 或 REJECT（驳回，对应 status=REJECTED），并可填写处理备注。</p>
 *
 * @param result 处理结果：HANDLE（已处理）/ REJECT（已驳回），不可为空
 * @param remark 处理备注，可为空，长度 ≤ 500
 */
public record AdminReportHandleRequest(
        @NotBlank
        @Pattern(regexp = "HANDLE|REJECT", message = "result 必须为 HANDLE 或 REJECT")
        String result,
        @Size(max = 500) String remark
) {
}
