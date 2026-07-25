package com.campuslove.api;

import com.campuslove.api.config.JwtConfig;
import com.campuslove.api.config.WeChatConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 修复：启用 @EnableScheduling，让 JwtTokenProvider.cleanupExpiredRevokedTokens
 * 等基于 @Scheduled 的定时任务能够被 Spring 容器调度执行。
 */
@SpringBootApplication
@EnableConfigurationProperties({JwtConfig.class, WeChatConfig.class})
@EnableScheduling
public class CampusLoveApplication {

  public static void main(String[] args) {
    SpringApplication.run(CampusLoveApplication.class, args);
  }
}
