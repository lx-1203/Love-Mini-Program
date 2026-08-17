package com.campuslove.api.admin;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理后台 - 用户详情视图。
 * <p>用于 GET /api/admin/users/{id} 接口返回，相比列表项扩展了个人简介、年级、代词、
 * 校园资料、兴趣标签、照片墙与主页媒体字段。</p>
 */
public record AdminUserDetailView(
        Long id,
        String nickname,
        String avatarUrl,
        String bio,
        String gradeLabel,
        String pronouns,
        String phone,
        String role,
        String status,
        Integer profileCompletion,
        Integer followingCount,
        Integer followersCount,
        String campusName,
        String verificationStatus,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<String> interestTags,
        List<String> photoGallery,
        String profileBackgroundUrl,
        String halfBodyPhotoUrl,
        Integer height,
        String educationLevel,
        String relationshipStatus,
        Integer birthYear,
        String expectedPartner
) {
}
