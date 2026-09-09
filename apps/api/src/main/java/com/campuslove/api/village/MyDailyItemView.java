package com.campuslove.api.village;

import java.util.List;

/**
 * 我的「日常」列表项视图（R16 2026-09-07）。
 *
 * <p>日常 = visibility=friends 的帖子（仅互相喜欢/关注作者的人及作者本人可见），
 * 承载「我的故事」区块的朋友圈式内容，与普通帖子/浏览记录区分。</p>
 */
public record MyDailyItemView(
        Long id,
        String title,
        String summary,
        List<String> images,
        int likeCount,
        int commentCount,
        String createdAt,
        String auditStatus) {
}
