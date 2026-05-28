package com.campuslove.api.village;

import java.util.List;

/**
 * 帖子话题标签服务接口。
 * 提供预置标签获取、按标签查询帖子等功能。
 */
public interface PostTagService {

    /**
     * 获取全部预置话题标签列表。
     * 预置标签包括：校园日常、兴趣分享、找搭子、求助、
     * 表白墙、校友动态、生活记录、技术交流。
     *
     * @return 标签名称列表
     */
    List<String> getTags();

    /**
     * 根据话题标签名称查询帖子摘要列表。
     * 返回该标签下所有帖子，按创建时间倒序排列。
     *
     * @param tagName 标签名称
     * @param page    页码（从 0 开始）
     * @param size    每页大小
     * @return 帖子摘要视图列表
     */
    List<PostSummaryView> getPostsByTag(String tagName, int page, int size);
}