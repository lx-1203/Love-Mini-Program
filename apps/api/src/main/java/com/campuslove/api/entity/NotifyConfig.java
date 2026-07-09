package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 通知配置实体，对应 notify_config 表。
 * 存储各通知类型的启停状态与模板内容，由管理后台维护。
 */
@Entity
@Table(name = "notify_config")
public class NotifyConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 通知类型（如 LIKE/COMMENT/FOLLOW/VISITOR/MATCH/SYSTEM） */
    @Column(name = "type", nullable = false, length = 32, unique = true)
    private String type;

    /** 是否启用：true启用 false停用 */
    @Column(name = "enabled", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean enabled = Boolean.TRUE;

    /** 通知模板内容（可空，预留扩展） */
    @Column(name = "template", length = 512)
    private String template;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public NotifyConfig() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
