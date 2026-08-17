package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * 用户兴趣标签关系（2.0 后台标签运营层）。
 */
@Entity
@Table(name = "user_interest_tag", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_interest_tag", columnNames = {"user_id", "tag_id"})
})
public class UserInterestTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tag_id", nullable = false)
    private Long tagId;

    public UserInterestTag() {}

    public UserInterestTag(Long userId, Long tagId) {
        this.userId = userId;
        this.tagId = tagId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTagId() { return tagId; }
    public void setTagId(Long tagId) { this.tagId = tagId; }
}
