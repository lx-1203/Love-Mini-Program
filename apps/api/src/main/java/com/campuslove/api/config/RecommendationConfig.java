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
}
