package com.campuslove.api.discover;

import java.util.List;

/**
 * 推荐人物视图，用于推荐列表展示。
 * 包含用户基本信息、共同点、可用时间、校区、个人简介、图片等字段。
 */
public record RecommendedPersonView(
    Long id,
    String name,
    String initials,
    String headline,
    String commonGround,
    String availability,
    String campusName,
    String avatarUrl,
    List<String> tags,
    /** 个人简介 */
    String bio,
    /** 用户图片列表 */
    List<String> images
) {}
