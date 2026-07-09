package com.campuslove.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 管理后台 - 帖子审核请求体。
 * <p>用于 POST /api/admin/posts/{id}/audit 接口。</p>
 *
 * @param decision 审核决定：approved（通过）/ rejected（拒绝），不可为空
 * @param remark   审核备注（拒绝原因等），可为空，长度 ≤ 500
 */
public record AdminPostAuditRequest(
        @NotBlank
        @Pattern(regexp = "approved|rejected", message = "decision 必须为 approved 或 rejected")
        String decision,
        @Size(max = 500) String remark
) {
}
