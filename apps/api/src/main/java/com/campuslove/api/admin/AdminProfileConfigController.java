package com.campuslove.api.admin;

import com.campuslove.api.config.CacheNames;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.profile.ProfileConfigView;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.campuslove.api.common.TimeZones;

/**
 * 管理后台 - 主页运营配置（profile.config）。
 *
 * <p>写路径必须自己失效 {@code system_config} 的 {@code 'all'} 键：本类直接
 * {@code configRepository.save(...)} 改 {@code app_config}，绕开了
 * {@link RealAdminConfigService}（{@code listConfigs()} 的 {@code @Cacheable} 在那一侧，TTL 30 分钟）。
 * 缺这道失效时，保存成功、GET 本端点也能看到新值——但配置列表页读的是缓存，
 * 运营改完最长 30 分钟仍显示旧配置。RedisCacheManager 走 {@code transactionAware()}，
 * 所以失效被推迟到事务提交之后，不留"先清缓存、旧值又被并发读回填"的窗口。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/profile-config")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class AdminProfileConfigController {

    private static final String CONFIG_KEY = "profile.config";

    private final AdminAppConfigRepository configRepository;
    private final ObjectMapper objectMapper;

    public AdminProfileConfigController(AdminAppConfigRepository configRepository, ObjectMapper objectMapper) {
        this.configRepository = configRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ProfileConfigView get() {
        AdminAppConfig config = configRepository.findByConfigKey(CONFIG_KEY).orElse(null);
        if (config != null && config.getConfigValue() != null) {
            try {
                return objectMapper.readValue(config.getConfigValue(), ProfileConfigView.class);
            } catch (Exception ignored) {
                // fallback default
            }
        }
        return new ProfileConfigView(true, true, true, 6, 90);
    }

    @PutMapping
    @Transactional
    @CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'all'")
    public ProfileConfigView save(@RequestBody ProfileConfigView view) {
        AdminAppConfig config = configRepository.findByConfigKey(CONFIG_KEY).orElseGet(() -> {
            AdminAppConfig created = new AdminAppConfig();
            created.setConfigKey(CONFIG_KEY);
            created.setDescription("个人主页运营配置（Profile Config）");
            return created;
        });
        try {
            config.setConfigValue(objectMapper.writeValueAsString(view));
        } catch (Exception e) {
            throw new IllegalStateException("配置序列化失败", e);
        }
        config.setUpdatedBy(SecurityUtils.getCurrentUserId());
        config.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        configRepository.save(config);
        return view;
    }
}
