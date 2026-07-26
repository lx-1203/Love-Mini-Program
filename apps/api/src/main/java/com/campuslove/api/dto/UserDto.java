package com.campuslove.api.dto;

import java.util.List;

/**
 * 用户主信息 DTO。
 *
 * <p>对应 {@link com.campuslove.api.entity.User} 实体，但仅暴露安全字段，
 * 严格剔除以下敏感字段：
 * <ul>
 *   <li>{@code phone}：手机号（仅在内部业务流程中使用，不对外暴露）</li>
 *   <li>{@code password}：密码哈希（仅服务端校验，绝不外泄）</li>
 *   <li>{@code realName}：真实姓名（如未来扩展）</li>
 *   <li>{@code idCardNumber}：身份证号（如未来扩展）</li>
 * </ul>
 * <strong>openid 字段必须经过 {@link MaskingUtils#maskOpenid(String)} 脱敏后才能填入此 DTO。</strong></p>
 *
 * <p>部分字段（gender、age、schoolId 等）来源于关联实体
 * （{@code UserBasicProfile}、{@code UserCampusProfile}），
 * 由 {@link DtoMapper#toUserDto} 在映射时按需补充，未提供时为 {@code null}。</p>
 *
 * @since 2026-07-26
 */
public class UserDto extends BaseDto {

    /** 用户 ID */
    private Long id;

    /** 微信 openid（已脱敏，前 4 位 + ****** + 后 2 位） */
    private String openid;

    /** 昵称 */
    private String nickname;

    /** 头像 URL */
    private String avatarUrl;

    /** 性别（male/female/other），来源于用户基础资料 */
    private String gender;

    /** 年龄，来源于用户基础资料 */
    private Integer age;

    /** 学校 ID */
    private Long schoolId;

    /** 学校名称，来源于 UserCampusProfile.campusName */
    private String schoolName;

    /** 学院，来源于 UserCampusProfile.departmentName */
    private String college;

    /** 专业，来源于用户基础资料 */
    private String major;

    /** 入学年份（如 2024），来源于 gradeLabel 解析或独立字段 */
    private Integer enrollmentYear;

    /** 个人简介 */
    private String bio;

    /** 兴趣标签列表，来源于 UserBasicProfile.interestTags */
    private List<String> tags;

    /** 是否已通过校园认证 */
    private Boolean isVerified;

    /** 是否为 VIP 用户 */
    private Boolean isVip;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOpenid() {
        return openid;
    }

    public void setOpenid(String openid) {
        this.openid = openid;
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

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public Long getSchoolId() {
        return schoolId;
    }

    public void setSchoolId(Long schoolId) {
        this.schoolId = schoolId;
    }

    public String getSchoolName() {
        return schoolName;
    }

    public void setSchoolName(String schoolName) {
        this.schoolName = schoolName;
    }

    public String getCollege() {
        return college;
    }

    public void setCollege(String college) {
        this.college = college;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public Integer getEnrollmentYear() {
        return enrollmentYear;
    }

    public void setEnrollmentYear(Integer enrollmentYear) {
        this.enrollmentYear = enrollmentYear;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
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
