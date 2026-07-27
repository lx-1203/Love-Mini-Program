package com.campuslove.api.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * 微信小程序登录请求体。
 *
 * <p>由前端 {@code services/auth.ts} 在调用 {@code wx.login()} 获取临时 code 后，
 * 通过 POST {@code /api/v1/auth/wechat} 提交到此端点。</p>
 *
 * @param code 微信小程序临时登录凭证（不可为空），由 wx.login() 返回，5 分钟有效
 */
public record WechatLoginRequest(@NotBlank String code) {
}
