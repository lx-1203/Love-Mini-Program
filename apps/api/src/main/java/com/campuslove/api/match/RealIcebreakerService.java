package com.campuslove.api.match;

import com.campuslove.api.entity.DailyAnswer;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.IcebreakerTopic;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.IcebreakerTopicRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 破冰引导服务真实实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供基于匹配关系的破冰话题推荐功能。
 * 推荐策略：共同兴趣标签 > 每日一问共同回答 > 通用破冰话题模板。
 */
@Profile("real")
@Service
public class RealIcebreakerService implements IcebreakerService {

    private static final Logger log = LoggerFactory.getLogger(RealIcebreakerService.class);

    /** 最大返回破冰话题数 */
    private static final int MAX_ICEBREAKERS = 3;

    private final HeartSignalRepository heartSignalRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final DailyAnswerRepository dailyAnswerRepository;
    private final IcebreakerTopicRepository icebreakerTopicRepository;
    private final ObjectMapper objectMapper;

    public RealIcebreakerService(
            HeartSignalRepository heartSignalRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            DailyAnswerRepository dailyAnswerRepository,
            IcebreakerTopicRepository icebreakerTopicRepository,
            ObjectMapper objectMapper) {
        this.heartSignalRepository = heartSignalRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.dailyAnswerRepository = dailyAnswerRepository;
        this.icebreakerTopicRepository = icebreakerTopicRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 获取匹配对的破冰话题推荐。
     * 推荐策略：
     * 1. 优先基于双方共同兴趣标签生成话题
     * 2. 其次基于每日一问共同回答生成话题
     * 3. 最后使用通用破冰话题模板
     *
     * @param matchId 匹配记录 ID（HeartSignal ID）
     * @return 破冰话题列表（最多 3 个）
     */
    @Override
    @Transactional(readOnly = true)
    public List<IcebreakerView> getIcebreakers(Long matchId) {
        if (matchId == null) {
            throw new IllegalArgumentException("matchId 不能为空");
        }

        // 查询匹配记录，获取双方用户 ID
        HeartSignal signal = heartSignalRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("匹配记录不存在: " + matchId));

        Long userAId = signal.getUserAId();
        Long userBId = signal.getUserBId();

        List<IcebreakerView> result = new ArrayList<>();

        // 策略1：基于双方共同兴趣标签生成话题
        List<IcebreakerView> interestBased = generateInterestBasedIcebreakers(userAId, userBId);
        result.addAll(interestBased);

        // 如果已达到最大数量，直接返回
        if (result.size() >= MAX_ICEBREAKERS) {
            return result.subList(0, MAX_ICEBREAKERS);
        }

        // 策略2：基于每日一问共同回答生成话题
        List<IcebreakerView> dailyQuestionBased = generateDailyQuestionIcebreakers(userAId, userBId);
        result.addAll(dailyQuestionBased);

        // 如果已达到最大数量，直接返回
        if (result.size() >= MAX_ICEBREAKERS) {
            return result.subList(0, MAX_ICEBREAKERS);
        }

        // 策略3：使用通用破冰话题模板填充剩余位置
        List<IcebreakerView> genericBased = generateGenericIcebreakers(MAX_ICEBREAKERS - result.size());
        result.addAll(genericBased);

        return result.size() > MAX_ICEBREAKERS ? result.subList(0, MAX_ICEBREAKERS) : result;
    }

    /**
     * 基于双方共同兴趣标签生成破冰话题。
     * 查找双方共同的兴趣标签，为每个共同标签生成一个话题。
     *
     * @param userAId 用户 A 的 ID
     * @param userBId 用户 B 的 ID
     * @return 基于共同兴趣的破冰话题列表
     */
    private List<IcebreakerView> generateInterestBasedIcebreakers(Long userAId, Long userBId) {
        Set<String> tagsA = getInterestTags(userAId);
        Set<String> tagsB = getInterestTags(userBId);

        // 求交集
        Set<String> commonTags = new HashSet<>(tagsA);
        commonTags.retainAll(tagsB);

        if (commonTags.isEmpty()) {
            return List.of();
        }

        List<IcebreakerView> result = new ArrayList<>();
        for (String tag : commonTags) {
            if (result.size() >= MAX_ICEBREAKERS) {
                break;
            }
            result.add(new IcebreakerView(
                    "你们都喜欢" + tag + "，可以聊聊这方面的话题！",
                    "interests",
                    "common_interest"
            ));
        }

        log.debug("基于共同兴趣生成 {} 个破冰话题, userA={}, userB={}", result.size(), userAId, userBId);
        return result;
    }

    /**
     * 基于每日一问共同回答生成破冰话题。
     * 查找双方最近回答过相同每日一问的记录，生成话题。
     *
     * @param userAId 用户 A 的 ID
     * @param userBId 用户 B 的 ID
     * @return 基于每日一问的破冰话题列表
     */
    private List<IcebreakerView> generateDailyQuestionIcebreakers(Long userAId, Long userBId) {
        // 查询用户 A 最近回答的每日一问
        List<DailyAnswer> answersA = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(userAId);
        if (answersA.isEmpty()) {
            return List.of();
        }

        // 取最近 5 个回答的问题 ID
        Set<Long> questionIdsA = new HashSet<>();
        for (int i = 0; i < Math.min(5, answersA.size()); i++) {
            if (answersA.get(i).getQuestion() != null) {
                questionIdsA.add(answersA.get(i).getQuestion().getId());
            }
        }

        // 查询用户 B 最近回答的每日一问
        List<DailyAnswer> answersB = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(userBId);

        // 查找共同回答的问题
        for (DailyAnswer answerB : answersB) {
            if (answerB.getQuestion() != null && questionIdsA.contains(answerB.getQuestion().getId())) {
                return List.of(new IcebreakerView(
                        "你们最近回答了同一个每日一问，可以聊聊各自的看法！",
                        "daily",
                        "daily_question"
                ));
            }
        }

        return List.of();
    }

    /**
     * 使用通用破冰话题模板生成话题。
     * 从 icebreaker_topics 表中随机选取指定数量的启用话题。
     *
     * @param count 需要的话题数量
     * @return 通用破冰话题列表
     */
    private List<IcebreakerView> generateGenericIcebreakers(int count) {
        List<IcebreakerTopic> allTopics = icebreakerTopicRepository.findByIsActiveTrue();
        if (allTopics.isEmpty()) {
            // 如果没有种子数据，返回默认话题
            return List.of(new IcebreakerView(
                    "可以先聊聊彼此的校园生活。",
                    "daily",
                    "generic"
            ));
        }

        // 随机选取指定数量的话题
        List<IcebreakerTopic> shuffled = new ArrayList<>(allTopics);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());

        List<IcebreakerView> result = new ArrayList<>();
        for (int i = 0; i < Math.min(count, shuffled.size()); i++) {
            IcebreakerTopic topic = shuffled.get(i);
            result.add(new IcebreakerView(
                    topic.getContent(),
                    topic.getCategory(),
                    "generic"
            ));
        }

        return result;
    }

    /**
     * 获取用户的兴趣标签集合。
     *
     * @param userId 用户 ID
     * @return 兴趣标签集合
     */
    private Set<String> getInterestTags(Long userId) {
        return userBasicProfileRepository.findByUserId(userId)
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());
    }

    /**
     * 解析兴趣标签 JSON 字符串为 Set 集合。
     *
     * @param interestTagsJson 兴趣标签 JSON 字符串
     * @return 兴趣标签集合
     */
    private Set<String> parseInterestTags(String interestTagsJson) {
        if (interestTagsJson == null || interestTagsJson.isBlank()) {
            return Collections.emptySet();
        }
        try {
            List<String> tags = objectMapper.readValue(interestTagsJson, new TypeReference<List<String>>() {});
            return new HashSet<>(tags);
        } catch (JsonProcessingException e) {
            log.warn("兴趣标签 JSON 解析失败: {}", interestTagsJson, e);
            return Collections.emptySet();
        }
    }
}
