package com.campuslove.api.growth;

/**
 * 应用配置服务接口。
 * 提供登录主视觉配置、客户端配置聚合与功能开关查询等功能。
 */
public interface AppConfigService {

    /* ============ 功能开关 Key（与 app_switch 表 seed 一致） ============ */

    /** 系统维护模式开关（true=维护中，客户端展示维护遮罩） */
    String SWITCH_MAINTENANCE_MODE = "maintenance_mode";

    /** 注册功能开关（false=关闭注册入口） */
    String SWITCH_REGISTER_OPEN = "register_open";

    /** 登录功能开关（false=关闭登录入口） */
    String SWITCH_LOGIN_OPEN = "login_open";

    /** 匹配功能开关（false=关闭匹配/推荐能力） */
    String SWITCH_MATCH_OPEN = "match_open";

    /** 推荐功能开关（false=关闭推荐流） */
    String SWITCH_RECOMMEND_OPEN = "recommend_open";

    /** 发帖功能开关（false=关闭发帖入口） */
    String SWITCH_POST_PUBLISH_OPEN = "post_publish_open";

    /** 反馈功能开关（false=关闭反馈入口） */
    String SWITCH_FEEDBACK_OPEN = "feedback_open";

    /* ============ 业务规则 Key（与 app_rule 表 seed 一致） ============ */

    /** 每日推荐数量上限规则名 */
    String RULE_DAILY_RECOMMEND_LIMIT = "daily_recommend_limit";

    /** 心动信号过期小时数规则名 */
    String RULE_HEART_SIGNAL_EXPIRE_HOURS = "heart_signal_expire_hours";

    /**
     * 获取登录主视觉配置。
     *
     * @return 登录主视觉配置视图
     */
    LoginHeroConfigView getLoginHeroConfig();

    /**
     * 获取客户端配置聚合视图（B6）。
     *
     * <p>读取 app_switch / app_rule / app_config 三张表并聚合成扁平视图，
     * 供小程序端启动期拉取以驱动维护模式 / 功能开关等 UI 状态。
     * 不缓存（或实现内短 TTL），保证管理后台更新后尽快生效。</p>
     *
     * @return 客户端配置聚合视图
     */
    AppConfigView getClientConfig();

    /**
     * 查询功能开关是否开启（B6 强制点）。
     *
     * <p>供后端各业务强制点（发帖 / 登录 / 注册 / 推荐等）统一调用，
     * 与 {@link #getClientConfig()} 同一数据源，保证前后端口径一致。
     * 开关缺失或查询异常时默认视为开启（true），保证服务可用性。</p>
     *
     * @param switchKey 开关键（如 {@link #SWITCH_POST_PUBLISH_OPEN}）
     * @return true=开启；false=关闭
     */
    boolean isSwitchEnabled(String switchKey);
}
