package com.campuslove.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 聊天服务配置类。
 * 将聊天相关的硬编码值外移到配置文件，支持运行时动态调整。
 * <p>
 * 配置前缀: app.chat
 */
@Component
@ConfigurationProperties(prefix = "app.chat")
public class ChatConfig {

    /** 临时会话过期时间（小时） */
    private int sessionExpireHours = 24;

    public int getSessionExpireHours() {
        return sessionExpireHours;
    }

    public void setSessionExpireHours(int sessionExpireHours) {
        this.sessionExpireHours = sessionExpireHours;
    }
}
