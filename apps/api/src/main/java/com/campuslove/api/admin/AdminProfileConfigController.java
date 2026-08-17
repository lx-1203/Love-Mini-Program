package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.profile.ProfileConfigView;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 主页运营配置（profile.config）。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/profile-config")
@PreAuthorize("hasRole('ADMIN')")
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
        config.setUpdatedAt(LocalDateTime.now());
        configRepository.save(config);
        return view;
    }
}
