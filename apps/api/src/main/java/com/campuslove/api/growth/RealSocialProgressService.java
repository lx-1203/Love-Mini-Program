package com.campuslove.api.growth;

import com.campuslove.api.entity.SocialProgress;
import com.campuslove.api.repository.SocialProgressRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实社交升温漏斗服务实现。
 * 在 real profile 下激活，使用 SocialProgressRepository 实现数据库持久化。
 * <p>
 * 六层漏斗模型：
 * <ul>
 *   <li>L1_EXPOSURE（发现心动）：默认层级，仅需要被推荐曝光</li>
 *   <li>L2_ATTENTION（表达喜欢）：like_count >= 1</li>
 *   <li>L3_MATCH（双向匹配）：match_count >= 1</li>
 *   <li>L4_COMMUNICATION（开启对话）：chat_count >= 1</li>
 *   <li>L5_CIRCLE（参与社区）：circle_count >= 1</li>
 *   <li>L6_SCENE（线下见面）：activity_count >= 1</li>
 * </ul>
 */
@Profile("real")
@Service
public class RealSocialProgressService implements SocialProgressService {

    private static final Logger log = LoggerFactory.getLogger(RealSocialProgressService.class);

    private final SocialProgressRepository socialProgressRepository;

    /**
     * 构造函数，注入社交进度 Repository。
     *
     * @param socialProgressRepository 社交进度数据访问层
     */
    public RealSocialProgressService(SocialProgressRepository socialProgressRepository) {
        this.socialProgressRepository = socialProgressRepository;
    }

    /**
     * 查询用户的社交升温进度。
     * <p>
     * 如果用户还没有社交进度记录，则自动创建一条默认记录（L1_EXPOSURE 层级）。
     *
     * @param userId 用户 ID
     * @return 社交进度视图
     */
    @Override
    @Transactional(readOnly = true)
    public SocialProgressView getProgress(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        String currentTier = progress.getCurrentTier();
        String nextAction = buildNextAction(currentTier);

        return new SocialProgressView(
            currentTier,
            progress.getExposureCount(),
            progress.getLikeCount(),
            progress.getMatchCount(),
            progress.getChatCount(),
            progress.getCircleCount(),
            progress.getActivityCount(),
            nextAction
        );
    }

    /**
     * 记录一次曝光事件。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordExposure(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setExposureCount(progress.getExposureCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());
        socialProgressRepository.save(progress);

        log.debug("用户[{}]曝光次数+1，当前曝光次数: {}", userId, progress.getExposureCount());
    }

    /**
     * 记录一次喜欢/点赞事件，并自动评估层级升级。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordLike(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setLikeCount(progress.getLikeCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());

        // 喜欢次数达到阈值后自动升级到 L2
        evaluateAndUpgradeTier(progress);
        socialProgressRepository.save(progress);

        log.info("用户[{}]喜欢次数+1，当前喜欢次数: {}，当前层级: {}",
            userId, progress.getLikeCount(), progress.getCurrentTier());
    }

    /**
     * 记录一次匹配事件，并自动评估层级升级。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordMatch(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setMatchCount(progress.getMatchCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());

        evaluateAndUpgradeTier(progress);
        socialProgressRepository.save(progress);

        log.info("用户[{}]匹配次数+1，当前匹配次数: {}，当前层级: {}",
            userId, progress.getMatchCount(), progress.getCurrentTier());
    }

    /**
     * 记录一次聊天事件，并自动评估层级升级。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordChat(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setChatCount(progress.getChatCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());

        evaluateAndUpgradeTier(progress);
        socialProgressRepository.save(progress);

        log.info("用户[{}]聊天次数+1，当前聊天次数: {}，当前层级: {}",
            userId, progress.getChatCount(), progress.getCurrentTier());
    }

    /**
     * 记录一次社区互动事件，并自动评估层级升级。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordCircleActivity(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setCircleCount(progress.getCircleCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());

        evaluateAndUpgradeTier(progress);
        socialProgressRepository.save(progress);

        log.info("用户[{}]社区互动次数+1，当前社区互动次数: {}，当前层级: {}",
            userId, progress.getCircleCount(), progress.getCurrentTier());
    }

    /**
     * 记录一次活动参与事件，并自动评估层级升级。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordActivityParticipation(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        SocialProgress progress = getOrCreateProgress(userId);
        progress.setActivityCount(progress.getActivityCount() + 1);
        progress.setUpdatedAt(LocalDateTime.now());

        evaluateAndUpgradeTier(progress);
        socialProgressRepository.save(progress);

        log.info("用户[{}]活动参与次数+1，当前活动参与次数: {}，当前层级: {}",
            userId, progress.getActivityCount(), progress.getCurrentTier());
    }

    // ---- 私有辅助方法 ----

    /**
     * 获取或创建用户的社交进度记录。
     * <p>
     * 如果用户尚未拥有社交进度记录，则创建默认的 L1_EXPOSURE 层级记录。
     *
     * @param userId 用户 ID
     * @return 社交进度实体
     */
    private SocialProgress getOrCreateProgress(Long userId) {
        return socialProgressRepository.findByUserId(userId)
            .orElseGet(() -> {
                log.info("用户[{}]尚无社交进度记录，创建默认 L1_EXPOSURE 层级记录", userId);
                SocialProgress newProgress = new SocialProgress();
                newProgress.setUserId(userId);
                newProgress.setCurrentTier("L1_EXPOSURE");
                newProgress.setExposureCount(0);
                newProgress.setLikeCount(0);
                newProgress.setMatchCount(0);
                newProgress.setChatCount(0);
                newProgress.setCircleCount(0);
                newProgress.setActivityCount(0);
                newProgress.setUpdatedAt(LocalDateTime.now());
                return socialProgressRepository.save(newProgress);
            });
    }

    /**
     * 根据当前各维度计数评估并自动升级层级。
     * <p>
     * 层级判断规则（从高到低检查，确保最高满足的层级生效）：
     * <ul>
     *   <li>L6_SCENE：activity_count >= 1</li>
     *   <li>L5_CIRCLE：circle_count >= 1</li>
     *   <li>L4_COMMUNICATION：chat_count >= 1</li>
     *   <li>L3_MATCH：match_count >= 1</li>
     *   <li>L2_ATTENTION：like_count >= 1</li>
     *   <li>L1_EXPOSURE：默认（无前置条件）</li>
     * </ul>
     * 层级只会升级，不会降级。
     *
     * @param progress 社交进度实体
     */
    private void evaluateAndUpgradeTier(SocialProgress progress) {
        String oldTier = progress.getCurrentTier();
        String newTier = determineTier(progress);

        if (!newTier.equals(oldTier)) {
            log.info("用户[{}]社交层级升级: {} -> {}", progress.getUserId(), oldTier, newTier);
            progress.setCurrentTier(newTier);
        }
    }

    /**
     * 根据各维度计数确定当前应处的最高层级。
     *
     * @param progress 社交进度实体
     * @return 层级编码
     */
    private String determineTier(SocialProgress progress) {
        if (progress.getActivityCount() >= 1) {
            return "L6_SCENE";
        }
        if (progress.getCircleCount() >= 1) {
            return "L5_CIRCLE";
        }
        if (progress.getChatCount() >= 1) {
            return "L4_COMMUNICATION";
        }
        if (progress.getMatchCount() >= 1) {
            return "L3_MATCH";
        }
        if (progress.getLikeCount() >= 1) {
            return "L2_ATTENTION";
        }
        return "L1_EXPOSURE";
    }

    /**
     * 根据当前层级构建下一步行动建议文案。
     *
     * @param currentTier 当前层级编码
     * @return 下一步行动建议
     */
    private String buildNextAction(String currentTier) {
        switch (currentTier) {
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