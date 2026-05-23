package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 匹配服务配置类。
 * 将匹配相关的硬编码值外移到配置文件，支持运行时动态调整。
 * <p>
 * 配置前缀: app.match
 */
@Component
@ConfigurationProperties(prefix = "app.match")
public class MatchConfig {

    /** 心动信号过期时间（小时） */
    private int heartSignalExpireHours = 48;

    /** 匹配候选用户分页查询数量上限 */
    private int candidatePageSize = 50;

    /** 默认聊天时长（分钟） */
    private int defaultChatDuration = 20;

    /** 同校区权重 */
    private int campusWeight = 50;

    /** 同城市权重 */
    private int cityWeight = 20;

    /** 兴趣标签匹配权重（每个匹配标签） */
    private int interestWeight = 10;

    /** 日程重叠权重 */
    private int scheduleWeight = 15;

    public int getHeartSignalExpireHours() {
        return heartSignalExpireHours;
    }

    public void setHeartSignalExpireHours(int heartSignalExpireHours) {
        this.heartSignalExpireHours = heartSignalExpireHours;
    }

    public int getCandidatePageSize() {
        return candidatePageSize;
    }

    public void setCandidatePageSize(int candidatePageSize) {
        this.candidatePageSize = candidatePageSize;
    }

    public int getDefaultChatDuration() {
        return defaultChatDuration;
    }

    public void setDefaultChatDuration(int defaultChatDuration) {
        this.defaultChatDuration = defaultChatDuration;
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
