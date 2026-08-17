package com.campuslove.api.profile;

import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 主页配置端点（real 专属）。读取 app_config 中 key=profile.config 的配置，
 * 缺失时返回默认运营配置。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/profile/config")
public class ProfileConfigController {

    private static final String CONFIG_KEY = "profile.config";

    private final AdminAppConfigRepository configRepository;
    private final ObjectMapper objectMapper;

    public ProfileConfigController(AdminAppConfigRepository configRepository, ObjectMapper objectMapper) {
        this.configRepository = configRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ProfileConfigView getProfileConfig() {
        Optional<AdminAppConfig> config = configRepository.findByConfigKey(CONFIG_KEY);
        if (config.isPresent() && config.get().getConfigValue() != null) {
            try {
                return objectMapper.readValue(config.get().getConfigValue(), ProfileConfigView.class);
            } catch (Exception ignored) {
                // 配置解析失败时回退默认值
            }
        }
        return new ProfileConfigView(true, true, true, 6, 90);
    }
}
