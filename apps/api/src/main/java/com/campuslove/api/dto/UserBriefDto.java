package com.campuslove.api.dto;

/**
 * 用户简要 DTO（轻量版）。
 *
 * <p>用于列表场景下的作者/匹配对象展示，仅包含展示所需的最少字段，
 * 避免在批量查询时传输完整 {@link UserDto} 的开销。</p>
 *
 * <p>典型使用场景：
 * <ul>
 *   <li>{@link PostDto#getAuthor()}：帖子列表中展示作者信息</li>
 *   <li>{@link MatchDto#getPartner()}：匹配列表中展示对方信息</li>
 *   <li>评论列表、点赞列表等需要展示用户摘要的场景</li>
 * </ul>
 * </p>
 *
 * <p>本 DTO 不继承 {@link BaseDto}，因为列表场景通常不需要 createdAt/updatedAt，
 * 减少序列化体积。</p>
 *
 * @since 2026-07-26
 */
public class UserBriefDto {

    /** 用户 ID */
    private Long id;

    /** 昵称 */
    private String nickname;

    /** 头像 URL */
    private String avatarUrl;

    /** 是否已通过校园认证（用于展示认证徽章） */
    private Boolean isVerified;

    /** 是否为 VIP 用户（用于展示 VIP 徽章） */
    private Boolean isVip;

    public UserBriefDto() {
    }

    public UserBriefDto(Long id, String nickname, String avatarUrl, Boolean isVerified, Boolean isVip) {
        this.id = id;
        this.nickname = nickname;
        this.avatarUrl = avatarUrl;
        this.isVerified = isVerified;
        this.isVip = isVip;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Boolean getIsVerified() {
        return isVerified;
    }

    public void setIsVerified(Boolean isVerified) {
        this.isVerified = isVerified;
    }

    public Boolean getIsVip() {
        return isVip;
    }

    public void setIsVip(Boolean isVip) {
        this.isVip = isVip;
    }
}
