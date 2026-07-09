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
}
