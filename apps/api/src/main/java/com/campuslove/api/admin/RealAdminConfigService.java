package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.event.ConfigUpdatedEvent;
import com.campuslove.api.config.CacheNames;
import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.entity.AdminAppRule;
import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.AdminAppRuleRepository;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
 *
 * <p>Task 2.3.2：缓存策略
 * <ul>
 *     <li>{@link #listConfigs()} 添加 {@code @Cacheable}，缓存全量配置列表（CacheName = {@link CacheNames#SYSTEM_CONFIG}），
 *         业务方读配置走缓存，TTL 30 分钟</li>
 *     <li>{@link #updateConfig(String, String, String, Long)} 添加 {@code @CacheEvict(allEntries=true)}，
 *         配置更新时主动失效全量缓存，保证下次查询拿到最新值</li>
 * </ul>
 * </p>
 *
 * <p>SubTask 5.3.3：配置更新后广播 {@link ConfigUpdatedEvent} 事件，
 * 通知订阅者（缓存刷新器、推荐服务、WebSocket 推送器等）拉取最新配置，
 * 实现「配置中心化 + 实时刷新」机制。</p>
 */
@Profile("real")
@Service
public class RealAdminConfigService implements AdminConfigService {

    private static final Logger log = LoggerFactory.getLogger(RealAdminConfigService.class);

    /** 配置值最大长度（infra R2-00274，防止超长脏配置入库） */
    private static final int MAX_CONFIG_VALUE_LENGTH = 2048;

    private final AdminAppConfigRepository configRepository;
    private final AdminAppRuleRepository ruleRepository;
    private final AdminAppSwitchRepository switchRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RealAdminConfigService(
            AdminAppConfigRepository configRepository,
            AdminAppRuleRepository ruleRepository,
            AdminAppSwitchRepository switchRepository,
            ApplicationEventPublisher eventPublisher) {
        this.configRepository = configRepository;
        this.ruleRepository = ruleRepository;
        this.switchRepository = switchRepository;
        this.eventPublisher = eventPublisher;
    }

    /**
     * 查询全量系统配置。
     *
     * <p>Task 2.3.2：使用 {@code @Cacheable} 缓存结果。
     * CacheKey 固定为 {@code "all"}（无参数方法），TTL 30 分钟。
     * 配置项变更频率低，缓存命中可显著降低 DB 压力；
     * Admin 更新时通过 {@link #updateConfig} 的 @CacheEvict 主动失效。</p>
     *
     * @return 配置视图列表（缓存命中时直接返回，未命中时查询 DB 并写入缓存）
     */
    @Override
    @Cacheable(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'all'")
    public List<AdminConfigView> listConfigs() {
        return configRepository.findAll().stream()
                .map(this::toConfigView)
                .toList();
    }

    /**
     * 更新单个配置项。
     *
     * <p>Task 2.3.2：通过 {@code @CacheEvict(allEntries=true)} 主动失效
     * {@link CacheNames#SYSTEM_CONFIG} 全量缓存，
     * 保证下次查询能取到更新后的配置值。</p>
     *
     * <p>SubTask 5.3.3：保存成功后发布 {@link ConfigUpdatedEvent} 事件，
     * 通知订阅者（如缓存刷新器、推荐服务、WebSocket 推送器等）拉取最新配置。
     * 事件发布放在事务提交后由 Spring 容器调度（默认同步），
     * 订阅方可通过 {@code @Async} 改为异步处理以避免阻塞主流程。</p>
     */
    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, allEntries = true)
    public AdminConfigView updateConfig(String key, String value, String description, Long operatorId) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.CONFIG_KEY_REQUIRED);
        }
        if (value == null) {
            throw new IllegalArgumentException(ErrorMessages.CONFIG_VALUE_REQUIRED);
        }
        // infra R2-00274: 配置值长度上限校验
        if (value.length() > MAX_CONFIG_VALUE_LENGTH) {
            throw new IllegalArgumentException(ErrorMessages.CONFIG_VALUE_MAX_LENGTH_PREFIX + MAX_CONFIG_VALUE_LENGTH + " 字符");
        }

        AdminAppConfig config = configRepository.findByConfigKey(key)
                .orElseThrow(() -> new IllegalArgumentException("配置项不存在: " + key));

        config.setConfigValue(value);
        if (description != null) {
            config.setDescription(description);
        }
        config.setUpdatedBy(operatorId);
        config.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        AdminAppConfig saved = configRepository.save(config);

        // infra R2-00271: 事件发布推迟到事务提交后（TransactionSynchronization.afterCommit），
        // 避免订阅方同步处理拉长事务持有时间；无活动事务时直接发布
        Runnable publish = () -> {
            try {
                eventPublisher.publishEvent(ConfigUpdatedEvent.of(this, saved, operatorId));
                log.info("SubTask 5.3.3 配置更新事件已发布: key={}, operatorId={}", key, operatorId);
            } catch (RuntimeException e) {
                // 事件发布失败不影响主流程，仅记录日志
                log.warn("配置更新事件发布失败: key={}, error={}", key, e.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish.run();
                }
            });
        } else {
            publish.run();
        }

        return toConfigView(saved);
    }

    @Override
    @Cacheable(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'rules'")
    public List<AdminRuleView> listRules() {
        return ruleRepository.findAll().stream()
                .map(this::toRuleView)
                .toList();
    }

    @Override
    @Transactional
    public AdminRuleView updateRule(Long id, String expression, Boolean enabled, String description, Long operatorId) {
        if (id == null) {
            throw new IllegalArgumentException(ErrorMessages.RULE_ID_REQUIRED);
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
        rule.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        AdminAppRule saved = ruleRepository.save(rule);
        return toRuleView(saved);
    }

    @Override
    @Cacheable(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'switches'")
    public List<AdminSwitchView> listSwitches() {
        return switchRepository.findAll().stream()
                .map(this::toSwitchView)
                .toList();
    }

    @Override
    @Transactional
    public AdminSwitchView updateSwitch(String key, Boolean enabled, Long operatorId) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.SWITCH_KEY_REQUIRED);
        }
        if (enabled == null) {
            throw new IllegalArgumentException(ErrorMessages.SWITCH_VALUE_REQUIRED);
        }

        AdminAppSwitch sw = switchRepository.findBySwitchKey(key)
                .orElseThrow(() -> new IllegalArgumentException("开关不存在: " + key));

        sw.setEnabled(enabled);
        sw.setUpdatedBy(operatorId);
        sw.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

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
