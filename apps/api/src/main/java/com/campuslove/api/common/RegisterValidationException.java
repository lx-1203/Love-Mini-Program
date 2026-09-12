package com.campuslove.api.common;

import org.springframework.http.HttpStatus;

/**
 * 注册业务校验异常。
 *
 * <p>触发场景：注册链路（{@code RealAuthService.registerUser}）中的可预期业务拒绝——
 * 手机号格式非法、验证码缺失/错误、密码长度非法、昵称长度非法、手机号已注册等。</p>
 *
 * <p>背景（2026-09-12 注册页联调）：这些校验原先抛 {@link IllegalArgumentException}，
 * 生产 profile 下被 GlobalExceptionHandler 统一脱敏为「请求参数错误」（R4-00283），
 * 客户端无法按错误码做字段级定位（验证码错误 → 验证码框红、手机号已注册 → 出现登录出口）。
 * 本异常继承 {@link BusinessException}，errorCode 取 ErrorMessages 常量（用户面文案，
 * 不含内部实现细节），不违背 R4-00283 的脱敏意图。</p>
 *
 * <p>响应：</p>
 * <ul>
 *   <li>HTTP 400 Bad Request</li>
 *   <li>code / message：均为 ErrorMessages 用户面文案（如 {@code SMS_CODE_INVALID}）</li>
 * </ul>
 */
public class RegisterValidationException extends BusinessException {

    private static final long serialVersionUID = 1L;

    /**
     * 构造注册业务校验异常。
     *
     * @param userFacingCode ErrorMessages 用户面文案，同时作为标准化业务错误码
     *                       （如 {@code SMS_CODE_INVALID} / {@code PHONE_ALREADY_REGISTERED}）
     */
    public RegisterValidationException(String userFacingCode) {
        super(HttpStatus.BAD_REQUEST, userFacingCode, userFacingCode);
    }
}
