package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 签到服务配置类。
 * 将签到相关的硬编码值外移到配置文件，支持运行时动态调整。
 * <p>
 * 配置前缀: app.checkin
 */
@Component
@ConfigurationProperties(prefix = "app.checkin")
public class CheckInConfig {

    /** 每次签到奖励的额外推荐配额 */
    private int extraQuotaPerCheckIn = 3;

    public int getExtraQuotaPerCheckIn() {
        return extraQuotaPerCheckIn;
    }

    public void setExtraQuotaPerCheckIn(int extraQuotaPerCheckIn) {
        this.extraQuotaPerCheckIn = extraQuotaPerCheckIn;
    }
}
