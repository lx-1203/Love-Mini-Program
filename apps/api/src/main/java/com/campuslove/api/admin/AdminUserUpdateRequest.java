package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 管理后台 - 编辑用户请求体。
 * <p>用于 PUT /api/admin/users/{id} 接口。</p>
 * <p>仅允许管理员修改用户的非敏感字段（昵称、简介、年级、代词、状态、
 * 兴趣标签与基础资料扩展字段）。角色、密码、openid 等敏感字段不允许修改。</p>
 */
public record AdminUserUpdateRequest(
        @Size(max = 64) String nickname,
        @Size(max = 500) String bio,
        @Size(max = 32) String gradeLabel,
        @Size(max = 32) String pronouns,
        @Pattern(regexp = "active|disabled",
                message = ErrorMessages.USER_STATUS_INVALID) String status,
        List<String> interestTags,
        @Min(120) @Max(250) Integer height,
        @Pattern(regexp = "high_school|bachelor|master|phd",
                message = ErrorMessages.EDUCATION_LEVEL_INVALID) String educationLevel,
        @Pattern(regexp = "never|married_before|divorced|widowed",
                message = ErrorMessages.RELATIONSHIP_STATUS_INVALID) String relationshipStatus,
        @Min(1900) @Max(2026) Integer birthYear,
        @Size(max = 200) String expectedPartner
) {
}
