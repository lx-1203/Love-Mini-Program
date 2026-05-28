package com.campuslove.api.growth;

import com.campuslove.api.entity.PushSummary;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 推送摘要服务实现。
 * 在 mock profile 下激活，使用内存存储返回模拟的推送摘要数据。
 */
@Profile("mock")
@Service
public class MockPushSummaryService implements PushSummaryService {

    private static final Logger log = LoggerFactory.getLogger(MockPushSummaryService.class);

    /** 模拟摘要 ID 生成器 */
    private final AtomicLong summaryIdSeq = new AtomicLong(7000);

    /** 模拟摘要缓存：summaryId -> PushSummary */
    private final ConcurrentHashMap<Long, PushSummary> summaryCache = new ConcurrentHashMap<>();

    @Override
    public PushSummary generateSocialDigest(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 检查今日是否已有 mock 摘要（通过缓存中相同 userId + social_digest 判断）
        boolean alreadyGenerated = summaryCache.values().stream()
                .anyMatch(s -> s.getUserId().equals(userId)
                        && "social_digest".equals(s.getSummaryType()));
        if (alreadyGenerated) {
            log.debug("Mock: 用户[{}]今日已生成社交动态摘要，返回已有记录", userId);
            return summaryCache.values().stream()
                    .filter(s -> s.getUserId().equals(userId)
                            && "social_digest".equals(s.getSummaryType()))
                    .findFirst().orElse(null);
        }

        Long summaryId = summaryIdSeq.incrementAndGet();
        PushSummary summary = new PushSummary();
        summary.setId(summaryId);
        summary.setUserId(userId);
        summary.setSummaryType("social_digest");
        summary.setTitle("你收到了新的社交动态");
        summary.setContent("3 人查看了你的主页，1 人喜欢了你，帖子获得 5 次互动");
        summary.setActionUrl("/pages/likes/index");
        summary.setIsSent(false);
        summary.setGeneratedAt(LocalDateTime.now());

        summaryCache.put(summaryId, summary);
        log.debug("Mock: 用户[{}]社交动态摘要已生成", userId);
        return summary;
    }

    @Override
    public PushSummary generateRecommendRefresh(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 检查今日是否已有 mock 摘要
        boolean alreadyGenerated = summaryCache.values().stream()
                .anyMatch(s -> s.getUserId().equals(userId)
                        && "recommend_refresh".equals(s.getSummaryType()));
        if (alreadyGenerated) {
            log.debug("Mock: 用户[{}]今日已生成推荐刷新通知，返回已有记录", userId);
            return summaryCache.values().stream()
                    .filter(s -> s.getUserId().equals(userId)
                            && "recommend_refresh".equals(s.getSummaryType()))
                    .findFirst().orElse(null);
        }

        Long summaryId = summaryIdSeq.incrementAndGet();
        PushSummary summary = new PushSummary();
        summary.setId(summaryId);
        summary.setUserId(userId);
        summary.setSummaryType("recommend_refresh");
        summary.setTitle("今日推荐已更新");
        summary.setContent("你的每日推荐人选已刷新，快去看看有没有心动的TA吧！");
        summary.setActionUrl("/pages/discover/index");
        summary.setIsSent(false);
        summary.setGeneratedAt(LocalDateTime.now());

        summaryCache.put(summaryId, summary);
        log.debug("Mock: 用户[{}]推荐刷新通知已生成", userId);
        return summary;
    }

    @Override
    public PushSummary markSent(Long summaryId) {
        if (summaryId == null) {
            throw new IllegalArgumentException("summaryId is required");
        }

        PushSummary summary = summaryCache.get(summaryId);
        if (summary == null) {
            throw new IllegalArgumentException("Mock PushSummary not found: " + summaryId);
        }

        summary.setIsSent(true);
        summary.setSentAt(LocalDateTime.now());
        summaryCache.put(summaryId, summary);
        log.debug("Mock: 推送摘要[{}]已标记为已发送", summaryId);
        return summary;
    }
}