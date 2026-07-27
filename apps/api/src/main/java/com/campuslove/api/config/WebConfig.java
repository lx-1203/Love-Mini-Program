package com.campuslove.api.config;

import com.campuslove.api.common.IdempotentInterceptor;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置类。
 *
 * <p>Task 0.3 改造说明：原 {@code /uploads/**} 静态资源映射已移除。
 * 上传文件不再通过 Spring 静态资源机制直接对外提供服务，
 * 改由 {@link com.campuslove.api.media.MediaAccessController} 鉴权代理端点
 * （{@code GET /api/v1/media/{userId}/{path}}）按 JWT 中的 userId 校验文件归属后提供服务，
 * 防止未授权用户枚举/访问他人上传的隐私媒体文件。</p>
 *
 * <p>Task 0.6.2 改造说明：CORS 配置改用 {@link CorsRegistration#allowedOriginPatterns(String...)}
 * + 配置文件注入（{@code app.cors.allowed-origins} 列表）。
 *
 * <p>Task 2.4.3 改造说明：注册 {@link IdempotentInterceptor} 拦截 {@code /api/**} 路径，
 * 对标注 {@link com.campuslove.api.common.Idempotent} 的方法执行幂等校验。
 *
 * <p>使用 {@code allowedOriginPatterns} 而非 {@code allowedOrigins} 的原因：
 * <ul>
 *   <li>当 {@code allowCredentials=true} 时，Spring 6 严格模式禁止 {@code allowedOrigins} 使用 {@code "*"}，
 *       必须改用 {@code allowedOriginPatterns} 才能支持跨域凭据</li>
 *   <li>{@code allowedOriginPatterns} 支持通配符模式（如 {@code https://*.example.com}），
 *       便于多子域名部署</li>
 * </ul>
 * </p>
 *
 * <p>配置项格式（在 application.yml 中）：
 * <pre>
 * app:
 *   cors:
 *     allowed-origins:
 *       - https://example.com
 *       - https://*.example.com
 * </pre>
 * </p>
 *
 * <p>覆盖关系：
 * <ul>
 *   <li>real profile：{@link SecurityConfig} 的 {@link
 *       org.springframework.web.cors.CorsConfigurationSource} Bean 优先生效
 *       （Spring Security CORS 优先级高于 WebMvc CORS）</li>
 *   <li>mock profile 与无 Security 场景：本类 {@code addCorsMappings} 生效</li>
 *   <li>两者读取相同配置项 {@code app.cors.allowed-origins}，保证一致性</li>
 * </ul>
 * </p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** 媒体存储根目录，与 LocalMediaStorageService 共享配置（保留用于其他组件读取） */
    @Value("${app.media.storage-root:./uploads}")
    private String mediaStorageRoot;

    /**
     * CORS 允许的源列表，从配置 {@code app.cors.allowed-origins} 读取。
     *
     * <p>支持列表形式注入（YAML 数组自动转换为逗号分隔字符串，再由本类解析）。
     * 配置缺失时回退到本地开发常用端口，保证开发体验。
     * 兼容环境变量 {@code CORS_ALLOWED_ORIGINS}（逗号分隔）直接覆盖。</p>
     */
    @Value("#{'${app.cors.allowed-origins:${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:5174,http://localhost:5177,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5177}}'.split(',')}")
    private List<String> allowedOrigins;

    /**
     * Task 2.4.3：幂等性拦截器，由 Spring 容器注入。
     *
     * <p>仅 real profile 下激活（{@link IdempotentInterceptor} 标注 {@code @Profile("real")}），
     * mock profile 下为 null，{@link #addInterceptors} 中通过 null 检查跳过注册。</p>
     */
    @Autowired(required = false)
    private IdempotentInterceptor idempotentInterceptor;

    /**
     * 获取媒体存储根目录。
     *
     * <p>Task 0.3 后：{@code /uploads/**} 静态资源映射已移除，
     * 此 getter 仅供其他需要读取 storage-root 的组件使用，不再注册 ResourceHandler。</p>
     *
     * @return 媒体存储根目录字符串
     */
    public String getMediaStorageRoot() {
        return mediaStorageRoot;
    }

    /**
     * 获取 CORS 允许的源列表（去除空白与空项）。
     *
     * <p>暴露为 public 便于单元测试验证配置注入是否正确。</p>
     *
     * @return 已清理的源列表（不含空字符串）
     */
    public List<String> getAllowedOrigins() {
        if (allowedOrigins == null) {
            return List.of();
        }
        return allowedOrigins.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /**
     * 注册 CORS 映射规则。
     *
     * <p>覆盖 {@code /api/**} 路径，使用 {@code allowedOriginPatterns} 支持凭据跨域。
     * 与 {@link SecurityConfig#corsConfigurationSource()} 读取相同配置项，
     * 在 SecurityFilterChain 未激活的 profile 下提供兜底 CORS 支持。</p>
     *
     * @param registry CORS 注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = getAllowedOrigins();
        if (origins.isEmpty()) {
            // 无配置时不注册 CORS，避免误开放跨域
            return;
        }
        String[] originArray = origins.toArray(new String[0]);
        registry.addMapping("/api/**")
                .allowedOriginPatterns(originArray)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("Authorization", "Content-Type", "X-Requested-With",
                        "X-Trace-Id", "Idempotency-Key")
                .exposedHeaders("X-Trace-Id")
                .allowCredentials(true)
                .maxAge(3600L);
    }

    /**
     * Task 2.4.3：注册幂等性拦截器。
     *
     * <p>仅当 real profile 下 {@link IdempotentInterceptor} Bean 存在时注册，
     * 拦截所有 {@code /api/**} 路径。拦截器内部通过 {@code @Idempotent} 注解
     * 判断是否执行幂等校验，未标注的方法直接放行。</p>
     *
     * @param registry 拦截器注册器
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (idempotentInterceptor != null) {
            registry.addInterceptor(idempotentInterceptor)
                    .addPathPatterns("/api/**");
        }
    }

    /**
     * 工具方法：将逗号分隔的源字符串解析为列表（去空白、去空项）。
     *
     * <p>暴露为静态工具方法，便于 {@link SecurityConfig} 与单元测试复用解析逻辑。</p>
     *
     * @param raw 原始字符串（YAML 注入后的逗号分隔形式）
     * @return 已清理的源列表
     */
    public static List<String> parseOrigins(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
