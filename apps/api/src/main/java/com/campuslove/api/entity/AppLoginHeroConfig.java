package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 登录主视觉配置实体，对应 app_login_hero_config 表。
 * 按场景（scene_key）区分不同登录页的视觉配置，
 * 通过 is_active 字段控制当前生效的配置行。
 */
@Entity
@Table(name = "app_login_hero_config")
public class AppLoginHeroConfig {

    /** 主键ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 场景标识（如 default、valentine 等），每个场景唯一 */
    @Column(name = "scene_key", nullable = false, length = 64)
    private String sceneKey;

    /** 主视觉模式：animation / video */
    @Column(name = "hero_mode", nullable = false, length = 16)
    private String heroMode;

    /** 视频地址（hero_mode=video 时使用） */
    @Column(name = "hero_video_url", length = 512)
    private String heroVideoUrl;

    /** 视频封面图地址 */
    @Column(name = "hero_poster_url", length = 512)
    private String heroPosterUrl;

    /** 动画主题名称（hero_mode=animation 时使用） */
    @Column(name = "hero_animation_theme", nullable = false, length = 64)
    private String heroAnimationTheme;

    /** 主标题 */
    @Column(name = "hero_title", nullable = false, length = 128)
    private String heroTitle;

    /** 副标题 */
    @Column(name = "hero_subtitle", nullable = false, length = 255)
    private String heroSubtitle;

    /** 是否为当前生效配置（1=生效，0=停用） */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    /** 最后更新者用户ID */
    @Column(name = "updated_by")
    private Long updatedBy;

    /** 创建时间 */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** JPA 要求的无参构造器 */
    public AppLoginHeroConfig() {
    }

    // ==================== Getter / Setter ====================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSceneKey() {
        return sceneKey;
    }

    public void setSceneKey(String sceneKey) {
        this.sceneKey = sceneKey;
    }

    public String getHeroMode() {
        return heroMode;
    }

    public void setHeroMode(String heroMode) {
        this.heroMode = heroMode;
    }

    public String getHeroVideoUrl() {
        return heroVideoUrl;
    }

    public void setHeroVideoUrl(String heroVideoUrl) {
        this.heroVideoUrl = heroVideoUrl;
    }

    public String getHeroPosterUrl() {
        return heroPosterUrl;
    }

    public void setHeroPosterUrl(String heroPosterUrl) {
        this.heroPosterUrl = heroPosterUrl;
    }

    public String getHeroAnimationTheme() {
        return heroAnimationTheme;
    }

    public void setHeroAnimationTheme(String heroAnimationTheme) {
        this.heroAnimationTheme = heroAnimationTheme;
    }

    public String getHeroTitle() {
        return heroTitle;
    }

    public void setHeroTitle(String heroTitle) {
        this.heroTitle = heroTitle;
    }

    public String getHeroSubtitle() {
        return heroSubtitle;
    }

    public void setHeroSubtitle(String heroSubtitle) {
        this.heroSubtitle = heroSubtitle;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
