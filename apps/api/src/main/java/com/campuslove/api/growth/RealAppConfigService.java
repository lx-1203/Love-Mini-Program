package com.campuslove.api.growth;

import com.campuslove.api.entity.AdminAppRule;
import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.entity.AppLoginHeroConfig;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.AdminAppRuleRepository;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import com.campuslove.api.repository.AppLoginHeroConfigRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

/**
 * 真实应用配置服务实现。
 * 在 real profile 下激活，从数据库 app_login_hero_config 表读取配置。
 * 当数据库无配置或查询异常时，返回内置默认值以保证服务可用。
 */
@Profile("real")
@Service
public class RealAppConfigService implements AppConfigService {

    private static final Logger log = LoggerFactory.getLogger(RealAppConfigService.class);

    /** 默认场景标识，与数据库迁移脚本中的 seed 数据一致 */
    private static final String DEFAULT_SCENE_KEY = "default";

    /** 默认主视觉模式 */
    private static final String DEFAULT_HERO_MODE = "animation";

    /** 默认动画主题 */
    private static final String DEFAULT_HERO_ANIMATION_THEME = "romantic";

    /** 默认主标题 */
    private static final String DEFAULT_HERO_TITLE = "遇见对的人";

    /** 默认副标题 */
    private static final String DEFAULT_HERO_SUBTITLE = "校园恋爱，从这里开始";

    /** 默认视频失败时是否回退到动画 */
    private static final boolean DEFAULT_VIDEO_FALLBACK = true;

    /* ============ B6：客户端配置聚合默认值（与 Flyway seed 一致） ============ */

    /** 站点标题配置键（app_config 表） */
    private static final String CONFIG_KEY_SITE_TITLE = "site.title";

    /** 默认站点标题（app_config 无数据 / 查询异常时降级） */
    private static final String DEFAULT_SITE_TITLE = "校园恋爱";

    /** 功能开关默认值：维护模式默认关闭，其余默认开启（与 V2026.06.25.0005 seed 一致） */
    private static final Map<String, Boolean> DEFAULT_SWITCHES = defaultSwitches();

    /** 业务规则默认值：与 V2026.06.25.0005 seed 一致 */
    private static final Map<String, Integer> DEFAULT_RULES = defaultRules();

    private final AppLoginHeroConfigRepository heroConfigRepository;
    private final AdminAppSwitchRepository switchRepository;
    private final AdminAppRuleRepository ruleRepository;
    private final AdminAppConfigRepository configRepository;

    /**
     * 构造注入登录主视觉配置 Repository 与 B6 配置表 Repository。
     *
     * @param heroConfigRepository 登录主视觉配置数据访问层
     * @param switchRepository     功能开关表数据访问层（app_switch）
     * @param ruleRepository       业务规则表数据访问层（app_rule）
     * @param configRepository     系统参数表数据访问层（app_config）
     */
    public RealAppConfigService(
            AppLoginHeroConfigRepository heroConfigRepository,
            AdminAppSwitchRepository switchRepository,
            AdminAppRuleRepository ruleRepository,
            AdminAppConfigRepository configRepository) {
        this.heroConfigRepository = heroConfigRepository;
        this.switchRepository = switchRepository;
        this.ruleRepository = ruleRepository;
        this.configRepository = configRepository;
    }

    /**
     * 获取登录主视觉配置。
     * 优先从数据库读取 scene_key='default' 且 is_active=true 的配置行；
     * 若数据库无配置或查询异常，则返回内置默认值。
     *
     * @return 登录主视觉配置视图
     */
    @Override
    public LoginHeroConfigView getLoginHeroConfig() {
        try {
            // 从数据库查询默认场景下的激活配置
            var optionalConfig = heroConfigRepository.findBySceneKeyAndIsActive(
                    DEFAULT_SCENE_KEY, true);

            if (optionalConfig.isPresent()) {
                AppLoginHeroConfig config = optionalConfig.orElseThrow(() ->
                        new IllegalStateException("optionalConfig 已确认非空但 orElseThrow 触发，数据不一致"));
                log.debug("从数据库读取到登录主视觉配置: sceneKey={}, heroMode={}",
                        config.getSceneKey(), config.getHeroMode());
                return mapToView(config);
            }

            // 数据库无激活配置，返回默认值
            log.info("数据库中未找到 scene_key='{}' 的激活配置，使用内置默认值", DEFAULT_SCENE_KEY);
            return buildDefaultConfig();

        } catch (DataAccessException e) {
            // 数据库查询异常时降级为默认配置，避免影响登录页正常展示
            log.error("查询登录主视觉配置失败，降级使用默认配置", e);
            return buildDefaultConfig();
        }
    }

    /**
     * 获取客户端配置聚合视图（B6）。
     *
     * <p>读取 app_switch / app_rule / app_config 三张表聚合：
     * <ul>
     *   <li>开关以内置默认值为底，DB 行按 key 覆盖（缺失的开关视为开启）；</li>
     *   <li>规则以内置默认值为底，DB 行按规则名覆盖（解析失败保留默认值）；</li>
     *   <li>站点标题读取 app_config.site.title，缺失时使用默认值。</li>
     * </ul>
     * 不缓存，管理后台更新后客户端下一次拉取即可生效。
     * 查询异常时整体降级为内置默认值，保证客户端首屏可用。</p>
     *
     * @return 客户端配置聚合视图
     */
    @Override
    public AppConfigView getClientConfig() {
        try {
            Map<String, Boolean> switches = new LinkedHashMap<>(DEFAULT_SWITCHES);
            for (AdminAppSwitch sw : switchRepository.findAll()) {
                if (sw.getSwitchKey() != null) {
                    switches.put(sw.getSwitchKey(), Boolean.TRUE.equals(sw.getEnabled()));
                }
            }

            Map<String, Integer> rules = new LinkedHashMap<>(DEFAULT_RULES);
            for (AdminAppRule rule : ruleRepository.findAll()) {
                if (rule.getRuleName() != null) {
                    Integer parsed = parseRuleValue(rule);
                    if (parsed != null) {
                        rules.put(rule.getRuleName(), parsed);
                    }
                }
            }

            String siteTitle = DEFAULT_SITE_TITLE;
            var siteTitleConfig = configRepository.findByConfigKey(CONFIG_KEY_SITE_TITLE);
            if (siteTitleConfig.isPresent()) {
                String value = siteTitleConfig.get().getConfigValue();
                if (value != null && !value.isBlank()) {
                    siteTitle = value;
                }
            }

            return new AppConfigView(switches, rules, siteTitle);
        } catch (DataAccessException e) {
            // 数据库查询异常时降级为默认配置，避免影响客户端首屏
            log.error("查询客户端配置聚合失败，降级使用默认配置", e);
            return new AppConfigView(
                    new LinkedHashMap<>(DEFAULT_SWITCHES),
                    new LinkedHashMap<>(DEFAULT_RULES),
                    DEFAULT_SITE_TITLE);
        }
    }

    /**
     * 查询功能开关是否开启（B6 强制点）。
     *
     * <p>从 app_switch 表按 key 查询；开关缺失或查询异常时默认视为开启（true），
     * 保证后端各强制点在配置表不完整时不会误伤正常功能。</p>
     *
     * @param switchKey 开关键
     * @return true=开启；false=关闭
     */
    @Override
    public boolean isSwitchEnabled(String switchKey) {
        try {
            return switchRepository.findBySwitchKey(switchKey)
                    .map(AdminAppSwitch::getEnabled)
                    .orElse(Boolean.TRUE);
        } catch (DataAccessException e) {
            // 查询异常时默认开启，避免数据库抖动导致业务被误拦截
            log.warn("查询功能开关失败，默认视为开启: switchKey={}", switchKey, e);
            return true;
        }
    }

    /**
     * 解析规则表达式的整数数值。
     * 解析失败（非数值 / 超范围）返回 null，由调用方保留默认值。
     *
     * @param rule 规则实体
     * @return 解析后的整数值；失败返回 null
     */
    private Integer parseRuleValue(AdminAppRule rule) {
        String expression = rule.getRuleExpression();
        if (expression == null || expression.isBlank() || !Boolean.TRUE.equals(rule.getEnabled())) {
            return null;
        }
        try {
            return Integer.parseInt(expression.trim());
        } catch (NumberFormatException e) {
            log.warn("业务规则表达式非整数，忽略该行: ruleName={}, expression={}",
                    rule.getRuleName(), expression);
            return null;
        }
    }

    /**
     * 内置功能开关默认值（与 V2026.06.25.0005 seed 保持一致）。
     */
    private static Map<String, Boolean> defaultSwitches() {
        Map<String, Boolean> map = new LinkedHashMap<>();
        map.put(SWITCH_MAINTENANCE_MODE, Boolean.FALSE);
        map.put(SWITCH_REGISTER_OPEN, Boolean.TRUE);
        map.put(SWITCH_LOGIN_OPEN, Boolean.TRUE);
        map.put(SWITCH_MATCH_OPEN, Boolean.TRUE);
        map.put(SWITCH_RECOMMEND_OPEN, Boolean.TRUE);
        map.put(SWITCH_POST_PUBLISH_OPEN, Boolean.TRUE);
        map.put(SWITCH_FEEDBACK_OPEN, Boolean.TRUE);
        return map;
    }

    /**
     * 内置业务规则默认值（与 V2026.06.25.0005 seed 保持一致）。
     */
    private static Map<String, Integer> defaultRules() {
        Map<String, Integer> map = new LinkedHashMap<>();
        map.put(RULE_DAILY_RECOMMEND_LIMIT, 10);
        map.put(RULE_HEART_SIGNAL_EXPIRE_HOURS, 48);
        return map;
    }

    /**
     * 将数据库实体映射为视图对象。
     * 数据库表中无 video_fallback_to_animation 列，
     * 该字段根据 heroMode 推导：video 模式下默认回退到 animation，animation 模式下无意义但仍设为 true。
     *
     * @param config 数据库实体
     * @return 视图对象
     */
    private LoginHeroConfigView mapToView(AppLoginHeroConfig config) {
        // R4-00355：移除恒同值三元表达式（两分支均为 DEFAULT_VIDEO_FALLBACK 的死代码），
        // 直接赋值；video 模式回退动画策略当前统一为默认值
        boolean videoFallback = DEFAULT_VIDEO_FALLBACK;

        return new LoginHeroConfigView(
                config.getHeroMode(),
                config.getHeroVideoUrl(),
                config.getHeroPosterUrl(),
                config.getHeroAnimationTheme(),
                config.getHeroTitle(),
                config.getHeroSubtitle(),
                videoFallback
        );
    }

    /**
     * 构建内置默认配置。
     * 当数据库无数据或查询异常时使用，保证登录页始终可用。
     *
     * @return 默认登录主视觉配置视图
     */
    private LoginHeroConfigView buildDefaultConfig() {
        return new LoginHeroConfigView(
                DEFAULT_HERO_MODE,
                null,                           // heroVideoUrl: 默认无视频
                null,                           // heroPosterUrl: 默认无海报
                DEFAULT_HERO_ANIMATION_THEME,
                DEFAULT_HERO_TITLE,
                DEFAULT_HERO_SUBTITLE,
                DEFAULT_VIDEO_FALLBACK
        );
    }
}
