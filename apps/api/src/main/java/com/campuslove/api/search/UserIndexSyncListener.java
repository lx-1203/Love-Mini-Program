package com.campuslove.api.search;

import com.campuslove.api.campus.event.CertificationApprovedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * SubTask 5.3.2：用户索引同步监听器（R4-00359 已停用）。
 *
 * <p>原实现为桩实现：监听 {@link CertificationApprovedEvent} 后仅记录"同步完成"日志，
 * 并无真实 ES 索引写入——认证审批后"索引同步"是假功能，日志会误导维护者以为
 * 搜索筛选依赖的认证字段已更新。</p>
 *
 * <p>R4-00359 处理：项目未引入 Elasticsearch 依赖（搜索为 SQL 实现），
 * 移除 {@code @EventListener} 事件订阅与"同步完成"日志，不再宣称具备索引同步能力。
 * 后续接入 ES 时按以下步骤恢复：
 * <ol>
 *   <li>pom.xml 引入 {@code spring-boot-starter-data-elasticsearch}</li>
 *   <li>定义 {@code UserDocument} 实体（@Document(indexName="users")）</li>
 *   <li>恢复 {@code @EventListener} 订阅 {@link CertificationApprovedEvent}，
 *       查询用户实体转换为 UserDocument 后调用 {@code save()} 更新索引</li>
 * </ol>
 */
@Profile("real")
@Component
public class UserIndexSyncListener {

    private static final Logger log = LoggerFactory.getLogger(UserIndexSyncListener.class);

    /**
     * R4-00359：ES 索引同步尚未实现（无 ES 依赖，搜索为 SQL 实现），
     * 本方法不再通过 @EventListener 订阅认证事件，避免"假同步"误导。
     * 接入 ES 后恢复订阅并填充真实写入逻辑。
     *
     * @param event 认证审批通过事件（保留签名供后续接入）
     */
    public void onCertificationApproved(CertificationApprovedEvent event) {
        log.info("R4-00359 用户索引同步未接入 ES（SQL 搜索不依赖索引），忽略认证事件: userId={}, schoolName={}",
                event.getUserId(), event.getSchoolName());
    }
}
