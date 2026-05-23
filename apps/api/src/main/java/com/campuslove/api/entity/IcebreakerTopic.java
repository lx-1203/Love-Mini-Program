package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 破冰话题实体，对应 icebreaker_topics 表。
 * 存储通用破冰话题模板，用于匹配破冰引导功能。
 */
@Entity
@Table(name = "icebreaker_topics")
public class IcebreakerTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 话题内容 */
    @Column(name = "content", nullable = false, length = 200)
    private String content;

    /** 话题分类（interests / campus / lifestyle / daily / fun / romantic） */
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    /** 是否启用 */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public IcebreakerTopic() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
