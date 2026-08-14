package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 推荐服务配置类。
 * 将推荐相关的硬编码值外移到配置文件，支持运行时动态调整。
 * <p>
 * 配置前缀: app.recommendation
 */
@Component
@ConfigurationProperties(prefix = "app.recommendation")
public class RecommendationConfig {

    /** 每日推荐上限 */
    private int dailyLimit = 10;

    /** 讨论推荐返回数量上限 */
    private int discussionLimit = 10;

    /** 候选用户分页查询数量上限，避免全表扫描 */
    private int candidatePageSize = 200;

    /** 同校区权重 */
    private int campusWeight = 50;

    /** 同城市权重 */
    private int cityWeight = 20;

    /** 兴趣标签匹配权重（每个匹配标签） */
    private int interestWeight = 10;

    /** 日程重叠权重 */
    private int scheduleWeight = 15;

    /** 同校百分比加成（乘数，默认 0.30 即+30%） */
    private double sameSchoolBoostPercent = 0.30;

    /** 同专业额外加分 */
    private int sameMajorWeight = 20;

    /** 共同兴趣圈每个加分 */
    private int commonCircleWeight = 5;

    /** 共同每日一问回答每个加分 */
    private int commonDailyAnswerWeight = 3;

    /** 兴趣圈权重 */
    private int circleWeight = 8;

    /** 同校百分比加成启用开关 */
    private boolean sameSchoolBoostEnabled = true;

    /**
     * SubTask 5.1.3：活跃度评分权重（每条最近发帖加分）。
     *
     * <p>用于推荐算法的「活跃度」维度：候选用户最近 N 天的发帖数 × 该权重 = 活跃度加分。
     * 默认 5，表示每条最近发帖加 5 分（约为兴趣标签匹配权重的一半）。</p>
     *
     * <p>配置示例：{@code app.recommendation.activity-weight=5}</p>
     */
    private int activityWeight = 5;

    /**
     * SubTask 5.1.3：活跃度统计时间窗口（天）。
     *
     * <p>仅统计候选用户最近 N 天的发帖数作为活跃度指标。
     * 默认 7 天，覆盖一周内的活跃行为，避免长期不活跃用户占用推荐配额。</p>
     *
     * <p>配置示例：{@code app.recommendation.activity-recent-days=7}</p>
     */
    private int activityRecentDays = 7;

    /**
     * SubTask 5.1.3：活跃度加分上限（防止单一维度主导总分）。
     *
     * <p>单个候选用户的活跃度加分上限，避免高频发帖用户分数过高压倒其他维度。
     * 默认 10 条，即最多加 {@code 10 × activityWeight} 分。</p>
     */
    private int activityMaxPosts = 10;

    /**
     * 2026-08-11 匹配精细化：身高匹配权重（候选与我的身高差 ≤5cm 加分）。
     *
     * <p>配置示例：{@code app.recommendation.height-weight=15}</p>
     */
    private int heightWeight = 15;

    /**
     * 2026-08-11 匹配精细化：年龄匹配权重（候选与我的年龄差 ≤3 岁加分）。
     *
     * <p>配置示例：{@code app.recommendation.age-weight=10}</p>
     */
    private int ageWeight = 10;

    /**
     * 2026-08-11 匹配精细化：理想型匹配权重（我的理想型关键词命中候选兴趣/性格标签，
     * 每个关键词加分）。
     *
     * <p>配置示例：{@code app.recommendation.partner-weight=8}</p>
     */
    private int partnerWeight = 8;

    /** 身高差阈值（cm）：≤ 该值加分；≤ 两倍该值减半加分 */
    private int heightDiffTolerance = 5;

    /** 年龄差阈值（岁）：≤ 该值加分 */
    private int ageDiffTolerance = 3;

    public int getDailyLimit() {
        return dailyLimit;
    }

    public void setDailyLimit(int dailyLimit) {
        this.dailyLimit = dailyLimit;
    }

    public int getDiscussionLimit() {
        return discussionLimit;
    }

    public void setDiscussionLimit(int discussionLimit) {
        this.discussionLimit = discussionLimit;
    }

    public int getCandidatePageSize() {
        return candidatePageSize;
    }

    public void setCandidatePageSize(int candidatePageSize) {
        this.candidatePageSize = candidatePageSize;
    }

    public int getCampusWeight() {
        return campusWeight;
    }

    public void setCampusWeight(int campusWeight) {
        this.campusWeight = campusWeight;
    }

    public int getCityWeight() {
        return cityWeight;
    }

    public void setCityWeight(int cityWeight) {
        this.cityWeight = cityWeight;
    }

    public int getInterestWeight() {
        return interestWeight;
    }

    public void setInterestWeight(int interestWeight) {
        this.interestWeight = interestWeight;
    }

    public int getScheduleWeight() {
        return scheduleWeight;
    }

    public void setScheduleWeight(int scheduleWeight) {
        this.scheduleWeight = scheduleWeight;
    }

    public double getSameSchoolBoostPercent() {
        return sameSchoolBoostPercent;
    }

    public void setSameSchoolBoostPercent(double sameSchoolBoostPercent) {
        this.sameSchoolBoostPercent = sameSchoolBoostPercent;
    }

    public int getSameMajorWeight() {
        return sameMajorWeight;
    }

    public void setSameMajorWeight(int sameMajorWeight) {
        this.sameMajorWeight = sameMajorWeight;
    }

    public int getCommonCircleWeight() {
        return commonCircleWeight;
    }

    public void setCommonCircleWeight(int commonCircleWeight) {
        this.commonCircleWeight = commonCircleWeight;
    }

    public int getCommonDailyAnswerWeight() {
        return commonDailyAnswerWeight;
    }

    public void setCommonDailyAnswerWeight(int commonDailyAnswerWeight) {
        this.commonDailyAnswerWeight = commonDailyAnswerWeight;
    }

    public int getCircleWeight() {
        return circleWeight;
    }

    public void setCircleWeight(int circleWeight) {
        this.circleWeight = circleWeight;
    }

    public boolean isSameSchoolBoostEnabled() {
        return sameSchoolBoostEnabled;
    }

    public void setSameSchoolBoostEnabled(boolean sameSchoolBoostEnabled) {
        this.sameSchoolBoostEnabled = sameSchoolBoostEnabled;
    }

    public int getActivityWeight() {
        return activityWeight;
    }

    public void setActivityWeight(int activityWeight) {
        this.activityWeight = activityWeight;
    }

    public int getActivityRecentDays() {
        return activityRecentDays;
    }

    public void setActivityRecentDays(int activityRecentDays) {
        this.activityRecentDays = activityRecentDays;
    }

    public int getActivityMaxPosts() {
        return activityMaxPosts;
    }

    public void setActivityMaxPosts(int activityMaxPosts) {
        this.activityMaxPosts = activityMaxPosts;
    }

    public int getHeightWeight() {
        return heightWeight;
    }

    public void setHeightWeight(int heightWeight) {
        this.heightWeight = heightWeight;
    }

    public int getAgeWeight() {
        return ageWeight;
    }

    public void setAgeWeight(int ageWeight) {
        this.ageWeight = ageWeight;
    }

    public int getPartnerWeight() {
        return partnerWeight;
    }

    public void setPartnerWeight(int partnerWeight) {
        this.partnerWeight = partnerWeight;
    }

    public int getHeightDiffTolerance() {
        return heightDiffTolerance;
    }

    public void setHeightDiffTolerance(int heightDiffTolerance) {
        this.heightDiffTolerance = heightDiffTolerance;
    }

    public int getAgeDiffTolerance() {
        return ageDiffTolerance;
    }

    public void setAgeDiffTolerance(int ageDiffTolerance) {
        this.ageDiffTolerance = ageDiffTolerance;
    }
}
