package com.campuslove.api.village;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * 村口帖子流变更事件发布器（P2-7 首页实时化，2026-11-03）。
 *
 * <p>背景：小程序首页动态流此前只有「onShow + 30 秒陈旧阈值」的拉取式刷新
 * （{@code pages/home/index.vue}），管理员审核通过/删除/置顶之后，用户要等
 * 下一次打开页面且缓存过期才能看到变化——「审核通过了但首页还看不到」
 * 与「帖子删了首页还挂着」都是这个窗口期的表现。</p>
 *
 * <p>本组件在<b>影响他人可见性的后台写操作</b>（审核/删除/置顶）成功后，向
 * {@code /topic/village/posts-changed} 广播一条轻量事件；已连接 WebSocket 的
 * 客户端据此即时刷新首页流（30s 阈值轮询降级为断线兜底）。事件只携带
 * {@code action + postId + 时间戳}，不含帖子内容——内容仍走 REST 拉取，
 * 避免把未经审核的内容推进广播信道。</p>
 *
 * <p>失败语义：<b>尽力而为</b>。广播失败（broker 未就绪/无订阅者异常等）只记日志，
 * 绝不让已成功的写操作回滚或向管理员报错——事件是优化项，不是事务的一部分。</p>
 */
@Component
@Profile("real")
public class VillageFeedEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(VillageFeedEventPublisher.class);

    /** 帖子流变更广播主题（客户端 wsClient.subscribe 订阅同一目的地）。 */
    public static final String TOPIC_POSTS_CHANGED = "/topic/village/posts-changed";

    private final SimpMessagingTemplate messagingTemplate;

    public VillageFeedEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * 广播一条帖子流变更事件。
     *
     * @param action 变更动作（approved / rejected / deleted / pinned / unpinned）
     * @param postId 目标帖子 ID
     */
    public void publishPostsChanged(String action, Long postId) {
        if (action == null || postId == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSend(TOPIC_POSTS_CHANGED, Map.of(
                    "action", action,
                    "postId", postId,
                    "at", System.currentTimeMillis()));
        } catch (RuntimeException ex) {
            // 尽力而为：广播断不回滚写操作、不打扰管理员（详见类注释）
            log.warn("帖子流变更事件广播失败（不影响主流程）: action={}, postId={}, cause={}",
                    action, postId, ex.getMessage());
        }
    }
}
