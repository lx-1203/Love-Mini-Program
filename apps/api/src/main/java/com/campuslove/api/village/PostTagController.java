package com.campuslove.api.village;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 帖子话题标签控制器。
 * 提供预置标签获取、按标签查询帖子等接口。
 */
@RestController
@RequestMapping("/api/post-tags")
public class PostTagController {

    private final PostTagService postTagService;

    public PostTagController(PostTagService postTagService) {
        this.postTagService = postTagService;
    }

    /**
     * 获取全部预置话题标签列表。
     * GET /api/post-tags
     *
     * @return 标签名称列表
     */
    @GetMapping
    public ResponseEntity<List<String>> getTags() {
        List<String> tags = postTagService.getTags();
        return ResponseEntity.ok(tags);
    }

    /**
     * 根据标签名称查询帖子列表。
     * GET /api/post-tags/posts?tagName=校园日常&page=0&size=20
     *
     * @param tagName 标签名称（必填）
     * @param page    页码（从 0 开始，默认 0）
     * @param size    每页大小（默认 20）
     * @return 帖子摘要视图列表
     */
    @GetMapping("/posts")
    public ResponseEntity<List<PostSummaryView>> getPostsByTag(
            @RequestParam(name = "tagName") String tagName,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        List<PostSummaryView> posts = postTagService.getPostsByTag(tagName, page, size);
        return ResponseEntity.ok(posts);
    }
}