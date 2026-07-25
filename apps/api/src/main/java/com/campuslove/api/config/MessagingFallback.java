package com.campuslove.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;

/**
 * 消息中间件降级处理器。
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>实现 {@link SmartInitializingSingleton}：在所有单例 Bean 初始化完成后，
 *       主动检测 RabbitMQ 连接是否可用，避免在应用启动阶段因 RabbitMQ 不可用而抛异常</li>
 *   <li>提供 {@link #isAvailable()} 方法供生产者查询当前消息中间件可用性</li>
 *   <li>提供 {@link #discard(Object, Throwable)} 方法：消息发送失败时记录日志并丢弃，
 *       不阻塞主流程</li>
 * </ol>
 *
 * <p>降级原则：</p>
 * <ul>
 *   <li>RabbitMQ 不可用是可接受的运行状态，应用主流程必须继续工作</li>
 *   <li>所有失败均通过日志记录，便于事后排查与重放</li>
 *   <li>不进行自动重连（由 RabbitTemplate 内部重试机制负责）</li>
 * </ul>
 */
@Component
public class MessagingFallback implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(MessagingFallback.class);

    /**
     * RabbitMQ 连接工厂。
     *
     * <p>mock 模式下不存在该 Bean，使用 required = false 注入。</p>
     */
    @Autowired(required = false)
    private ConnectionFactory connectionFactory;

    /** RabbitMQ 可用性标志：volatile 保证多线程可见性 */
    private volatile boolean messagingAvailable = false;

    /**
     * 在所有单例 Bean 初始化完成后调用。
     *
     * <p>实现逻辑：</p>
     * <ol>
     *   <li>若 ConnectionFactory 未注入（mock 模式），直接标记为不可用并返回</li>
     *   <li>尝试创建物理连接，成功则标记为可用，失败则标记为不可用</li>
     *   <li>无论结果如何都不抛异常，保证 Spring 容器正常启动</li>
     * </ol>
     */
    @Override
    public void afterSingletonsInstantiated() {
        if (connectionFactory == null) {
            log.warn("RabbitMQ ConnectionFactory 未配置，消息发送功能将降级（记录日志并丢弃消息）");
            messagingAvailable = false;
            return;
        }

        // 尝试创建物理连接，验证 RabbitMQ 可用性
        try {
            // createConnection 失败会抛 AmqpException，这里捕获并降级
            var connection = connectionFactory.createConnection();
            if (connection != null) {
                // 关闭测试连接，避免连接泄漏
                try {
                    connection.close();
                } catch (Exception ignored) {
                    // 关闭失败不影响主流程
                }
            }
            messagingAvailable = true;
            log.info("RabbitMQ 连接正常，消息生产者就绪");
        } catch (Exception e) {
            // RabbitMQ 不可用，降级为日志记录模式，不阻塞应用启动
            messagingAvailable = false;
            log.warn("RabbitMQ 连接失败，消息发送将降级为日志记录模式。原因：{}", e.getMessage());
        }
    }

    /**
     * 查询 RabbitMQ 当前是否可用。
     *
     * <p>注意：此状态为启动时检测结果。运行期 RabbitMQ 恢复或宕机
     * 不会自动更新此标志，仍依赖 RabbitTemplate 内部重试机制。</p>
     *
     * @return true 表示启动时 RabbitMQ 连接正常
     */
    public boolean isAvailable() {
        return messagingAvailable;
    }

    /**
     * 丢弃消息并记录日志。
     *
     * <p>调用场景：</p>
     * <ul>
     *   <li>{@link com.campuslove.api.messaging.NotificationProducer#sendNotification}
     *       发送消息时 RabbitMQ 抛出 {@link org.springframework.amqp.AmqpException}</li>
     *   <li>{@link #isAvailable()} 返回 false 时主动调用</li>
     * </ul>
     *
     * @param message 被丢弃的消息体（用于日志排查）
     * @param cause   失败原因，可为 null（主动降级场景）
     */
    public void discard(Object message, Throwable cause) {
        if (cause != null) {
            log.warn("消息已丢弃（RabbitMQ 不可用）：message={}, cause={}",
                    message, cause.getMessage());
        } else {
            log.warn("消息已丢弃（RabbitMQ 不可用）：message={}", message);
        }
        // 此处可扩展：写入本地落盘队列、写入数据库补偿表等，
        // 当前实现仅记录日志，符合"不阻塞主流程"的要求
    }
}
