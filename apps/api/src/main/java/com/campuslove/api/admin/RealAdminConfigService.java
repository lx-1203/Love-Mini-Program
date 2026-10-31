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
 *     <li>{@link #updateConfig(String, String, String, Long)} 添加 {@code @CacheEvict}，
 *         配置更新时主动失效，保证下次查询拿到最新值</li>
 *     <li>P2 修复（2026-11）：{@link #listRules()} 的 {@code 'rules'} 键与
 *         {@link #listSwitches()} 的 {@code 'switches'} 键同样被本类缓存，
 *         但 {@link #updateRule} / {@link #updateSwitch} 原先只有 {@code @Transactional}、
 *         没有任何失效 ⇒ 运营改完规则/开关后，控制台最长 30 分钟（TTL）看到的还是旧状态。
 *         现在三个写方法各自精确失效自己喂的那个键（{@code 'all'} / {@code 'rules'} /
 *         {@code 'switches'}，与 {@code @Cacheable} 的 key 一一对应）。</li>
 * </ul>
 * </p>
 *
 * <p><b>为什么是 evict 而不是 {@code @CachePut}</b>：{@code updateRule}/{@code updateSwitch}
 * 返回的是<b>单条</b>视图，而缓存值是整个列表；{@code @CachePut} 会把这条单值写进列表键，
 * 下次 {@code listRules()} 直接类型错乱。要按 {@code @CachePut} 做就得在方法里重算
 * {@code findAll()}，等于把 evict 的「下次读回源」提前到写路径付钱，得不偿失。</p>
 *
 * <p><b>影响面核实（写在改之前先验证过）</b>：这不是「运营策略被绕过」而是
 * 「运营看到错的状态」。运行时读开关/配置的入口都不走本缓存、每次都直查库：
 * {@code FeatureSwitchService#isEnabled}（类注释明确「不引入自缓存」）、
 * {@code RealAppConfigService#isSwitchEnabled}/{@code getClientConfig}（无任何
 * {@code @Cacheable}）。因此失效只影响后台
 * {@code GET /api/admin/rules|switches|configs} 的可见性，
 * 全仓 {@code SYSTEM_CONFIG} 也只有本类的三个键（{@code 'all'}/{@code 'rules'}/
 * {@code 'switches'}），精确失效不会漏掉别的缓存项。</p>
 *
 * <p>已知残留（不在本次改动范围）：{@code AdminProfileConfigController#save} 直接
 * {@code configRepository.save} 改 {@code app_config}，同样不失效 {@code 'all'} 键，
 * 由该文件归属方按需补 {@code @CacheEvict}。</p>
 *
 * <p>SubTask 5.3.3：配置更新后广播 {@link ConfigUpdatedEvent} 事件，
 * 通知订阅者（缓存刷新器、推荐服务、WebSocket 推送器等）拉取最新配置，
 * 实现「配置中心化 + 实时刷新」机制。目前全仓没有 {@code @EventListener}
 * 订阅方，缓存一致性只能靠这里的 {@code @CacheEvict}，不能指望事件。</p>
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
     * <p>Task 2.3.2：通过 {@code @CacheEvict} 主动失效 {@link CacheNames#SYSTEM_CONFIG}
     * 的 {@code 'all'} 键（与 {@link #listConfigs()} 的 {@code @Cacheable} key 一一对应），
     * 保证下次查询能取到更新后的配置值。</p>
     *
     * <p>P2 修复：原先这里是 {@code allEntries = true}，会顺手把 {@code 'rules'}
     * 与 {@code 'switches'} 两个键一起清掉——那两张表本次并没有被改，运营随后打开
     * 规则/开关页就会触发无谓的回源。改精确键后失效范围与写范围一致；
     * {@code system_config} 的键只有这三个（见类注释），不存在漏清风险。</p>
     *
     * <p>SubTask 5.3.3：保存成功后发布 {@link ConfigUpdatedEvent} 事件，
     * 通知订阅者（如缓存刷新器、推荐服务、WebSocket 推送器等）拉取最新配置。
     * 事件发布放在事务提交后由 Spring 容器调度（默认同步），
     * 订阅方可通过 {@code @Async} 改为异步处理以避免阻塞主流程。</p>
     */
    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'all'")
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

    /**
     * 查询全部业务规则（缓存键 {@code 'rules'}）。
     *
     * <p>P2 修复：与 {@link #listRules()} 的 {@code 'rules'} 键配对的失效原先缺失，
     * 现由 {@link #updateRule} 的 {@code @CacheEvict} 覆盖。</p>
     */
    @Override
    @Cacheable(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'rules'")
    public List<AdminRuleView> listRules() {
        return ruleRepository.findAll().stream()
                .map(this::toRuleView)
                .toList();
    }

    /**
     * 更新单条业务规则。
     *
     * <p>P2 修复：本方法喂的缓存是 {@link #listRules()} 的 {@code 'rules'} 键，
     * 原先只挂 {@code @Transactional}、没有任何失效 ⇒ 运营改完规则后，
     * 后台 {@code GET /api/admin/rules} 最长 30 分钟（{@code system_config} TTL）
     * 仍显示旧表达式/旧启用状态。现精确失效 {@code 'rules'} 键（下次读回源）。</p>
     *
     * <p>注意影响面：运行时读规则/开关的 {@code RealAppConfigService}
     * 与 {@code FeatureSwitchService} 都是直查数据库、不走本缓存，
     * 所以旧数据只污染运营后台的可见状态，不会让旧策略继续生效（见类注释）。</p>
     */
    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'rules'")
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

    /**
     * 查询全部功能开关（缓存键 {@code 'switches'}）。
     *
     * <p>P2 修复：与 {@link #updateSwitch} 的 {@code 'switches'} 失效配对。</p>
     */
    @Override
    @Cacheable(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'switches'")
    public List<AdminSwitchView> listSwitches() {
        return switchRepository.findAll().stream()
                .map(this::toSwitchView)
                .toList();
    }

    /**
     * 切换单个功能开关。
     *
     * <p>P2 修复：本方法喂 {@link #listSwitches()} 的 {@code 'switches'} 键，
     * 原先没有任何失效 ⇒ 关掉一个开关后，后台开关页最长 30 分钟仍显示「开启」。
     * 现精确失效 {@code 'switches'} 键。</p>
     *
     * <p>语义提醒（已核对）：开关的<b>运行时</b>读取走
     * {@code FeatureSwitchService} / {@code RealAppConfigService} 的直查库路径，
     * 不消费本缓存，因此本次修复改变的是「运营看到的状态」，
     * 不是「策略是否生效」——不要因为这里没失效就以为线上还在跑旧开关值。</p>
     */
    @Override
    @Transactional
    @CacheEvict(cacheNames = CacheNames.SYSTEM_CONFIG, key = "'switches'")
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
