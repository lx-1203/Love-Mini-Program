package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 官方账号实体，对应 official_accounts 表。
 *
 * <p>官方号 = 产品助手号（official-assistant，系统通知/功能答疑）
 * 与 活动运营号（official-promoter，活动推送/福利通知）两类，
 * 会话进消息列表、消息流由 official_messages 承载。</p>
 */
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
    name = "official_accounts",
    indexes = {
        @Index(name = "uk_official_accounts_code", columnList = "code", unique = true)
    }
)
public class OfficialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 官方号唯一标识（official-assistant / official-promoter） */
    @Column(name = "code", nullable = false, unique = true, length = 32)
    private String code;

    /** 官方号名称（中文，如「产品助手」） */
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    /** 官方号名称（英文） */
    @Column(name = "name_en", nullable = false, length = 64)
    private String nameEn = "";

    /** 官方号简介（中文） */
    @Column(name = "description", nullable = false, length = 255)
    private String description = "";

    /** 官方号简介（英文） */
    @Column(name = "description_en", nullable = false, length = 255)
    private String descriptionEn = "";

    /** 官方号专属头像 URL（空时前端用默认图标） */
    @Column(name = "icon_url", nullable = false, length = 512)
    private String iconUrl = "";

    /** 展示顺序（升序） */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    /** 是否启用（0=下线） */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }

    public void setDescriptionEn(String descriptionEn) {
        this.descriptionEn = descriptionEn;
    }

    public String getIconUrl() {
        return iconUrl;
    }

    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
