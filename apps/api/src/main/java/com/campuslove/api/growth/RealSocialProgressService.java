package com.campuslove.api.growth;

import com.campuslove.api.common.TimeZones;
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
    // 缺陷修复（走查）：getProgress 内部调用 getOrCreateProgress 可能创建进度记录（写库），
    // 原 @Transactional(readOnly = true) 在 MySQL 只读连接下执行写操作会抛
    // "Connection is read-only" 异常导致 500，改为读写事务
    @Transactional
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
    // 修复（R4-00327 埋点事务隔离，2026-08-09）：推荐链路在只读事务内调用本方法
    // （RealRecommendationService.getRecommendations @Transactional(readOnly=true) →
    // RecommendationCacheManager.getCachedRecommendations → recordExposure），
    // 原 REQUIRED 传播会加入外层只读事务：懒创建 INSERT 被 MySQL 只读连接拒绝 → 事务被
    // 标记 rollback-only → 提交期抛 UnexpectedRollbackException → 500。REQUIRES_NEW 强制
    // 独立可写事务：埋点失败仅回滚埋点自身，异常在方法内抛出、可被调用方 catch 兜底。
    // C2（2026-11 第六轮修复波 W1）：计数改由数据库原子自增（incrementExposureCount），
    // 不再「读实体字段 + 加 + 写回」，并发不丢增量、也不再有该路径上的乐观锁冲突。
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void recordExposure(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementExposureCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.debug("用户[{}]曝光次数原子+1", userId);
    }

    /**
     * 记录一次喜欢/点赞事件，并原子自增 L2 喜欢计数（层级在同一 SQL 内单调重算）。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordLike(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementLikeCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.info("用户[{}]喜欢次数原子+1", userId);
    }

    /**
     * 记录一次匹配事件，并原子自增 L3 匹配计数。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordMatch(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementMatchCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.info("用户[{}]匹配次数原子+1", userId);
    }

    /**
     * 记录一次聊天事件，并原子自增 L4 聊天计数。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordChat(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementChatCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.info("用户[{}]聊天次数原子+1", userId);
    }

    /**
     * 记录一次社区互动事件，并原子自增 L5 社区计数。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordCircleActivity(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementCircleCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.info("用户[{}]社区互动次数原子+1", userId);
    }

    /**
     * 记录一次活动参与事件，并原子自增 L6 活动计数。
     *
     * @param userId 用户 ID
     */
    @Override
    @Transactional
    public void recordActivityParticipation(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        getOrCreateProgress(userId);
        socialProgressRepository.incrementActivityCount(userId, LocalDateTime.now(TimeZones.BUSINESS));

        log.info("用户[{}]活动参与次数原子+1", userId);
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
                newProgress.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
                return socialProgressRepository.save(newProgress);
            });
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