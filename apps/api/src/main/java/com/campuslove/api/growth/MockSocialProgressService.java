package com.campuslove.api.growth;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 社交升温漏斗服务实现。
 * 在 mock profile 下激活，返回模拟的社交进度数据，
 * 并在每次调用 record 方法时模拟升级行为。
 */
@Profile("mock")
@Service
public class MockSocialProgressService implements SocialProgressService {

    /** 模拟曝光次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> exposureCountMap = new ConcurrentHashMap<>();

    /** 模拟喜欢次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> likeCountMap = new ConcurrentHashMap<>();

    /** 模拟匹配次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> matchCountMap = new ConcurrentHashMap<>();

    /** 模拟聊天次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> chatCountMap = new ConcurrentHashMap<>();

    /** 模拟社区互动次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> circleCountMap = new ConcurrentHashMap<>();

    /** 模拟活动参与次数缓存 */
    private final ConcurrentHashMap<Long, AtomicInteger> activityCountMap = new ConcurrentHashMap<>();

    /** 模拟当前层级缓存 */
    private final ConcurrentHashMap<Long, String> currentTierMap = new ConcurrentHashMap<>();

    @Override
    public SocialProgressView getProgress(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        int exposure = getCount(exposureCountMap, userId);
        int like = getCount(likeCountMap, userId);
        int match = getCount(matchCountMap, userId);
        int chat = getCount(chatCountMap, userId);
        int circle = getCount(circleCountMap, userId);
        int activity = getCount(activityCountMap, userId);
        String currentTier = determineMockTier(like, match, chat, circle, activity);
        String nextAction = buildMockNextAction(currentTier);

        return new SocialProgressView(
            currentTier, exposure, like, match, chat, circle, activity, nextAction
        );
    }

    @Override
    public void recordExposure(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(exposureCountMap, userId);
    }

    @Override
    public void recordLike(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(likeCountMap, userId);
        // 喜欢达到 1 次后自动升级到 L2
        if (getCount(likeCountMap, userId) >= 1) {
            currentTierMap.put(userId, "L2_ATTENTION");
        }
    }

    @Override
    public void recordMatch(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(matchCountMap, userId);
        if (getCount(matchCountMap, userId) >= 1) {
            currentTierMap.put(userId, "L3_MATCH");
        }
    }

    @Override
    public void recordChat(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(chatCountMap, userId);
        if (getCount(chatCountMap, userId) >= 1) {
            currentTierMap.put(userId, "L4_COMMUNICATION");
        }
    }

    @Override
    public void recordCircleActivity(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(circleCountMap, userId);
        if (getCount(circleCountMap, userId) >= 1) {
            currentTierMap.put(userId, "L5_CIRCLE");
        }
    }

    @Override
    public void recordActivityParticipation(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        incrementAndUpdate(activityCountMap, userId);
        if (getCount(activityCountMap, userId) >= 1) {
            currentTierMap.put(userId, "L6_SCENE");
        }
    }

    // ---- 私有辅助方法 ----

    /**
     * 获取指定计数器的当前值，不存在则返回 0。
     */
    private int getCount(ConcurrentHashMap<Long, AtomicInteger> map, Long userId) {
        AtomicInteger value = map.get(userId);
        return value != null ? value.get() : 0;
    }

    /**
     * 将指定计数器加一并更新。
     */
    private void incrementAndUpdate(ConcurrentHashMap<Long, AtomicInteger> map, Long userId) {
        map.computeIfAbsent(userId, k -> new AtomicInteger(0)).incrementAndGet();
    }

    /**
     * 根据模拟数据确定当前所处层级（从高到低检查）。
     */
    private String determineMockTier(int like, int match, int chat, int circle, int activity) {
        if (activity >= 1) return "L6_SCENE";
        if (circle >= 1) return "L5_CIRCLE";
        if (chat >= 1) return "L4_COMMUNICATION";
        if (match >= 1) return "L3_MATCH";
        if (like >= 1) return "L2_ATTENTION";
        return "L1_EXPOSURE";
    }

    /**
     * 根据模拟层级构建下一步行动建议。
     */
    private String buildMockNextAction(String tier) {
        switch (tier) {
            case "L1_EXPOSURE":
                return "去发现页浏览更多同学，给心动的人点个赞吧";
            case "L2_ATTENTION":
                return "继续表达喜欢，等待双向匹配的惊喜";
            case "L3_MATCH":
                return "恭喜匹配成功！快去和对方打个招呼吧";
            case "L4_COMMUNICATION":
                return "多参与社区话题讨论，认识更多朋友";
            case "L5_CIRCLE":
                return "关注校园活动，报名参加线下见面";
            case "L6_SCENE":
                return "你已经完成全部社交进阶，享受校园恋爱吧！";
            default:
                return "继续探索校园社交的更多可能";
        }
    }
}