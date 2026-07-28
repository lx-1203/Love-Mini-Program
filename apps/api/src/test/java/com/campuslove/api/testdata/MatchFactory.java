package com.campuslove.api.testdata;

import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 匹配关系（Like）测试数据工厂（P7 - Task 7.1.5）。
 *
 * <p>提供常见的匹配关系构造场景：</p>
 * <ul>
 *   <li>activeLike：有效喜欢（已发起且未取消）</li>
 *   <li>cancelledLike：已取消的喜欢</li>
 *   <li>mutualLikePair：互相喜欢的一对（模拟匹配成功场景）</li>
 * </ul>
 */
public final class MatchFactory {

    private static final AtomicLong SEQ = new AtomicLong(5000L);

    private MatchFactory() {
        // 工具类禁止实例化
    }

    /** 创建有效喜欢记录（status=active）。 */
    public static Like activeLike(Long userId, Long targetUserId) {
        Like like = new Like();
        like.setId(SEQ.incrementAndGet());
        like.setUserId(userId);
        like.setTargetUserId(targetUserId);
        like.setStatus(LikeStatus.active);
        like.setCreatedAt(LocalDateTime.now().minusHours(1));
        like.setUpdatedAt(LocalDateTime.now());
        like.setVersion(0L);
        return like;
    }

    /** 创建已取消的喜欢记录（status=cancelled）。 */
    public static Like cancelledLike(Long userId, Long targetUserId) {
        Like like = activeLike(userId, targetUserId);
        like.setStatus(LikeStatus.cancelled);
        return like;
    }

    /** 创建互相喜欢的一对记录（模拟匹配成功）。 */
    public static Like[] mutualLikePair(Long userA, Long userB) {
        return new Like[]{
            activeLike(userA, userB),
            activeLike(userB, userA)
        };
    }

    /** 创建带指定 ID 的喜欢记录（用于显式测试场景）。 */
    public static Like withId(Long id, Long userId, Long targetUserId) {
        Like like = activeLike(userId, targetUserId);
        like.setId(id);
        return like;
    }
}
