package com.campuslove.api;

import com.campuslove.api.ai.AiVideoConfig;
import com.campuslove.api.config.JwtConfig;
import com.campuslove.api.config.WeChatConfig;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 修复：启用 @EnableScheduling，让 JwtTokenProvider.cleanupExpiredRevokedTokens
 * 等基于 @Scheduled 的定时任务能够被 Spring 容器调度执行。
 *
 * <p>SubTask 1.4.5：注册 {@link AiVideoConfig}，将 AGNES_API_KEY 等环境变量
 * 绑定到配置类，供 {@link com.campuslove.api.ai.RealAiVideoService} 使用。</p>
 */
@SpringBootApplication
@EnableConfigurationProperties({JwtConfig.class, WeChatConfig.class, AiVideoConfig.class})
@EnableScheduling
public class CampusLoveApplication {

  private static final Logger log = LoggerFactory.getLogger(CampusLoveApplication.class);

  /** 允许激活的 profile 集合（逗号分隔多 profile 时逐个校验）。 */
  private static final Set<String> ALLOWED_PROFILES =
      Set.of("mock", "real", "prod", "dev", "local", "wechat");

  /**
   * 应用入口。
   *
   * <p>R4-00368：Spring 启动前先强制校验激活 profile——未显式指定或非法时
   * 明确报错退出（fail-fast），避免生产漏配 SPRING_PROFILES_ACTIVE 时
   * 以 mock 数据模式启动（全站内存假数据 + MockSecurityConfig 免真实认证）。</p>
   */
  public static void main(String[] args) {
    validateActiveProfile(args);
    SpringApplication.run(CampusLoveApplication.class, args);
  }

  /**
   * R4-00368：校验激活的 Spring profile。
   *
   * <p>校验来源（按 Spring Boot 解析优先级）：
   * <ol>
   *   <li>命令行参数 {@code --spring.profiles.active=...}（如
   *       {@code java -jar app.jar --spring.profiles.active=real}）</li>
   *   <li>JVM 系统属性 {@code -Dspring.profiles.active=...}（如
   *       {@code mvnw spring-boot:run -Dspring.profiles.active=mock}）</li>
   *   <li>环境变量 {@code SPRING_PROFILES_ACTIVE}（如 Docker/CI）</li>
   * </ol>
   * 均未指定（为空）或包含非法 profile 时抛出 {@link IllegalStateException}，
   * 应用拒绝启动；合法 profile 记录日志后放行。</p>
   */
  private static void validateActiveProfile(String[] args) {
    String active = resolveActiveProfile(args);
    if (active == null || active.isBlank()) {
      String msg = "未指定 Spring profile（SPRING_PROFILES_ACTIVE / --spring.profiles.active / "
          + "-Dspring.profiles.active 均未设置）。为避免误以未定义配置启动（如意外进入 "
          + "mock 数据模式），应用拒绝启动：生产/联调请显式指定 real，本地开发请显式指定 mock。";
      log.error(msg);
      throw new IllegalStateException(msg);
    }
    List<String> profiles = Arrays.stream(active.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .toList();
    List<String> invalid = profiles.stream().filter(p -> !ALLOWED_PROFILES.contains(p)).toList();
    if (!invalid.isEmpty()) {
      String msg = "非法 Spring profile: " + invalid + "；允许的 profile: " + ALLOWED_PROFILES
          + "（如 SPRING_PROFILES_ACTIVE=real 或 --spring.profiles.active=mock）";
      log.error(msg);
      throw new IllegalStateException(msg);
    }
    log.info("激活 Spring profile: {}", active);
  }

  /** 解析激活 profile（命令行参数 → JVM 系统属性 → 环境变量）。 */
  private static String resolveActiveProfile(String[] args) {
    if (args != null) {
      for (String arg : args) {
        if (arg != null && arg.startsWith("--spring.profiles.active=")) {
          String value = arg.substring("--spring.profiles.active=".length());
          if (!value.isBlank()) {
            return value;
          }
        }
      }
    }
    String sysProp = System.getProperty("spring.profiles.active");
    if (sysProp != null && !sysProp.isBlank()) {
      return sysProp;
    }
    return System.getenv("SPRING_PROFILES_ACTIVE");
  }
}
