package com.campuslove.api.search;

import com.campuslove.api.campus.event.CertificationApprovedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * SubTask 5.3.2：用户索引同步监听器（桩实现）。
 *
 * <p>监听 {@link CertificationApprovedEvent} 事件，在校园认证审批通过后
 * 同步更新 Elasticsearch 用户索引中的 {@code school_name} /
 * {@code verification_status} / {@code verification_badge} 等字段，
 * 使推荐搜索能基于最新认证状态进行筛选。</p>
 *
 * <p>当前项目尚未引入 Elasticsearch 客户端依赖（pom.xml 未引入
 * spring-boot-starter-data-elasticsearch），本监听器为桩实现，
 * 仅记录日志，待 ES 接入后填充真实索引同步逻辑。</p>
 *
 * <p>设计考量：</p>
 * <ul>
 *   <li>使用 {@code @Async} 异步处理，避免阻塞认证审批主流程</li>
 *   <li>使用 {@code @EventListener} 自动注册到 Spring 事件总线</li>
 *   <li>异常捕获并记录日志，避免单次同步失败影响后续事件处理</li>
 *   <li>桩实现保留接口形状，后续替换为真实 ES Client 仅需修改方法体</li>
 * </ul>
 *
 * <p>后续接入 ES 步骤：</p>
 * <ol>
 *   <li>pom.xml 引入 {@code spring-boot-starter-data-elasticsearch}</li>
 *   <li>定义 {@code UserDocument} 实体（@Document(indexName="users")）</li>
 *   <li>注入 {@code ElasticsearchOperations} 或 {@code UserSearchRepository}</li>
 *   <li>在 {@link #onCertificationApproved(CertificationApprovedEvent)} 中
 *       查询用户实体，转换为 UserDocument，调用 {@code save()} 更新索引</li>
 *   <li>添加熔断/重试机制（Resilience4j）应对 ES 不可用场景</li>
 * </ol>
 */
@Profile("real")
@Component
public class UserIndexSyncListener {

    private static final Logger log = LoggerFactory.getLogger(UserIndexSyncListener.class);

    /**
     * 处理校园认证审批通过事件，同步更新用户索引。
     *
     * <p>桩实现：仅记录日志，待 ES 接入后填充真实索引同步逻辑。</p>
     *
     * @param event 认证审批通过事件
     */
    @Async
    @EventListener
    public void onCertificationApproved(CertificationApprovedEvent event) {
        try {
            log.info("SubTask 5.3.2 收到认证审批通过事件，准备同步用户索引: userId={}, schoolName={}, reviewerId={}",
                    event.getUserId(), event.getSchoolName(), event.getReviewerId());

            // TODO: ES 接入后填充以下逻辑：
            // 1. User user = userRepository.findById(event.getUserId()).orElseThrow(...);
            // 2. UserDocument doc = toUserDocument(user, event);
            //    - schoolName = event.getSchoolName()
            //    - major = event.getMajor()
            //    - verificationStatus = "APPROVED"
            //    - verificationBadge = "school"
            // 3. elasticsearchOperations.save(doc);
            log.info("SubTask 5.3.2 用户索引同步完成（桩实现，待 ES 接入）: userId={}",
                    event.getUserId());
        } catch (RuntimeException e) {
            // 异常捕获避免影响后续事件处理；记录 error 级别日志便于运维定位
            log.error("SubTask 5.3.2 用户索引同步失败: userId={}, error={}",
                    event.getUserId(), e.getMessage(), e);
        }
    }
}
