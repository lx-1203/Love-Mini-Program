package com.campuslove.api.admin.event;

import com.campuslove.api.entity.AdminAppConfig;
import java.util.Objects;
import org.springframework.context.ApplicationEvent;

/**
 * SubTask 5.3.3：系统配置更新事件。
 *
 * <p>当 {@link com.campuslove.api.admin.RealAdminConfigService#updateConfig}
 * 完成配置更新后，发布此事件，通知所有订阅者（如缓存刷新器、推荐服务、
 * WebSocket 推送器等）拉取最新配置，实现「配置中心化 + 实时刷新」机制。</p>
 *
 * <p>事件采用 Spring {@link ApplicationEvent} 标准发布/订阅模型，
 * 通过 {@code ApplicationEventPublisher#publishEvent} 发布，
 * 订阅方使用 {@code @EventListener} 注解接收事件。</p>
 *
 * <p>设计考量：</p>
 * <ul>
 *   <li>事件携带配置 key 与最新值，订阅方可按需过滤关心的配置项</li>
 *   <li>事件为 Spring 容器内同步发布（默认），可通过 {@code @Async} 改为异步</li>
 *   <li>事件不可变（final 字段），保证事件在多个订阅方之间的线程安全</li>
 * </ul>
 */
public class ConfigUpdatedEvent extends ApplicationEvent {

    private static final long serialVersionUID = 1L;

    /** 配置 key（如 {@code recommendation.daily_limit}） */
    private final String configKey;

    /** 配置最新值（字符串形式，订阅方按需自行类型转换） */
    private final String configValue;

    /** 操作者用户 ID（用于审计与日志） */
    private final Long operatorId;

    /**
     * 构造配置更新事件。
     *
     * @param source      事件源（通常为发布事件的 Service 实例）
     * @param configKey   配置 key
     * @param configValue 配置最新值
     * @param operatorId  操作者用户 ID
     */
    public ConfigUpdatedEvent(Object source, String configKey, String configValue, Long operatorId) {
        super(source);
        this.configKey = configKey;
        this.configValue = configValue;
        this.operatorId = operatorId;
    }

    /**
     * 便捷工厂方法：从 {@link AdminAppConfig} 实体构造事件。
     *
     * @param source     事件源
     * @param config     已更新的配置实体
     * @param operatorId 操作者用户 ID
     * @return 配置更新事件
     */
    public static ConfigUpdatedEvent of(Object source, AdminAppConfig config, Long operatorId) {
        return new ConfigUpdatedEvent(
                source,
                config.getConfigKey(),
                config.getConfigValue(),
                operatorId
        );
    }

    public String getConfigKey() {
        return configKey;
    }

    public String getConfigValue() {
        return configValue;
    }

    public Long getOperatorId() {
        return operatorId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ConfigUpdatedEvent that)) return false;
        return Objects.equals(configKey, that.configKey)
                && Objects.equals(configValue, that.configValue)
                && Objects.equals(operatorId, that.operatorId)
                && Objects.equals(getSource(), that.getSource());
    }

    @Override
    public int hashCode() {
        return Objects.hash(configKey, configValue, operatorId, getSource());
    }

    @Override
    public String toString() {
        return "ConfigUpdatedEvent{configKey='" + configKey
                + "', configValue='" + configValue
                + "', operatorId=" + operatorId
                + ", source=" + getSource() + "}";
    }
}
