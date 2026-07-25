package com.campuslove.api.auth;

import com.campuslove.api.entity.ThirdPartyAccount;

/**
 * 第三方账号绑定视图（功能2：登录第三方账号）。
 *
 * <p>对外暴露的绑定信息视图，屏蔽 openId / unionId 等敏感字段，
 * 仅暴露 provider / 绑定时间等可展示字段。</p>
 *
 * @param provider    第三方平台标识（WECHAT / APPLE）
 * @param boundAt     绑定时间（ISO-8601 字符串）
 * @param displayLabel 用于前端展示的标签（"微信" / "Apple"）
 */
public record ThirdPartyBindingView(
        String provider,
        String boundAt,
        String displayLabel
) {

    /**
     * 从实体构建视图。
     *
     * @param account 第三方账号实体
     * @return 视图对象
     */
    public static ThirdPartyBindingView from(ThirdPartyAccount account) {
        if (account == null) {
            return null;
        }
        return new ThirdPartyBindingView(
                account.getProvider(),
                account.getCreatedAt() != null ? account.getCreatedAt().toString() : null,
                resolveDisplayLabel(account.getProvider())
        );
    }

    /**
     * 根据 provider 解析展示标签。
     *
     * @param provider 第三方平台标识
     * @return 展示标签（未知 provider 返回 provider 原值）
     */
    private static String resolveDisplayLabel(String provider) {
        if (provider == null) {
            return "";
        }
        return switch (provider) {
            case "WECHAT" -> "微信";
            case "APPLE" -> "Apple";
            default -> provider;
        };
    }
}
