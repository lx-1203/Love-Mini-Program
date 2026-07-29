package com.campuslove.api.village;

import java.util.List;

/**
 * 相似作者视图。
 * 包含作者基础信息、同校关系、共同兴趣及是否已关注等字段。
 */
public record SimilarAuthorView(
    /** 用户 ID */
    Long userId,
    /** 昵称 */
    String nickname,
    /** 头像 URL */
    String avatarUrl,
    /** 校区名称 */
    String campusName,
    /** 个性签名/一句话介绍 */
    String headline,
    /** 是否同校 */
    boolean isAlumni,
    /** 共同的兴趣标签 */
    List<String> commonInterests,
    /** 当前用户是否已关注该推荐作者 */
    boolean isFollowed
) {}
