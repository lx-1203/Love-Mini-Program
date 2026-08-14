package com.campuslove.api.village;

import com.campuslove.api.entity.AdminAppConfig;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.AdminAppConfigRepository;
import com.campuslove.api.repository.PostFavoriteRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 帖子热度分计算器（2026-08-11 热度榜，参考贴吧/主流社区热度公式）。
 *
 * <p>公式（Hacker News / Reddit 类时间衰减，贴吧式回复权重最高）：</p>
 * <pre>
 *   raw = likes * w1 + comments * w3 + shares * w2 + favorites * w2 + views * w0.1
 *   hotScore = raw / pow(ageHours + 2, gravity) * hotBoost
 * </pre>
 *
 * <p>权重从 {@code app_config} 表读取（后台「全局配置」页可改，实时生效无需重启）；
 * 缺省回退内置常量。运营操纵：{@code hot_boost} 为倍率（>1 上榜加成，0 压榜），
 * {@code hot_banned=1} 强制热度分归零（不上榜，不影响前台可见）。</p>
 */
@Profile("real")
@Component
public class HotScoreCalculator {

    /** 权重配置键（app_config.config_key，与 V2026.08.11.0003 seed 一致） */
    static final String KEY_LIKES_WEIGHT = "hot.likesWeight";
    static final String KEY_COMMENTS_WEIGHT = "hot.commentsWeight";
    static final String KEY_SHARES_WEIGHT = "hot.sharesWeight";
    static final String KEY_FAVORITES_WEIGHT = "hot.favoritesWeight";
    static final String KEY_VIEWS_WEIGHT = "hot.viewsWeight";
    static final String KEY_GRAVITY = "hot.gravity";

    /** 默认权重（无配置项时回退） */
    private static final double DEFAULT_LIKES_WEIGHT = 1.0;
    private static final double DEFAULT_COMMENTS_WEIGHT = 3.0;
    private static final double DEFAULT_SHARES_WEIGHT = 2.0;
    private static final double DEFAULT_FAVORITES_WEIGHT = 2.0;
    private static final double DEFAULT_VIEWS_WEIGHT = 0.1;
    private static final double DEFAULT_GRAVITY = 1.5;

    private final AdminAppConfigRepository configRepository;
    private final PostFavoriteRepository postFavoriteRepository;

    public HotScoreCalculator(AdminAppConfigRepository configRepository,
                              PostFavoriteRepository postFavoriteRepository) {
        this.configRepository = configRepository;
        this.postFavoriteRepository = postFavoriteRepository;
    }

    /**
     * 计算单帖热度分（收藏数实时统计）。
     *
     * @param post         帖子（须含 likesCount/commentsCount/shareCount/viewCount/hotBoost/hotBanned/createdAt）
     * @param favoriteCount 该帖收藏数（null 时实时查询）
     * @return 热度分（hot_banned 强制归零）
     */
    public double calculateScore(Post post, Integer favoriteCount) {
        if (Boolean.TRUE.equals(post.getHotBanned())) {
            return 0.0;
        }
        double likes = nvl(post.getLikesCount());
        double comments = nvl(post.getCommentsCount());
        double shares = nvl(post.getShareCount());
        double views = nvl(post.getViewCount());
        double favorites = favoriteCount != null ? favoriteCount
                : (post.getId() != null ? postFavoriteRepository.countByPostId(post.getId()) : 0);

        double raw = likes * weight(KEY_LIKES_WEIGHT, DEFAULT_LIKES_WEIGHT)
                + comments * weight(KEY_COMMENTS_WEIGHT, DEFAULT_COMMENTS_WEIGHT)
                + shares * weight(KEY_SHARES_WEIGHT, DEFAULT_SHARES_WEIGHT)
                + favorites * weight(KEY_FAVORITES_WEIGHT, DEFAULT_FAVORITES_WEIGHT)
                + views * weight(KEY_VIEWS_WEIGHT, DEFAULT_VIEWS_WEIGHT);

        double ageHours = post.getCreatedAt() == null
                ? 0.0
                : Math.max(0.0, Duration.between(post.getCreatedAt(), LocalDateTime.now()).toMinutes() / 60.0);
        double gravity = weight(KEY_GRAVITY, DEFAULT_GRAVITY);
        double boost = post.getHotBoost() != null ? post.getHotBoost() : 1.0;
        return raw / Math.pow(ageHours + 2.0, gravity) * boost;
    }

    /**
     * 批量计算热度分：一次批量查收藏数（防 N+1），返回 postId → score。
     */
    public Map<Long, Double> calculateScores(List<Post> posts) {
        List<Long> postIds = posts.stream().map(Post::getId).filter(Objects::nonNull).toList();
        Map<Long, Integer> favoriteCountMap = postIds.isEmpty() ? Map.of()
                : postFavoriteRepository.countByPostIds(postIds).stream()
                        .collect(Collectors.toMap(r -> (Long) r[0], r -> ((Number) r[1]).intValue()));
        return posts.stream().collect(Collectors.toMap(Post::getId, p -> calculateScore(p,
                favoriteCountMap.getOrDefault(p.getId(), 0))));
    }

    /** 读取配置权重（解析失败/缺失回退默认值）。 */
    private double weight(String key, double fallback) {
        try {
            AdminAppConfig config = configRepository.findByConfigKey(key).orElse(null);
            return config == null ? fallback : Double.parseDouble(config.getConfigValue());
        } catch (RuntimeException e) {
            return fallback;
        }
    }

    private static double nvl(Integer value) {
        return value != null ? value : 0.0;
    }

    /** 供单测/管理端读取配置值（无需暴露 Repository）。 */
    public double readWeight(String key, double fallback) {
        return weight(key, fallback);
    }

    /** 收藏数统计（管理端「立即重算」场景复用）。 */
    public int countFavorites(Long postId) {
        return postId == null ? 0 : (int) postFavoriteRepository.countByPostId(postId);
    }

    /** 供函数式复用：按 postId 统计收藏数。 */
    public Function<Post, Integer> favoriteCounter() {
        return p -> p.getId() == null ? 0 : (int) postFavoriteRepository.countByPostId(p.getId());
    }
}
