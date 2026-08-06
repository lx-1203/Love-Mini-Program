package com.campuslove.api.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 管理员 OpenID 启动校验器。
 *
 * <p>infra R2-00008：修复"幽灵管理员"风险——Flyway 初始化管理员迁移
 * (V2026.06.25.0001__add_user_role_and_init_admin.sql) 使用占位符
 * {@code __admin_openid__} 插入 ADMIN 账号，而 application-db.yml 的默认值
 * 为 {@code admin-default-openid-change-me}。若生产环境忘记配置 ADMIN_OPENID，
 * 将创建一个 openid 完全可预测的 ADMIN 账号，配合第三方登录链路可被冒用。</p>
 *
 * <p>本校验器在 real profile 下启动时检查 ADMIN_OPENID：
 * <ul>
 *   <li>为空或等于已知默认占位值 → 拒绝启动（fail-fast）</li>
 *   <li>长度 ≥ 16 且非占位值 → 通过</li>
 * </ul>
 * mock profile 不激活（无真实账号体系）。</p>
 */
@Component
@Profile("!mock")
public class AdminOpenidValidator {

    private static final Logger log = LoggerFactory.getLogger(AdminOpenidValidator.class);

    /** application-db.yml 中的默认占位值,生产环境禁止使用 */
    private static final String DEFAULT_PLACEHOLDER_OPENID = "admin-default-openid-change-me";

    @Value("${spring.flyway.placeholders.admin_openid:}")
    private String adminOpenid;

    @Value("${app.admin.strict-openid:true}")
    private boolean strictOpenid;

    @PostConstruct
    public void validate() {
        boolean unsafe = adminOpenid == null || adminOpenid.isBlank()
                || DEFAULT_PLACEHOLDER_OPENID.equals(adminOpenid)
                || adminOpenid.length() < 16;
        if (!unsafe) {
            log.info("管理员 OpenID 校验通过");
            return;
        }
        String msg = "ADMIN_OPENID 未配置或仍为默认占位值（admin-default-openid-change-me），"
                + "将创建可预测的 ADMIN 账号，存在被冒用风险。"
                + "请通过环境变量 ADMIN_OPENID 配置真实微信 OpenID（长度 ≥ 16）。"
                + "开发环境可通过 APP_ADMIN_STRICT_OPENID=false 临时关闭此校验。";
        if (strictOpenid) {
            throw new IllegalStateException(msg);
        }
        log.warn(msg);
    }

    // === 测试用 setter ===
    void setAdminOpenid(String openid) {
        this.adminOpenid = openid;
    }

    void setStrictOpenid(boolean strict) {
        this.strictOpenid = strict;
    }
}
