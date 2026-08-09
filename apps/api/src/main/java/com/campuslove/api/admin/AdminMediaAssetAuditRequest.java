package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 管理后台 - 媒体图片审核请求体（2026-08-09）。
 * <p>用于 POST /api/v1/admin/media-assets/{id}/audit 接口。</p>
 *
 * @param decision 审核决定：approved（通过）/ rejected（拒绝），不可为空
 * @param remark   审核备注（拒绝原因等），可为空，长度 ≤ 500
 */
public record AdminMediaAssetAuditRequest(
        @NotBlank
        @Pattern(regexp = "approved|rejected", message = ErrorMessages.POST_AUDIT_DECISION_INVALID)
        String decision,
        @Size(max = 500) String remark
) {
}
