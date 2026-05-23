package com.campuslove.api.growth;

import com.campuslove.api.entity.AppLoginHeroConfig;
import com.campuslove.api.repository.AppLoginHeroConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
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

    private final AppLoginHeroConfigRepository heroConfigRepository;

    /**
     * 构造注入登录主视觉配置 Repository。
     *
     * @param heroConfigRepository 登录主视觉配置数据访问层
     */
    public RealAppConfigService(AppLoginHeroConfigRepository heroConfigRepository) {
        this.heroConfigRepository = heroConfigRepository;
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
                AppLoginHeroConfig config = optionalConfig.get();
                log.debug("从数据库读取到登录主视觉配置: sceneKey={}, heroMode={}",
                        config.getSceneKey(), config.getHeroMode());
                return mapToView(config);
            }

            // 数据库无激活配置，返回默认值
            log.info("数据库中未找到 scene_key='{}' 的激活配置，使用内置默认值", DEFAULT_SCENE_KEY);
            return buildDefaultConfig();

        } catch (Exception e) {
            // 数据库查询异常时降级为默认配置，避免影响登录页正常展示
            log.error("查询登录主视觉配置失败，降级使用默认配置", e);
            return buildDefaultConfig();
        }
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
        // 当 heroMode 为 video 时，视频加载失败应回退到 animation；其他模式默认为 true
        boolean videoFallback = "video".equalsIgnoreCase(config.getHeroMode())
                ? DEFAULT_VIDEO_FALLBACK
                : DEFAULT_VIDEO_FALLBACK;

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
