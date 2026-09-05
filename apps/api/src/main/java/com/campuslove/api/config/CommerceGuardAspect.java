package com.campuslove.api.config;

import com.campuslove.api.common.CommerceDisabledException;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 商业化功能开关拦截切面（批次 A / A1 / ADR-3）。
 *
 * <p>拦截所有标注 {@link FeatureSwitch} 的端点（方法级或类级）：
 * 对应开关处于封存态时抛出 {@link CommerceDisabledException}，
 * 由 GlobalExceptionHandler 统一转换为 HTTP 403 + {@code COMMERCE_DISABLED}。</p>
 *
 * <p>判定逻辑委托 {@link FeatureSwitchService}（总闸 + 子闸与运算，
 * 缺省一律 false 封存态，ADR-2）。mock / real 双 profile 均生效：
 * mock 下无开关数据源，天然全封存。</p>
 *
 * <p>恢复开关零代码变更：后台把对应 key 置 true 即放行。</p>
 */
@Aspect
@Component
public class CommerceGuardAspect {

    private static final Logger log = LoggerFactory.getLogger(CommerceGuardAspect.class);

    private final FeatureSwitchService featureSwitchService;

    public CommerceGuardAspect(FeatureSwitchService featureSwitchService) {
        this.featureSwitchService = featureSwitchService;
    }

    /**
     * 环绕拦截：开关开启 → 放行；关闭 → 抛 CommerceDisabledException。
     *
     * <p>切入点同时覆盖方法级与类级注解（{@code @annotation} / {@code @within}），
     * 参数绑定 {@code featureSwitch} 提供注解实例。</p>
     *
     * @param joinPoint     连接点
     * @param featureSwitch 命中的开关注解
     * @return 原方法返回值（放行时）
     * @throws Throwable 开关封存时抛 CommerceDisabledException；放行时透传原异常
     */
    @Around("@within(featureSwitch) || @annotation(featureSwitch)")
    public Object guard(ProceedingJoinPoint joinPoint, FeatureSwitch featureSwitch) throws Throwable {
        if (featureSwitchService.isCommerceEnabled(featureSwitch.value())) {
            return joinPoint.proceed();
        }
        log.info("商业化开关处于封存态，拦截写请求: switch={}, endpoint={}",
                featureSwitch.value(), joinPoint.getSignature().toShortString());
        throw new CommerceDisabledException("功能未开放");
    }
}
