package com.campuslove.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置类。
 *
 * <p>配置项：
 * <ul>
 *   <li>CORS：/api/** 跨域规则</li>
 *   <li>静态资源映射：/uploads/** → file:./uploads/，用于服务上传的媒体文件</li>
 * </ul>
 * </p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  /** 媒体存储根目录，与 LocalMediaStorageService 共享配置 */
  @Value("${app.media.storage-root:./uploads}")
  private String mediaStorageRoot;

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("Authorization", "Content-Type", "X-Requested-With")
        .allowCredentials(true)
        .maxAge(3600);
  }

  /**
   * 静态资源映射：将 /uploads/** URL 映射到本地文件系统目录。
   *
   * <p>用于服务用户上传的媒体文件（图片/视频/背景图）。
   * 路径末尾必须以 / 结尾，否则 ResourceHttpRequestHandler 无法正确解析子路径。</p>
   *
   * <p>缓存策略：默认 1 小时浏览器缓存（由 Spring 默认提供）</p>
   *
   * @param registry 资源处理器注册器
   */
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // 标准化路径：保证以 / 结尾
    String locationPath = mediaStorageRoot.endsWith("/") ? mediaStorageRoot : mediaStorageRoot + "/";
    // file: 协议 + 绝对/相对路径，相对路径基于应用工作目录
    String fileUrl = "file:" + (locationPath.startsWith("./") ? locationPath.substring(2) : locationPath);
    registry.addResourceHandler("/uploads/**")
        .addResourceLocations(fileUrl)
        .setCachePeriod(3600);
  }
}
