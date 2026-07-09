package com.campuslove.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/**
 * 用户基础资料实体，对应 user_basic_profile 表。
 * 存储昵称、简介、年级标签、代词等基础信息。
 *
 * <p>Phase A 扩展字段（V2026070501001 迁移）：
 * 身高、学历、感情状态、籍贯、未来城市、未来规划标签、
 * 照片墙、半身照、个人视频、个人主页背景图。</p>
 */
@Entity
@Table(name = "user_basic_profile")
public class UserBasicProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 关联用户 ID（唯一） */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 昵称 */
    @Column(name = "nickname", nullable = false, length = 64)
    private String nickname;

    /** 个人简介 */
    @Column(name = "bio", nullable = false, length = 255)
    private String bio;

    /** 年级标签 */
    @Column(name = "grade_label", nullable = false, length = 32)
    private String gradeLabel;

    /** 代词偏好 */
    @Column(name = "pronouns", nullable = false, length = 32)
    private String pronouns;

    /** 兴趣标签列表（JSON数组格式，如 ["摄影","篮球","阅读"]，默认空数组） */
    @Column(name = "interest_tags", columnDefinition = "JSON DEFAULT '[]'")
    private String interestTags = "[]";

    /**
     * 身高（单位 cm，范围 120-250）。
     * 由前端通过表单提交，后端在保存时进行范围校验。
     * 可空，表示用户尚未填写。
     */
    @Column(name = "height")
    private Integer height;

    /**
     * 学历层级。
     * 取值：high_school（高中）/ bachelor（本科）/ master（硕士）/ phd（博士）。
     */
    @Column(name = "education_level", length = 16)
    private String educationLevel;

    /**
     * 感情状态。
     * 取值：never（未婚）/ married_before（曾婚）/ divorced（离异）/ widowed（丧偶）。
     */
    @Column(name = "relationship_status", length = 16)
    private String relationshipStatus;

    /** 籍贯 - 省份（如 "广东省"） */
    @Column(name = "hometown_province", length = 32)
    private String hometownProvince;

    /** 籍贯 - 城市（如 "广州市"） */
    @Column(name = "hometown_city", length = 32)
    private String hometownCity;

    /** 未来计划定居城市 */
    @Column(name = "future_city", length = 32)
    private String futureCity;

    /**
     * 未来规划标签（JSON 数组，如 ["买房","养猫","创业"]）。
     * 默认 '[]'，由前端维护增删。
     */
    @Column(name = "future_plan_tags", columnDefinition = "JSON DEFAULT '[]'")
    private String futurePlanTags = "[]";

    /**
     * 照片墙 URL 列表（JSON 数组，最多 6 张）。
     * 默认 '[]'，元素为图片访问 URL。
     */
    @Column(name = "photo_gallery", columnDefinition = "JSON DEFAULT '[]'")
    private String photoGallery = "[]";

    /** 半身照 URL（用于推荐卡片大图，单张） */
    @Column(name = "half_body_photo_url", length = 512)
    private String halfBodyPhotoUrl;

    /** 个人视频 URL（≤60s，用于推荐卡片视频角标跳转） */
    @Column(name = "personal_video_url", length = 512)
    private String personalVideoUrl;

    /** 个人主页背景图 URL */
    @Column(name = "profile_background_url", length = 512)
    private String profileBackgroundUrl;

    /**
     * 邮箱认证标志（Phase B - Task B3.3）。
     * true 表示用户已通过邮箱认证，可用于徽章级别 "email"。
     * 默认 false，由邮箱认证流程置位。
     */
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = Boolean.FALSE;

    /**
     * 身份证认证标志（Phase B - Task B3.4）。
     * true 表示用户已通过身份证认证，可用于徽章级别 "idcard"。
     * 默认 false，由身份证认证流程置位。
     */
    @Column(name = "id_card_verified", nullable = false)
    private Boolean idCardVerified = Boolean.FALSE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserBasicProfile() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getGradeLabel() {
        return gradeLabel;
    }

    public void setGradeLabel(String gradeLabel) {
        this.gradeLabel = gradeLabel;
    }

    public String getPronouns() {
        return pronouns;
    }

    public void setPronouns(String pronouns) {
        this.pronouns = pronouns;
    }

    public String getInterestTags() {
        return interestTags;
    }

    public void setInterestTags(String interestTags) {
        this.interestTags = interestTags;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public String getEducationLevel() {
        return educationLevel;
    }

    public void setEducationLevel(String educationLevel) {
        this.educationLevel = educationLevel;
    }

    public String getRelationshipStatus() {
        return relationshipStatus;
    }

    public void setRelationshipStatus(String relationshipStatus) {
        this.relationshipStatus = relationshipStatus;
    }

    public String getHometownProvince() {
        return hometownProvince;
    }

    public void setHometownProvince(String hometownProvince) {
        this.hometownProvince = hometownProvince;
    }

    public String getHometownCity() {
        return hometownCity;
    }

    public void setHometownCity(String hometownCity) {
        this.hometownCity = hometownCity;
    }

    public String getFutureCity() {
        return futureCity;
    }

    public void setFutureCity(String futureCity) {
        this.futureCity = futureCity;
    }

    public String getFuturePlanTags() {
        return futurePlanTags;
    }

    public void setFuturePlanTags(String futurePlanTags) {
        this.futurePlanTags = futurePlanTags;
    }

    public String getPhotoGallery() {
        return photoGallery;
    }

    public void setPhotoGallery(String photoGallery) {
        this.photoGallery = photoGallery;
    }

    public String getHalfBodyPhotoUrl() {
        return halfBodyPhotoUrl;
    }

    public void setHalfBodyPhotoUrl(String halfBodyPhotoUrl) {
        this.halfBodyPhotoUrl = halfBodyPhotoUrl;
    }

    public String getPersonalVideoUrl() {
        return personalVideoUrl;
    }

    public void setPersonalVideoUrl(String personalVideoUrl) {
        this.personalVideoUrl = personalVideoUrl;
    }

    public String getProfileBackgroundUrl() {
        return profileBackgroundUrl;
    }

    public void setProfileBackgroundUrl(String profileBackgroundUrl) {
        this.profileBackgroundUrl = profileBackgroundUrl;
    }

    public Boolean getEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(Boolean emailVerified) {
        this.emailVerified = emailVerified != null ? emailVerified : Boolean.FALSE;
    }

    public Boolean getIdCardVerified() {
        return idCardVerified;
    }

    public void setIdCardVerified(Boolean idCardVerified) {
        this.idCardVerified = idCardVerified != null ? idCardVerified : Boolean.FALSE;
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
