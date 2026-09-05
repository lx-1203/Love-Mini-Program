package com.campuslove.api.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 商业化功能开关拦截注解（批次 A / ADR-3）。
 *
 * <p>贴在付费写端点（下单/开通/充值/扣费/兑换/报名）方法或 Controller 类上，
 * 由 {@link CommerceGuardAspect} 切面统一拦截：对应开关关闭时抛出
 * {@link com.campuslove.api.common.CommerceDisabledException}，
 * 由 GlobalExceptionHandler 转换为 HTTP 403 + 业务错误码 {@code COMMERCE_DISABLED}。</p>
 *
 * <p>使用示例：</p>
 * <pre>{@code
 * @PostMapping("/purchase")
 * @FeatureSwitch(FeatureSwitchKeys.COMMERCE_VIP)
 * public PurchaseResultView purchase(...) { ... }
 * }</pre>
 *
 * <p>约定：只拦截写操作；列表/详情查询端点保留（避免前端白屏）。
 * 开关缺省值一律为 false（封存态，ADR-2），判定逻辑见 {@link FeatureSwitchService}。</p>
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface FeatureSwitch {

    /**
     * 功能开关 key（{@link FeatureSwitchKeys} 常量，对应 app_switch.switch_key）。
     *
     * @return 开关 key
     */
    String value();
}
