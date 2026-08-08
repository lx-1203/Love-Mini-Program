package com.campuslove.api.clientconfig;

import com.campuslove.api.config.SecurityUtils;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 客户端动态配置控制器（Task 3.6）。
 *
 * <p>提供前端启动期所需的 5 类配置查询接口，替代客户端散落在
 * {@code config/schools.ts} / {@code config/match-form.ts} / {@code config/home-banners.ts}
 * / {@code config/popular-topics.ts} 以及 stores 中硬编码的常量。</p>
 *
 * <p><b>接口列表</b>：</p>
 * <ul>
 *   <li>GET  /api/v1/config/campuses             - 学校列表（Task 3.6.1）</li>
 *   <li>GET  /api/v1/config/match-preferences    - 匹配偏好选项（Task 3.6.2）</li>
 *   <li>GET  /api/v1/config/filter-options       - 筛选选项（活动类型/论坛版块/校园话题分类，Task 3.6.3）</li>
 *   <li>GET  /api/v1/config/hero-banners         - Hero Banner（Task 3.6.4）</li>
 *   <li>GET  /api/v1/config/unlock-guide-steps   - 解锁引导步骤文案（Task 3.6.5）</li>
 * </ul>
 *
 * <p><b>鉴权要求</b>：所有端点需要登录用户（{@code /api/v1/**} 默认 authenticated()，
 * 详见 SecurityConfig / MockSecurityConfig），不要求 ADMIN 角色。
 * 通过 {@link SecurityUtils#getCurrentUserId()} 触发鉴权校验，未登录时返回 401。</p>
 *
 * <p><b>缓存策略</b>：响应缓存 5 分钟（{@link com.campuslove.api.config.CacheNames#CLIENT_CONFIG}），
 * 由 {@link ConfigService} 实现层的 {@code @Cacheable} 注解控制，
 * 所有登录用户共享缓存以最大化命中率。</p>
 *
 * <p><b>响应格式</b>：直接返回视图列表（与 {@link com.campuslove.api.growth.AppConfigController}
 * 保持一致，便于客户端 {@code services/config.ts} 直接消费，无需额外解包 ApiResponse）。</p>
 */
@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    private final ConfigService configService;

    /** R4-00341：法律文本提供者（联系方式配置注入，避免假邮箱/占位热线） */
    private final LegalTextProvider legalTextProvider;

    public ConfigController(ConfigService configService, LegalTextProvider legalTextProvider) {
        this.configService = configService;
        this.legalTextProvider = legalTextProvider;
    }

    /**
     * 获取学校列表（Task 3.6.1）。
     *
     * @return 学校视图列表
     */
    @GetMapping("/campuses")
    public ResponseEntity<List<CampusView>> getCampuses() {
        // 触发鉴权校验：未登录用户将收到 401（由 JwtAuthenticationEntryPoint 处理）
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.loadCampuses());
    }

    /**
     * 获取匹配偏好选项列表（Task 3.6.2）。
     *
     * @return 匹配偏好选项列表
     */
    @GetMapping("/match-preferences")
    public ResponseEntity<List<MatchPreferenceOptionView>> getMatchPreferences() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.loadMatchPreferences());
    }

    /**
     * 获取筛选选项列表（Task 3.6.3）。
     *
     * @return 筛选选项列表（包含多个维度）
     */
    @GetMapping("/filter-options")
    public ResponseEntity<List<FilterOptionView>> getFilterOptions() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.loadFilterOptions());
    }

    /**
     * 获取 Hero Banner 列表（Task 3.6.4）。
     *
     * @return Hero Banner 视图列表
     */
    @GetMapping("/hero-banners")
    public ResponseEntity<List<HeroBannerView>> getHeroBanners() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.loadHeroBanners());
    }

    /**
     * 获取解锁引导步骤文案列表（Task 3.6.5）。
     *
     * @return 解锁引导步骤视图列表
     */
    @GetMapping("/unlock-guide-steps")
    public ResponseEntity<List<UnlockGuideStepView>> getUnlockGuideSteps() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.loadUnlockGuideSteps());
    }

    /**
     * 获取法律文本（P0-22）。
     *
     * <p>客户端调用路径为 {@code /v1/config/legal}（normalizeApiPath 自动补 /v1，
     * 后端 base 为 /api/v1），本端点映射 {@code /config/legal} 即可命中。
     * 登录前（注册页/登录页）即需要展示条款，因此该端点在 SecurityConfig 中
     * 标记为 permitAll，不要求携带鉴权头。</p>
     *
     * @param type 文本类型：privacy_policy / user_agreement
     * @return 法律文本视图（title / content / updatedAt）
     */
    @GetMapping("/legal")
    public ResponseEntity<LegalTextView> getLegalText(
            @RequestParam("type") String type) {
        return ResponseEntity.ok(legalTextProvider.getLegalText(type));
    }
}
