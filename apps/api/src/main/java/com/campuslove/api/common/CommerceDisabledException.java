package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 商业化功能已封存异常（批次 A / ADR-5）。
 *
 * <p>触发场景：付费写端点（下单/开通/充值/扣费/兑换/报名）标注
 * {@code @FeatureSwitch} 且对应开关处于关闭（封存）状态时，由
 * {@code CommerceGuardAspect} 抛出。</p>
 *
 * <p>由 GlobalExceptionHandler 统一映射为 HTTP 403 + 业务错误码
 * {@code COMMERCE_DISABLED}（error 与 code 字段均为本错误码，
 * 便于前端 {@code AppApiError.error} 直接按码静默处理，不弹错误提示）。</p>
 */
public class CommerceDisabledException extends BusinessException {

    /** 标准化业务错误码：商业化功能未开放 */
    public static final String ERROR_CODE = "COMMERCE_DISABLED";

    public CommerceDisabledException(String message) {
        super(HttpStatus.FORBIDDEN, ERROR_CODE, message);
    }
}
