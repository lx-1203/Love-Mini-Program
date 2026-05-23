package com.campuslove.api.config;

/**
 * 后端显示文案常量类。
 * 统一管理所有散落在各 Service 中的硬编码中文文案，
 * 避免同一文案在不同位置出现不一致的情况。
 */
public final class DisplayConstants {

    /** 用户信息缺失时的默认显示名称 */
    public static final String UNKNOWN_USER = "未知用户";

    /** 新注册用户的默认昵称 */
    public static final String NEW_USER = "新用户";

    /** 匿名回答时的显示名称 */
    public static final String ANONYMOUS_USER = "匿名用户";

    private DisplayConstants() {
        // 禁止实例化
    }
}
