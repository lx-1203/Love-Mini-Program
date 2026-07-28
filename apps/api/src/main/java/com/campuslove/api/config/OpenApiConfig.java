package com.campuslove.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * springdoc-openapi 配置类（Task 8.4.1）。
 *
 * <p>提供以下能力：</p>
 * <ul>
 *   <li>OpenAPI 3 元信息（标题、版本、描述、联系人、许可证）</li>
 *   <li>JWT Bearer 鉴权方案配置，Swagger UI 顶部 "Authorize" 按钮可填写 JWT</li>
 *   <li>服务器地址配置，支持本地开发与生产部署</li>
 * </ul>
 *
 * <p><b>Swagger UI 访问路径：</b></p>
 * <ul>
 *   <li>Swagger UI 页面：{@code /swagger-ui.html}（重定向到 {@code /swagger-ui/index.html}）</li>
 *   <li>OpenAPI JSON：{@code /v3/api-docs}</li>
 *   <li>OpenAPI YAML：{@code /v3/api-docs.yaml}</li>
 * </ul>
 *
 * <p><b>生产环境安全策略：</b></p>
 * <p>Swagger UI 默认在所有 profile 下开放。生产环境（prod profile）建议通过
 * {@code springdoc.swagger-ui.enabled=false} 关闭，或通过 SecurityConfig 配置
 * {@code /swagger-ui/**} 与 {@code /v3/api-docs/**} 路径仅 ADMIN 角色可访问。</p>
 *
 * <p>当前默认配置：</p>
 * <ul>
 *   <li>开发环境（mock/dev profile）：Swagger UI 完全开放，便于联调</li>
 *   <li>真实环境（real profile）：Swagger UI 开放但接口调用需 JWT 鉴权，
 *       通过 {@code @SecurityRequirement(name = "bearerAuth")} 注解控制</li>
 *   <li>生产部署：建议在 application-prod.yml 中设置
 *       {@code springdoc.swagger-ui.enabled=false} 关闭 Swagger UI</li>
 * </ul>
 *
 * <p><b>JWT 鉴权使用方式：</b></p>
 * <ol>
 *   <li>调用 {@code POST /api/v1/auth/wechat} 或 {@code POST /api/v1/auth/admin/login}
 *       获取 JWT token</li>
 *   <li>点击 Swagger UI 顶部 "Authorize" 按钮，输入 {@code Bearer <token>}</li>
 *   <li>后续所有标注 {@code @SecurityRequirement(name = "bearerAuth")} 的接口
 *       会自动在请求头携带 {@code Authorization: Bearer <token>}</li>
 * </ol>
 */
@Configuration
public class OpenApiConfig {

    /**
     * JWT 鉴权方案名称，与 Controller 上 @SecurityRequirement(name = "bearerAuth") 注解对应。
     */
    public static final String SECURITY_SCHEME_NAME = "bearerAuth";

    /**
     * API 文档标题，可通过环境变量 OPENAPI_TITLE 覆盖。
     */
    @Value("${app.openapi.title:${OPENAPI_TITLE:校园恋爱小程序 API}}")
    private String apiTitle;

    /**
     * API 文档版本，可通过环境变量 OPENAPI_VERSION 覆盖。
     */
    @Value("${app.openapi.version:${OPENAPI_VERSION:0.1.0}}")
    private String apiVersion;

    /**
     * API 文档描述，可通过环境变量 OPENAPI_DESCRIPTION 覆盖。
     */
    @Value("${app.openapi.description:${OPENAPI_DESCRIPTION:校园恋爱小程序后端接口文档，包含认证、匹配、聊天、社区、活动等全部业务接口}}")
    private String apiDescription;

    /**
     * 联系人邮箱，可通过环境变量 OPENAPI_CONTACT_EMAIL 覆盖。
     */
    @Value("${app.openapi.contact.email:${OPENAPI_CONTACT_EMAIL:dev@campuslove.example.com}}")
    private String contactEmail;

    /**
     * 联系人姓名，可通过环境变量 OPENAPI_CONTACT_NAME 覆盖。
     */
    @Value("${app.openapi.contact.name:${OPENAPI_CONTACT_NAME:Campus Love Dev Team}}")
    private String contactName;

    /**
     * API 服务器地址，可通过环境变量 OPENAPI_SERVER_URL 覆盖。
     * <p>未配置时使用空列表，Swagger UI 使用当前请求的 host 作为基础路径，
     * 适用于开发环境与 Swagger UI 与 API 同源部署的场景。</p>
     */
    @Value("${app.openapi.server-url:${OPENAPI_SERVER_URL:}}")
    private String serverUrl;

    /**
     * API 服务器描述，可通过环境变量 OPENAPI_SERVER_DESCRIPTION 覆盖。
     */
    @Value("${app.openapi.server-description:${OPENAPI_SERVER_DESCRIPTION:Campus Love API Server}}")
    private String serverDescription;

    /**
     * 配置 OpenAPI 文档元信息与 JWT 鉴权方案。
     *
     * <p>配置结构：</p>
     * <ol>
     *   <li>{@link Info}：标题、版本、描述、联系人、许可证</li>
     *   <li>{@link SecurityScheme}：JWT Bearer 鉴权方案，名称为 {@value #SECURITY_SCHEME_NAME}</li>
     *   <li>{@link SecurityRequirement}：全局默认鉴权要求，所有接口默认需要 JWT</li>
     *   <li>{@link Server}：API 服务器地址列表</li>
     * </ol>
     *
     * @return 配置好的 {@link OpenAPI} 实例
     */
    @Bean
    public OpenAPI campusLoveOpenAPI() {
        // 1. 构建 API 元信息
        Info info = new Info()
                .title(apiTitle)
                .version(apiVersion)
                .description(apiDescription)
                .contact(new Contact()
                        .name(contactName)
                        .email(contactEmail))
                .license(new License()
                        .name("Proprietary")
                        .url("https://campuslove.example.com/license"));

        // 2. 构建 JWT Bearer 鉴权方案
        // scheme: bearer —— HTTP Bearer 认证
        // bearerFormat: JWT —— 使用 JWT 格式的 token
        // in: header —— 通过 Authorization 请求头传递
        // name: Authorization —— 请求头名称
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .in(SecurityScheme.In.HEADER)
                .name("Authorization")
                .description("JWT Bearer Token 鉴权。调用 POST /api/v1/auth/wechat 或 "
                        + "POST /api/v1/auth/admin/login 获取 token，"
                        + "在此处输入 'Bearer <token>' 即可在 Swagger UI 中调用受保护接口。");

        // 3. 全局默认鉴权要求
        // 所有未显式标注 @SecurityRequirement(omit = true) 的接口默认需要 JWT
        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList(SECURITY_SCHEME_NAME);

        // 4. 构建 OpenAPI 实例
        OpenAPI openAPI = new OpenAPI()
                .info(info)
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, bearerScheme))
                .addSecurityItem(securityRequirement);

        // 5. 添加服务器地址（仅在配置了 server-url 时添加）
        List<Server> servers = new ArrayList<>();
        if (serverUrl != null && !serverUrl.trim().isEmpty()) {
            Server server = new Server()
                    .url(serverUrl.trim())
                    .description(serverDescription);
            servers.add(server);
        }
        // 始终添加本地开发服务器（便于在 Swagger UI 中切换环境）
        Server localServer = new Server()
                .url("http://localhost:8080")
                .description("本地开发环境");
        servers.add(localServer);

        openAPI.setServers(servers);

        return openAPI;
    }
}
