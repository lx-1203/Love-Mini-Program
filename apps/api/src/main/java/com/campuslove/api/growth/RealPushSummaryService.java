package com.campuslove.api.growth;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.PushPreference;
import com.campuslove.api.entity.PushSummary;
import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.repository.PushPreferenceRepository;
import com.campuslove.api.repository.PushSummaryRepository;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 真实推送摘要服务实现。
 * 在 real profile 下激活，使用各类 Repository 实现数据库持久化。
 * <p>
 * 提供推荐刷新通知生成。同一用户在同一自然日内每种摘要类型只生成一条，避免重复推送。
 *
 * <p>S3-E（2026-10-31）：删除了 {@code generateSocialDigest}。理由（全部实测/可复核，
 * 不是「看起来没用」）：</p>
 * <ul>
 *   <li>该方法在 main 与 test 里【零调用方】——
 *       {@code grep -rn "generateSocialDigest|PushSummaryService" apps/ tests/}
 *       只命中接口声明与两个实现自身，整个 {@code PushSummaryService} 类型没有被
 *       任何 Controller/Service/Scheduled 注入；</li>
 *   <li>它是 N+1 的唯一来源：每个帖子各发一次
 *       {@code postLikeRepository.countByPostId} 与
 *       {@code commentRepository.findByPostIdOrderByCreatedAtDesc}（后者返回【无界】
 *       {@code List<Comment>}，仅为在内存里数 24 小时内的条数）；</li>
 *   <li>所以「优化它」= 给死代码建索引，正确动作是删掉。
 *       删除同时带走了对不过滤软删除的 {@code postRepository.findByAuthorId} 的调用。</li>
 * </ul>
 *
 * <p>【未】一并删除 {@code generateRecommendRefresh} / {@code markSent}：它们同样没有
 * 调用方，但属于另一个产品决定（订阅消息推送链路是否还要做），已作为待决项上报，
 * 不在本发现项里替产品拍板。</p>
 */
@Profile("real")
@Service
public class RealPushSummaryService implements PushSummaryService {

    private static final Logger log = LoggerFactory.getLogger(RealPushSummaryService.class);

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final PushSummaryRepository pushSummaryRepository;
    private final PushPreferenceRepository pushPreferenceRepository;
    private final RecommendationPreferenceRepository recommendationPreferenceRepository;

    /**
     * 构造函数，注入所需的所有 Repository。
     *
     * <p>S3-E：原构造器还注入 VisitorRepository / LikeRepository / PostRepository /
     * PostLikeRepository / CommentRepository 五个，仅被已删除的
     * {@code generateSocialDigest} 使用，随之移除。</p>
     */
    public RealPushSummaryService(
            PushSummaryRepository pushSummaryRepository,
            PushPreferenceRepository pushPreferenceRepository,
            RecommendationPreferenceRepository recommendationPreferenceRepository) {
        this.pushSummaryRepository = pushSummaryRepository;
        this.pushPreferenceRepository = pushPreferenceRepository;
        this.recommendationPreferenceRepository = recommendationPreferenceRepository;
    }

    /**
     * 为指定用户生成推荐刷新通知。
     * <p>
     * 从 recommendation_preferences 获取用户的推荐偏好时间，
     * 如果当前时间已超过偏好时间，则生成通知提示用户查看推荐。
     * 同一用户每天只生成一次 recommend_refresh 摘要。
     *
     * @param userId 用户 ID
     * @return 生成的推送摘要，如果未到推荐刷新时间则返回 null
     */
    @Override
    @Transactional
    public PushSummary generateRecommendRefresh(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 检查推送偏好
        Optional<PushPreference> prefOpt = pushPreferenceRepository.findByUserId(userId);
        if (prefOpt.isPresent() && !prefOpt.get().getPushEnabled()) {
            log.debug("用户[{}]已关闭推送，跳过推荐刷新生成", userId);
            return null;
        }

        // 检查今日是否已生成过推荐刷新通知
        LocalDate today = LocalDate.now(TimeZones.BUSINESS);
        LocalDateTime todayStart = today.atStartOfDay();
        List<PushSummary> todaySummaries = pushSummaryRepository
                .findByUserIdAndGeneratedAtAfter(userId, todayStart);
        boolean alreadyGenerated = todaySummaries.stream()
                .anyMatch(s -> "recommend_refresh".equals(s.getSummaryType()));
        if (alreadyGenerated) {
            log.debug("用户[{}]今日已生成推荐刷新通知，跳过", userId);
            return todaySummaries.stream()
                    .filter(s -> "recommend_refresh".equals(s.getSummaryType()))
                    .findFirst().orElse(null);
        }

        // 获取推荐偏好时间
        Optional<RecommendationPreference> recPrefOpt =
                recommendationPreferenceRepository.findByUserId(userId);
        String preferredTime = recPrefOpt
                .map(RecommendationPreference::getPreferredTime)
                .orElse("12:00");

        // 判断当前时间是否已达到或超过偏好时间
        LocalTime now = LocalTime.now(TimeZones.BUSINESS);
        LocalTime prefTime;
        try {
            prefTime = LocalTime.parse(preferredTime, TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            // 用户偏好时间格式不合法时降级使用默认 12:00
            log.warn("用户[{}]推荐偏好时间格式无效: {}, 使用默认 12:00", userId, preferredTime);
            prefTime = LocalTime.of(12, 0);
        }

        if (now.isBefore(prefTime)) {
            log.debug("用户[{}]当前时间 {} 未到推荐刷新时间 {}", userId, now, prefTime);
            return null;
        }

        // 构建推荐刷新通知
        String title = "今日推荐已更新";
        String content = "你的每日推荐人选已刷新，快去看看有没有心动的TA吧！";
        String actionUrl = "/pages/discover/index";

        PushSummary summary = new PushSummary();
        summary.setUserId(userId);
        summary.setSummaryType("recommend_refresh");
        summary.setTitle(title);
        summary.setContent(content);
        summary.setActionUrl(actionUrl);
        summary.setIsSent(false);
        summary.setGeneratedAt(LocalDateTime.now(TimeZones.BUSINESS));

        PushSummary saved = pushSummaryRepository.save(summary);
        log.info("用户[{}]推荐刷新通知已生成: preferredTime={}", userId, preferredTime);
        return saved;
    }

    /**
     * 标记指定摘要为已发送。
     * 使用 SecurityUtils.getCurrentUserId() 验证当前用户权限，
     * 仅允许摘要的所属用户标记自己的摘要为已发送。
     *
     * @param summaryId 摘要 ID
     * @return 更新后的推送摘要
     */
    @Override
    @Transactional
    public PushSummary markSent(Long summaryId) {
        if (summaryId == null) {
            throw new IllegalArgumentException("summaryId is required");
        }

        PushSummary summary = pushSummaryRepository.findById(summaryId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "PushSummary not found: " + summaryId));

        // 权限校验：仅允许摘要所属用户操作
        try {
            Long currentUserId = SecurityUtils.getCurrentUserId();
            if (!currentUserId.equals(summary.getUserId())) {
                log.warn("用户[{}]尝试标记非所属摘要[{}]为已发送（摘要所属用户: {}），操作已拒绝",
                        currentUserId, summaryId, summary.getUserId());
                throw new IllegalArgumentException(ErrorMessages.PUSH_SUMMARY_FORBIDDEN);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (HttpClientErrorException e) {
            // 未认证或无法获取用户ID时，拒绝操作
            log.warn("无法获取当前用户ID，拒绝标记推送摘要[{}]为已发送: {}", summaryId, e.getMessage());
            throw new IllegalStateException(ErrorMessages.PUSH_MARK_UNAUTHENTICATED, e);
        }

        summary.setIsSent(true);
        summary.setSentAt(LocalDateTime.now(TimeZones.BUSINESS));

        PushSummary saved = pushSummaryRepository.save(summary);
        log.debug("推送摘要[{}]已标记为已发送", summaryId);
        return saved;
    }
}