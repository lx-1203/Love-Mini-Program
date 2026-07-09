package com.campuslove.api.admin;

import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.entity.AdminAppRule;
import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.AdminAppRuleRepository;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 管理后台 - 系统配置服务真实实现。
 * 在 real profile 下激活，从数据库 app_config / app_rule / app_switch 表读写配置。
 *
 * <p>实现要点：
 * <ul>
 *     <li>更新操作使用事务保证一致性</li>
 *     <li>更新时记录操作者用户ID（updated_by）</li>
 *     <li>查询异常或目标不存在时抛出 IllegalArgumentException，由 Controller 转换为 400 响应</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealAdminConfigService implements AdminConfigService {

    private final AdminAppConfigRepository configRepository;
    private final AdminAppRuleRepository ruleRepository;
    private final AdminAppSwitchRepository switchRepository;

    public RealAdminConfigService(
            AdminAppConfigRepository configRepository,
            AdminAppRuleRepository ruleRepository,
            AdminAppSwitchRepository switchRepository) {
        this.configRepository = configRepository;
        this.ruleRepository = ruleRepository;
        this.switchRepository = switchRepository;
    }

    @Override
    public List<AdminConfigView> listConfigs() {
        return configRepository.findAll().stream()
                .map(this::toConfigView)
                .toList();
    }

    @Override
    @Transactional
    public AdminConfigView updateConfig(String key, String value, String description, Long operatorId) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("配置键不能为空");
        }
        if (value == null) {
            throw new IllegalArgumentException("配置值不能为空");
        }

        AdminAppConfig config = configRepository.findByConfigKey(key)
                .orElseThrow(() -> new IllegalArgumentException("配置项不存在: " + key));

        config.setConfigValue(value);
        if (description != null) {
            config.setDescription(description);
        }
        config.setUpdatedBy(operatorId);
        config.setUpdatedAt(LocalDateTime.now());

        AdminAppConfig saved = configRepository.save(config);
        return toConfigView(saved);
    }

    @Override
    public List<AdminRuleView> listRules() {
        return ruleRepository.findAll().stream()
                .map(this::toRuleView)
                .toList();
    }

    @Override
    @Transactional
    public AdminRuleView updateRule(Long id, String expression, Boolean enabled, String description, Long operatorId) {
        if (id == null) {
            throw new IllegalArgumentException("规则 ID 不能为空");
        }

        AdminAppRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("规则不存在: id=" + id));

        if (expression != null) {
            rule.setRuleExpression(expression);
        }
        if (enabled != null) {
            rule.setEnabled(enabled);
        }
        if (description != null) {
            rule.setDescription(description);
        }
        rule.setUpdatedBy(operatorId);
        rule.setUpdatedAt(LocalDateTime.now());

        AdminAppRule saved = ruleRepository.save(rule);
        return toRuleView(saved);
    }

    @Override
    public List<AdminSwitchView> listSwitches() {
        return switchRepository.findAll().stream()
                .map(this::toSwitchView)
                .toList();
    }

    @Override
    @Transactional
    public AdminSwitchView updateSwitch(String key, Boolean enabled, Long operatorId) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("开关键不能为空");
        }
        if (enabled == null) {
            throw new IllegalArgumentException("开关状态不能为空");
        }

        AdminAppSwitch sw = switchRepository.findBySwitchKey(key)
                .orElseThrow(() -> new IllegalArgumentException("开关不存在: " + key));

        sw.setEnabled(enabled);
        sw.setUpdatedBy(operatorId);
        sw.setUpdatedAt(LocalDateTime.now());

        AdminAppSwitch saved = switchRepository.save(sw);
        return toSwitchView(saved);
    }

    private AdminConfigView toConfigView(AdminAppConfig entity) {
        return new AdminConfigView(
                entity.getId(),
                entity.getConfigKey(),
                entity.getConfigValue(),
                entity.getDescription(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }

    private AdminRuleView toRuleView(AdminAppRule entity) {
        return new AdminRuleView(
                entity.getId(),
                entity.getRuleName(),
                entity.getRuleExpression(),
                entity.getDescription(),
                entity.getEnabled(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }

    private AdminSwitchView toSwitchView(AdminAppSwitch entity) {
        return new AdminSwitchView(
                entity.getId(),
                entity.getSwitchKey(),
                entity.getEnabled(),
                entity.getDescription(),
                entity.getUpdatedBy(),
                entity.getUpdatedAt()
        );
    }
}
