package com.campuslove.api.dto;

import java.util.List;

/**
 * 帖子 DTO。
 *
 * <p>对应 {@link com.campuslove.api.entity.Post} 实体，附带作者简要信息
 * （{@link UserBriefDto}）和聚合计数（点赞数、评论数），
 * 用于帖子列表与详情接口的对外响应。</p>
 *
 * <p><strong>circleName 字段说明：</strong>
 * 帖子可归属于某个兴趣圈，circleName 为该圈子的名称。
 * 当帖子为非圈子帖子（公开帖）时，该字段为 {@code null}。</p>
 *
 * <p><strong>images / tags 字段说明：</strong>
 * Entity 层以 JSON 字符串存储（{@code Post.images}、{@code Post.tags}），
 * DTO 层转换为 {@code List<String>} 便于前端直接消费，
 * 由 {@link DtoMapper} 负责解析。</p>
 *
 * @since 2026-07-26
 */
public class PostDto extends BaseDto {

    /** 帖子 ID */
    private Long id;

    /** 作者简要信息（轻量版，避免传输完整 UserDto） */
    private UserBriefDto author;

    /** 帖子正文内容 */
    private String content;

    /** 图片 URL 列表（可能为空列表） */
    private List<String> images;

    /** 点赞数 */
    private long likeCount;

    /** 评论数 */
    private long commentCount;

    /** 话题标签列表 */
    private List<String> tags;

    /** 所属圈子名称（非圈子帖为 null） */
    private String circleName;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserBriefDto getAuthor() {
        return author;
    }

    public void setAuthor(UserBriefDto author) {
        this.author = author;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(long likeCount) {
        this.likeCount = likeCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(long commentCount) {
        this.commentCount = commentCount;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getCircleName() {
        return circleName;
    }

    public void setCircleName(String circleName) {
        this.circleName = circleName;
    }
}
