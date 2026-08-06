package com.campuslove.api.match;

import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.HeartSignal.SignalStatus;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Like.LikeStatus;
import com.campuslove.api.entity.PassRecord;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.PassRecordRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

/**
 * 匹配算法核心组件。
 *
 * <p>职责：实现匹配候选用户的筛选与评分逻辑，包括：</p>
 * <ul>
 *   <li>{@link #getExcludedUserIds}：计算排除集合（自己 + 已喜欢 + 已有信号 + 已 pass）</li>
 *   <li>{@link #findAndScoreCandidates}：分页查询候选用户并按推荐分数排序</li>
 *   <li>{@link #calculateMatchScore}：基于校区/城市/兴趣标签/日程重叠计算推荐分数</li>
 *   <li>{@link #selectFromTopCandidates}：从 Top-N 候选中随机选择匹配对象</li>
 *   <li>{@link #hasScheduleOverlap} / {@link #parseInterestTags}：辅助解析方法</li>
 * </ul>
 *
 * <p>从 RealMatchService 拆分而来（Task 4.2.1）。
 * 该组件不持久化任何状态，仅做读取与计算，便于单元测试与复用。</p>
 */
@Profile("real")
@Component
public class MatchEngine {

    private final MatchConfig matchConfig;
    private final LikeRepository likeRepository;
    private final HeartSignalRepository heartSignalRepository;
    private final PassRecordRepository passRecordRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserScheduleProfileRepository userScheduleProfileRepository;
    private final ObjectMapper objectMapper;

    public MatchEngine(
            MatchConfig matchConfig,
            LikeRepository likeRepository,
            HeartSignalRepository heartSignalRepository,
            PassRecordRepository passRecordRepository,
            UserRepository userRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserScheduleProfileRepository userScheduleProfileRepository,
            ObjectMapper objectMapper) {
        this.matchConfig = matchConfig;
        this.likeRepository = likeRepository;
        this.heartSignalRepository = heartSignalRepository;
        this.passRecordRepository = passRecordRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userScheduleProfileRepository = userScheduleProfileRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 获取应排除的用户 ID 集合（自己 + 已喜欢用户 + 已有活跃心动信号的用户 + 已 pass 的用户）。
     * 使用 Set 替代 List 提高查找性能。
     *
     * @param userId 当前用户 ID
     * @return 应排除的用户 ID 集合
     */
    public Set<Long> getExcludedUserIds(Long userId) {
        Set<Long> excluded = new HashSet<>();
        excluded.add(userId);

        // 排除已喜欢的用户
        List<Like> activeLikes = likeRepository.findByUserIdAndStatus(userId, LikeStatus.active);
        for (Like like : activeLikes) {
            excluded.add(like.getTargetUserId());
        }

        // 排除已有活跃心动信号的用户（pending 和 accepted 状态）
        List<HeartSignal> pendingSignals = heartSignalRepository
                .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.pending);
        List<HeartSignal> acceptedSignals = heartSignalRepository
                .findByUserAIdOrUserBIdAndStatus(userId, userId, SignalStatus.accepted);

        for (HeartSignal signal : pendingSignals) {
            excluded.add(signal.getUserAId().equals(userId) ? signal.getUserBId() : signal.getUserAId());
        }
        for (HeartSignal signal : acceptedSignals) {
            excluded.add(signal.getUserAId().equals(userId) ? signal.getUserBId() : signal.getUserAId());
        }

        // 排除已 pass 的用户
        List<PassRecord> passRecords = passRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (PassRecord passRecord : passRecords) {
            excluded.add(passRecord.getPassedUserId());
        }

        return excluded;
    }

    /**
     * 使用分页查询获取候选用户，并基于推荐分数加权排序。
     * 加权维度：同校区 / 同城市 / 兴趣标签匹配 / 日程重叠。
     *
     * @param userId          当前用户 ID
     * @param excludedUserIds 应排除的用户 ID 集合
     * @return 按推荐分数降序排列的候选列表
     */
    public List<ScoredCandidate> findAndScoreCandidates(Long userId, Set<Long> excludedUserIds) {
        // 1. 获取当前用户的校区和城市信息
        Optional<UserCampusProfile> myCampusOpt = userCampusProfileRepository.findByUserId(userId);
        String myCampusName = myCampusOpt.map(UserCampusProfile::getCampusName).orElse("");
        String myCityName = myCampusOpt.map(UserCampusProfile::getCityName).orElse("");

        // 2. 获取当前用户的日程偏好
        Optional<UserScheduleProfile> myScheduleOpt = userScheduleProfileRepository.findByUserId(userId);
        String myTimeWindow = myScheduleOpt.map(UserScheduleProfile::getPreferredTimeWindowJson).orElse("{}");

        // 3. 获取当前用户的兴趣标签
        Set<String> myTags = userBasicProfileRepository.findByUserId(userId)
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());

        // 4. 使用分页查询获取候选用户
        List<User> pagedUsers = userRepository.findAll(
                PageRequest.of(0, matchConfig.getCandidatePageSize())).getContent();

        // 5. infra R2-00017 修复：批量预加载候选用户的三类档案，消除评分 N+1
        //   （原实现对每个候选调用 3 次 findByUserId，50 候选 = 150+ 查询/次匹配）
        List<Long> candidateIds = pagedUsers.stream()
                .filter(u -> !excludedUserIds.contains(u.getId()))
                .map(User::getId)
                .toList();
        Map<Long, UserCampusProfile> campusById = userCampusProfileRepository
                .findByUserIdIn(candidateIds).stream()
                .collect(java.util.stream.Collectors.toMap(UserCampusProfile::getUserId, p -> p));
        Map<Long, Set<String>> tagsById = userBasicProfileRepository
                .findByUserIdIn(candidateIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.campuslove.api.entity.UserBasicProfile::getUserId,
                        p -> parseInterestTags(p.getInterestTags())));
        Map<Long, String> scheduleById = userScheduleProfileRepository
                .findByUserIdIn(candidateIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.campuslove.api.entity.UserScheduleProfile::getUserId,
                        com.campuslove.api.entity.UserScheduleProfile::getPreferredTimeWindowJson));

        // 6. 计算推荐分数（纯内存计算，无数据库访问）
        List<ScoredCandidate> scoredCandidates = new ArrayList<>();
        for (User candidate : pagedUsers) {
            if (excludedUserIds.contains(candidate.getId())) {
                continue;
            }
            int score = calculateMatchScoreFromMaps(
                    candidate.getId(), myCampusName, myCityName, myTags, myTimeWindow,
                    campusById, tagsById, scheduleById);
            scoredCandidates.add(new ScoredCandidate(candidate, score));
        }

        // 7. 按推荐分数降序排序
        scoredCandidates.sort(Comparator.comparingInt(ScoredCandidate::score).reversed());

        return scoredCandidates;
    }

    /**
     * infra R2-00017：基于批量预加载的档案 Map 计算匹配分数（无数据库访问）。
     *
     * @param candidateUserId 候选用户 ID
     * @param myCampusName    当前用户校区名称
     * @param myCityName      当前用户城市名称
     * @param myTags          当前用户兴趣标签集合
     * @param myTimeWindow    当前用户日程时间窗口 JSON
     * @param campusById      候选用户校区档案（按 userId 索引）
     * @param tagsById        候选用户兴趣标签（按 userId 索引）
     * @param scheduleById    候选用户日程偏好（按 userId 索引）
     * @return 推荐分数
     */
    public int calculateMatchScoreFromMaps(
            Long candidateUserId, String myCampusName, String myCityName,
            Set<String> myTags, String myTimeWindow,
            Map<Long, UserCampusProfile> campusById,
            Map<Long, Set<String>> tagsById,
            Map<Long, String> scheduleById) {
        int score = 0;

        // 同校区 + 同城市
        UserCampusProfile campus = campusById.get(candidateUserId);
        if (campus != null) {
            if (myCampusName.equals(campus.getCampusName())) {
                score += matchConfig.getCampusWeight();
            }
            if (myCityName.equals(campus.getCityName())) {
                score += matchConfig.getCityWeight();
            }
        }

        // 兴趣标签匹配
        if (!myTags.isEmpty()) {
            Set<String> candidateTags = tagsById.getOrDefault(candidateUserId, Collections.emptySet());
            long commonTagCount = myTags.stream()
                    .filter(candidateTags::contains)
                    .count();
            score += (int) commonTagCount * matchConfig.getInterestWeight();
        }

        // 日程重叠
        String candidateSchedule = scheduleById.get(candidateUserId);
        if (candidateSchedule != null && hasScheduleOverlap(myTimeWindow, candidateSchedule)) {
            score += matchConfig.getScheduleWeight();
        }

        return score;
    }

    /**
     * 计算候选用户的匹配推荐分数。
     * - 同校区: +campusWeight
     * - 同城市: +cityWeight
     * - 兴趣标签匹配: +interestWeight 每个匹配
     * - 日程重叠: +scheduleWeight
     *
     * @param candidateUserId 候选用户 ID
     * @param myCampusName    当前用户校区名称
     * @param myCityName      当前用户城市名称
     * @param myTags          当前用户兴趣标签集合
     * @param myTimeWindow    当前用户日程时间窗口 JSON
     * @return 推荐分数
     */
    public int calculateMatchScore(Long candidateUserId, String myCampusName,
                                    String myCityName, Set<String> myTags, String myTimeWindow) {
        int score = 0;

        // 同校区 + 同城市
        Optional<UserCampusProfile> campusOpt = userCampusProfileRepository.findByUserId(candidateUserId);
        if (campusOpt.isPresent()) {
            UserCampusProfile campus = campusOpt.get();
            if (myCampusName.equals(campus.getCampusName())) {
                score += matchConfig.getCampusWeight();
            }
            if (myCityName.equals(campus.getCityName())) {
                score += matchConfig.getCityWeight();
            }
        }

        // 兴趣标签匹配
        if (!myTags.isEmpty()) {
            Set<String> candidateTags = userBasicProfileRepository.findByUserId(candidateUserId)
                    .map(profile -> parseInterestTags(profile.getInterestTags()))
                    .orElse(Collections.emptySet());
            long commonTagCount = myTags.stream()
                    .filter(candidateTags::contains)
                    .count();
            score += (int) commonTagCount * matchConfig.getInterestWeight();
        }

        // 日程重叠
        Optional<UserScheduleProfile> scheduleOpt = userScheduleProfileRepository.findByUserId(candidateUserId);
        if (scheduleOpt.isPresent() && hasScheduleOverlap(myTimeWindow, scheduleOpt.get().getPreferredTimeWindowJson())) {
            score += matchConfig.getScheduleWeight();
        }

        return score;
    }

    /**
     * 从 Top-N 候选中随机选择一个匹配对象。
     * 取前 5 个高分候选（或全部候选，如果不足 5 个），从中随机选择，
     * 兼顾匹配质量和随机性，避免总是匹配最高分用户。
     *
     * @param scoredCandidates 已排序的候选列表
     * @return 被选中的用户
     */
    public User selectFromTopCandidates(List<ScoredCandidate> scoredCandidates) {
        int topN = Math.min(5, scoredCandidates.size());
        int selectedIndex = ThreadLocalRandom.current().nextInt(topN);
        return scoredCandidates.get(selectedIndex).user();
    }

    /**
     * 检查两个用户的日程时间窗口是否有重叠。
     * 简化实现：JSON 字符串解析后比较键集合是否有交集。
     *
     * @param myTimeWindow       当前用户时间窗口 JSON
     * @param candidateTimeWindow 候选用户时间窗口 JSON
     * @return true 表示有重叠
     */
    public boolean hasScheduleOverlap(String myTimeWindow, String candidateTimeWindow) {
        if (myTimeWindow == null || myTimeWindow.isBlank()
                || candidateTimeWindow == null || candidateTimeWindow.isBlank()) {
            return false;
        }
        try {
            Map<String, Object> myMap = objectMapper.readValue(myTimeWindow, new TypeReference<>() {});
            Map<String, Object> candidateMap = objectMapper.readValue(candidateTimeWindow, new TypeReference<>() {});
            for (String key : myMap.keySet()) {
                if (candidateMap.containsKey(key)) {
                    return true;
                }
            }
        } catch (JsonProcessingException e) {
            return false;
        }
        return false;
    }

    /**
     * 解析兴趣标签 JSON 字符串为 Set 集合。
     * JSON 格式示例: ["摄影", "篮球", "阅读", "编程"]
     * 解析失败时返回空集合。
     *
     * @param interestTagsJson 兴趣标签 JSON 字符串
     * @return 兴趣标签集合
     */
    public Set<String> parseInterestTags(String interestTagsJson) {
        if (interestTagsJson == null || interestTagsJson.isBlank()) {
            return Collections.emptySet();
        }
        try {
            List<String> tags = objectMapper.readValue(interestTagsJson, new TypeReference<List<String>>() {});
            return new HashSet<>(tags);
        } catch (JsonProcessingException e) {
            return Collections.emptySet();
        }
    }

    /**
     * 匹配候选加权排序用的内部记录。
     * 公开以便 RealMatchService 与 MatchRecorder 复用。
     */
    public record ScoredCandidate(User user, int score) {}
}
