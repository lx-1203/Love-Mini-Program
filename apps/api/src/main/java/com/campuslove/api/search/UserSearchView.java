package com.campuslove.api.search;

/**
 * 用户搜索结果视图（B10，2026-08-10）。
 *
 * <p>字段取自 {@link com.campuslove.api.entity.User} 可公开展示的子集——
 * 不含手机号、openid、隐私偏好等敏感字段；前端结果卡可直接渲染。</p>
 *
 * @param id                用户 ID
 * @param nickname          昵称
 * @param avatarUrl         头像 URL
 * @param campusName        校区名称（可空）
 * @param gradeLabel        年级标签（可空）
 * @param bio               个性签名（可空）
 * @param profileCompletion 资料完整度（0-100，排序因子，前端可展示）
 */
public record UserSearchView(
    Long id,
    String nickname,
    String avatarUrl,
    String campusName,
    String gradeLabel,
    String bio,
    Integer profileCompletion
) {}
