package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 数据库凭据启动校验器。
 *
 * <p>在非 mock profile（即使用真实数据库）下启动时，校验 DB_URL / DB_USERNAME / DB_PASSWORD
 * 等环境变量已正确配置。校验失败时抛出 {@link IllegalStateException} 拒绝启动，
 * 避免因凭据缺失导致运行时连接异常或使用不安全默认值。</p>
 *
 * <p>mock profile 排除了 DataSourceAutoConfiguration，不依赖外部数据库，因此不激活此校验器。</p>
 */
@Component
@Profile("!mock")
public class DatabaseConfigValidator {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfigValidator.class);

    /** 数据库连接密码，由环境变量 DB_PASSWORD 提供 */
    @Value("${spring.datasource.password:}")
    private String dbPassword;

    /** 数据库用户名，由环境变量 DB_USERNAME 提供 */
    @Value("${spring.datasource.username:}")
    private String dbUsername;

    /** 数据库连接 URL，由环境变量 DB_URL 提供 */
    @Value("${spring.datasource.url:}")
    private String dbUrl;

    /**
     * 启动后校验数据库凭据完整性。
     * 任一凭据为空将抛出 {@link IllegalStateException} 阻止应用启动。
     */
    @PostConstruct
    public void validate() {
        if (dbUrl == null || dbUrl.isBlank()) {
            throw new IllegalStateException(
                    "DB_URL 环境变量未配置，应用启动失败。"
                    + "请在环境中配置 DB_URL 以提供数据库连接地址。");
        }
        if (dbUsername == null || dbUsername.isBlank()) {
            throw new IllegalStateException(
                    "DB_USERNAME 环境变量未配置，应用启动失败。"
                    + "请在环境中配置 DB_USERNAME 以提供数据库用户名。");
        }
        if (dbPassword == null || dbPassword.isBlank()) {
            throw new IllegalStateException(
                    "DB_PASSWORD 环境变量未配置，应用启动失败。"
                    + "请在环境中配置 DB_PASSWORD 以提供数据库访问密码。");
        }
        log.info("数据库凭据校验通过: username={}, host={}", dbUsername, extractHost(dbUrl));
    }

    /**
     * 从 JDBC URL 中提取 host:port 部分，用于日志记录。
     * 避免在日志中暴露完整 URL（可能含凭据）。
     *
     * @param url JDBC 连接 URL
     * @return host:port 字符串，解析失败时返回 "unknown"
     */
    private String extractHost(String url) {
        if (url == null) {
            return "unknown";
        }
        int schemeEnd = url.indexOf("://");
        if (schemeEnd < 0) {
            return "unknown";
        }
        String rest = url.substring(schemeEnd + 3);
        int slash = rest.indexOf('/');
        return slash > 0 ? rest.substring(0, slash) : rest;
    }

    // === 测试用 setter（包级可见，便于单元测试注入） ===

    void setDbPassword(String dbPassword) {
        this.dbPassword = dbPassword;
    }

    void setDbUsername(String dbUsername) {
        this.dbUsername = dbUsername;
    }

    void setDbUrl(String dbUrl) {
        this.dbUrl = dbUrl;
    }
}