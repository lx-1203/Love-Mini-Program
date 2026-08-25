package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 发布草稿实体，对应 post_draft 表。
 *
 * <p>每用户一条草稿（upsert 语义）：保存时先查再插/更新。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "post_draft",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_draft_user", columnNames = {"user_id"})
    }
)
public class PostDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType = "general";

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "title", length = 30)
    private String title;

    @Column(name = "content", length = 5000)
    private String content;

    @Column(name = "images", columnDefinition = "JSON")
    private String images;

    @Column(name = "tags", columnDefinition = "JSON")
    private String tags;

    @Column(name = "topics", columnDefinition = "JSON")
    private String topics;

    @Column(name = "location", length = 120)
    private String location;

    @Column(name = "visibility", nullable = false, length = 20)
    private String visibility = "circle_members";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // --- constructors ---
    public PostDraft() {}

    public PostDraft(Long userId) {
        this.userId = userId;
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImages() { return images; }
    public void setImages(String images) { this.images = images; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getTopics() { return topics; }
    public void setTopics(String topics) { this.topics = topics; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
