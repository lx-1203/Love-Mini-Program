package com.campuslove.api.match;

import com.campuslove.api.entity.CircleMembership;
import com.campuslove.api.entity.DailyAnswer;
import com.campuslove.api.entity.HeartSignal;
import com.campuslove.api.entity.IcebreakerTopic;
import com.campuslove.api.entity.InterestCircle;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.CircleMembershipRepository;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.IcebreakerTopicRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 破冰引导服务真实实现。
 * 在 real profile 下激活，使用 Repository 实现数据库查询。
 * 提供基于匹配关系的破冰话题推荐功能。
 * 推荐策略：共同兴趣标签 > 同一学校/专业 > 共同圈子 > 每日一问共同回答 > 通用破冰话题模板。
 */
@Profile("real")
@Service
public class RealIcebreakerService implements IcebreakerService {

    private static final Logger log = LoggerFactory.getLogger(RealIcebreakerService.class);

    /** 最大返回破冰话题数 */
    private static final int MAX_ICEBREAKERS = 3;

    private final HeartSignalRepository heartSignalRepository;
    private final UserBasicProfileRepository userBasicProfileRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;
    private final DailyAnswerRepository dailyAnswerRepository;
    private final IcebreakerTopicRepository icebreakerTopicRepository;
    private final CircleMembershipRepository circleMembershipRepository;
    private final InterestCircleRepository interestCircleRepository;
    private final ObjectMapper objectMapper;

    public RealIcebreakerService(
            HeartSignalRepository heartSignalRepository,
            UserBasicProfileRepository userBasicProfileRepository,
            UserCampusProfileRepository userCampusProfileRepository,
            DailyAnswerRepository dailyAnswerRepository,
            IcebreakerTopicRepository icebreakerTopicRepository,
            CircleMembershipRepository circleMembershipRepository,
            InterestCircleRepository interestCircleRepository,
            ObjectMapper objectMapper) {
        this.heartSignalRepository = heartSignalRepository;
        this.userBasicProfileRepository = userBasicProfileRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
        this.dailyAnswerRepository = dailyAnswerRepository;
        this.icebreakerTopicRepository = icebreakerTopicRepository;
        this.circleMembershipRepository = circleMembershipRepository;
        this.interestCircleRepository = interestCircleRepository;
        this.objectMapper = objectMapper;
    }

    // ---- 已有方法：基于匹配记录ID的破冰推荐（保持向后兼容） ----

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

        // 复用 getMatchIcebreakers 的逻辑
        return getMatchIcebreakers(userAId, userBId);
    }

    // ---- Phase 2 新增方法 ----

    /**
     * 匹配后智能破冰：基于双方共同兴趣、学校、圈子、每日一问答等维度
     * 生成 3 个个性化破冰话题。
     *
     * @param userId      当前用户 ID
     * @param matchUserId 匹配对方用户 ID
     * @return 个性化破冰话题列表（最多 3 个）
     */
    @Override
    @Transactional(readOnly = true)
    public List<IcebreakerView> getMatchIcebreakers(Long userId, Long matchUserId) {
        if (userId == null || matchUserId == null) {
            throw new IllegalArgumentException("userId 和 matchUserId 不能为空");
        }

        List<IcebreakerView> result = new ArrayList<>();

        // 策略1：基于双方共同兴趣标签
        result.addAll(buildCommonInterestIcebreakers(userId, matchUserId, MAX_ICEBREAKERS - result.size()));
        if (result.size() >= MAX_ICEBREAKERS) return result.subList(0, MAX_ICEBREAKERS);

        // 策略2：基于同一学校/专业
        result.addAll(buildCampusBasedIcebreakers(userId, matchUserId, MAX_ICEBREAKERS - result.size()));
        if (result.size() >= MAX_ICEBREAKERS) return result.subList(0, MAX_ICEBREAKERS);

        // 策略3：基于共同圈子
        result.addAll(buildCommonCircleIcebreakers(userId, matchUserId, MAX_ICEBREAKERS - result.size()));
        if (result.size() >= MAX_ICEBREAKERS) return result.subList(0, MAX_ICEBREAKERS);

        // 策略4：基于每日一问共同回答
        result.addAll(buildCommonAnswerIcebreakers(userId, matchUserId, MAX_ICEBREAKERS - result.size()));
        if (result.size() >= MAX_ICEBREAKERS) return result.subList(0, MAX_ICEBREAKERS);

        // 策略5：通用模板兜底
        result.addAll(buildGenericIcebreakers(MAX_ICEBREAKERS - result.size()));

        return result.size() > MAX_ICEBREAKERS ? result.subList(0, MAX_ICEBREAKERS) : result;
    }

    /**
     * 私信内破冰：基于对方资料（学校、专业、兴趣标签、圈子）生成话题建议。
     *
     * @param userId     当前用户 ID
     * @param peerUserId 对方用户 ID
     * @return 破冰话题建议列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<IcebreakerView> getProfileBasedIcebreakers(Long userId, Long peerUserId) {
        if (userId == null || peerUserId == null) {
            throw new IllegalArgumentException("userId 和 peerUserId 不能为空");
        }

        List<IcebreakerView> result = new ArrayList<>();

        // 获取对方资料
        UserBasicProfile peerBasic = userBasicProfileRepository.findByUserId(peerUserId).orElse(null);
        UserCampusProfile peerCampus = userCampusProfileRepository.findByUserId(peerUserId).orElse(null);

        if (peerBasic == null) {
            // 对方无资料，返回通用话题
            return getGenericIcebreakers();
        }

        // 基于对方兴趣标签生成
        Set<String> peerInterests = parseInterestTags(peerBasic.getInterestTags());
        if (!peerInterests.isEmpty()) {
            String interest = peerInterests.iterator().next();
            List<IcebreakerTopic> templates = icebreakerTopicRepository
                    .findByTriggerConditionAndIsActiveTrue("common_interest");
            if (!templates.isEmpty()) {
                IcebreakerTopic template = templates.get(0);
                String content = template.getContent().replace("{interest}", interest);
                result.add(new IcebreakerView(content, template.getCategory(), "common_interest", template.getId()));
            }
        }

        // 基于对方学校信息生成
        if (peerCampus != null && result.size() < MAX_ICEBREAKERS) {
            List<IcebreakerTopic> campusTemplates = icebreakerTopicRepository
                    .findByTriggerConditionAndIsActiveTrue("same_school");
            if (!campusTemplates.isEmpty()) {
                IcebreakerTopic template = campusTemplates.get(0);
                String content = template.getContent()
                        .replace("{school}", peerCampus.getCampusName())
                        .replace("{place}", "图书馆");
                result.add(new IcebreakerView(content, template.getCategory(), "same_school", template.getId()));
            }
        }

        // 基于对方专业信息生成
        if (peerCampus != null && result.size() < MAX_ICEBREAKERS) {
            List<IcebreakerTopic> profTemplates = icebreakerTopicRepository
                    .findByTriggerConditionAndIsActiveTrue("same_profession");
            if (!profTemplates.isEmpty()) {
                IcebreakerTopic template = profTemplates.get(0);
                String content = template.getContent()
                        .replace("{profession}", peerCampus.getDepartmentName());
                result.add(new IcebreakerView(content, template.getCategory(), "same_profession", template.getId()));
            }
        }

        // 基于对方圈子信息生成
        if (result.size() < MAX_ICEBREAKERS) {
            List<CircleMembership> memberships = circleMembershipRepository.findByUserId(peerUserId);
            if (!memberships.isEmpty()) {
                CircleMembership membership = memberships.get(0);
                InterestCircle circle = membership.getCircle();
                List<IcebreakerTopic> circleTemplates = icebreakerTopicRepository
                        .findByTriggerConditionAndIsActiveTrue("common_circle");
                if (!circleTemplates.isEmpty()) {
                    IcebreakerTopic template = circleTemplates.get(0);
                    String content = template.getContent().replace("{circle}", circle.getName());
                    result.add(new IcebreakerView(content, template.getCategory(), "common_circle", template.getId()));
                }
            }
        }

        // 兜底：通用模板
        if (result.size() < MAX_ICEBREAKERS) {
            result.addAll(buildGenericIcebreakers(MAX_ICEBREAKERS - result.size()));
        }

        return result.size() > MAX_ICEBREAKERS ? result.subList(0, MAX_ICEBREAKERS) : result;
    }

    /**
     * 获取通用模板话题（无触发条件的兜底话题）。
     *
     * @return 通用模板话题列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<IcebreakerView> getGenericIcebreakers() {
        List<IcebreakerTopic> topics = icebreakerTopicRepository.findByTriggerConditionIsNullAndIsActiveTrue();
        if (topics.isEmpty()) {
            // 如果无触发条件的模板为空，回退到所有已启用的模板
            topics = icebreakerTopicRepository.findByIsActiveTrue();
        }
        if (topics.isEmpty()) {
            return List.of(new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "general"));
        }

        // 随机选取最多 MAX_ICEBREAKERS 个
        List<IcebreakerTopic> shuffled = new ArrayList<>(topics);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());

        List<IcebreakerView> result = new ArrayList<>();
        for (int i = 0; i < Math.min(MAX_ICEBREAKERS, shuffled.size()); i++) {
            IcebreakerTopic topic = shuffled.get(i);
            result.add(new IcebreakerView(topic.getContent(), topic.getCategory(), "general", topic.getId()));
        }
        return result;
    }

    // ==================== 私有辅助方法 ====================

    /**
     * 基于双方共同兴趣标签构建破冰话题。
     */
    private List<IcebreakerView> buildCommonInterestIcebreakers(Long userId, Long matchUserId, int maxCount) {
        Set<String> tagsA = getInterestTags(userId);
        Set<String> tagsB = getInterestTags(matchUserId);

        Set<String> commonTags = new HashSet<>(tagsA);
        commonTags.retainAll(tagsB);

        if (commonTags.isEmpty()) {
            return List.of();
        }

        // 获取 common_interest 触发条件的模板
        List<IcebreakerTopic> templates = icebreakerTopicRepository
                .findByTriggerConditionAndIsActiveTrue("common_interest");

        List<IcebreakerView> result = new ArrayList<>();
        for (String tag : commonTags) {
            if (result.size() >= maxCount) break;

            if (!templates.isEmpty()) {
                IcebreakerTopic template = templates.get(0);
                String content = template.getContent().replace("{interest}", tag);
                result.add(new IcebreakerView(content, template.getCategory(), "common_interest", template.getId()));
            } else {
                result.add(new IcebreakerView(
                        "你们都喜欢" + tag + "，可以聊聊这方面的话题！", "interests", "common_interest"));
            }
        }

        log.debug("基于共同兴趣生成 {} 个破冰话题, user={}, matchUser={}", result.size(), userId, matchUserId);
        return result;
    }

    /**
     * 基于同一学校/专业构建破冰话题。
     */
    private List<IcebreakerView> buildCampusBasedIcebreakers(Long userId, Long matchUserId, int maxCount) {
        UserCampusProfile campusA = userCampusProfileRepository.findByUserId(userId).orElse(null);
        UserCampusProfile campusB = userCampusProfileRepository.findByUserId(matchUserId).orElse(null);

        if (campusA == null || campusB == null) {
            return List.of();
        }

        List<IcebreakerView> result = new ArrayList<>();

        // 检查同一学校
        if (result.size() < maxCount && campusA.getCampusName().equals(campusB.getCampusName())) {
            List<IcebreakerTopic> templates = icebreakerTopicRepository
                    .findByTriggerConditionAndIsActiveTrue("same_school");
            if (!templates.isEmpty()) {
                IcebreakerTopic template = templates.get(0);
                String content = template.getContent()
                        .replace("{school}", campusA.getCampusName())
                        .replace("{place}", "图书馆");
                result.add(new IcebreakerView(content, template.getCategory(), "same_school", template.getId()));
            }
        }

        // 检查同一专业
        if (result.size() < maxCount && campusA.getDepartmentName().equals(campusB.getDepartmentName())) {
            List<IcebreakerTopic> templates = icebreakerTopicRepository
                    .findByTriggerConditionAndIsActiveTrue("same_profession");
            if (!templates.isEmpty()) {
                IcebreakerTopic template = templates.get(0);
                String content = template.getContent()
                        .replace("{profession}", campusA.getDepartmentName());
                result.add(new IcebreakerView(content, template.getCategory(), "same_profession", template.getId()));
            }
        }

        return result;
    }

    /**
     * 基于共同圈子构建破冰话题。
     */
    private List<IcebreakerView> buildCommonCircleIcebreakers(Long userId, Long matchUserId, int maxCount) {
        List<CircleMembership> membershipsA = circleMembershipRepository.findByUserId(userId);
        List<CircleMembership> membershipsB = circleMembershipRepository.findByUserId(matchUserId);

        // 获取双方共同的圈子
        Set<Long> circleIdsA = membershipsA.stream()
                .map(m -> m.getCircle().getId())
                .collect(Collectors.toSet());
        Set<Long> commonCircleIds = new HashSet<>();
        for (CircleMembership mb : membershipsB) {
            if (circleIdsA.contains(mb.getCircle().getId())) {
                commonCircleIds.add(mb.getCircle().getId());
            }
        }

        if (commonCircleIds.isEmpty()) {
            return List.of();
        }

        List<IcebreakerTopic> templates = icebreakerTopicRepository
                .findByTriggerConditionAndIsActiveTrue("common_circle");

        List<IcebreakerView> result = new ArrayList<>();
        for (Long circleId : commonCircleIds) {
            if (result.size() >= maxCount) break;

            InterestCircle circle = interestCircleRepository.findById(circleId).orElse(null);
            if (circle == null) continue;

            if (!templates.isEmpty()) {
                IcebreakerTopic template = templates.get(0);
                String content = template.getContent().replace("{circle}", circle.getName());
                result.add(new IcebreakerView(content, template.getCategory(), "common_circle", template.getId()));
            } else {
                result.add(new IcebreakerView(
                        "你们都在" + circle.getName() + "圈子里，可以聊聊共同的兴趣爱好！",
                        "circles", "common_circle"));
            }
        }

        return result;
    }

    /**
     * 基于每日一问共同回答构建破冰话题。
     */
    private List<IcebreakerView> buildCommonAnswerIcebreakers(Long userId, Long matchUserId, int maxCount) {
        List<DailyAnswer> answersA = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (answersA.isEmpty()) {
            return List.of();
        }

        // 取用户 A 最近 5 个回答的问题 ID
        Set<Long> questionIdsA = new HashSet<>();
        for (int i = 0; i < Math.min(5, answersA.size()); i++) {
            if (answersA.get(i).getQuestion() != null) {
                questionIdsA.add(answersA.get(i).getQuestion().getId());
            }
        }

        // 查询用户 B 最近回答的每日一问
        List<DailyAnswer> answersB = dailyAnswerRepository.findByUserIdOrderByCreatedAtDesc(matchUserId);

        // 查找共同回答的问题
        for (DailyAnswer answerB : answersB) {
            if (answerB.getQuestion() != null && questionIdsA.contains(answerB.getQuestion().getId())) {
                List<IcebreakerTopic> templates = icebreakerTopicRepository
                        .findByTriggerConditionAndIsActiveTrue("common_answer");
                if (!templates.isEmpty()) {
                    IcebreakerTopic template = templates.get(0);
                    return List.of(new IcebreakerView(
                            template.getContent(), template.getCategory(), "common_answer", template.getId()));
                }
                return List.of(new IcebreakerView(
                        "你们最近回答了同一个每日一问，可以聊聊各自的看法！",
                        "daily", "common_answer"));
            }
        }

        return List.of();
    }

    /**
     * 构建通用兜底破冰话题。
     */
    private List<IcebreakerView> buildGenericIcebreakers(int count) {
        List<IcebreakerTopic> topics = icebreakerTopicRepository.findByTriggerConditionIsNullAndIsActiveTrue();
        if (topics.isEmpty()) {
            topics = icebreakerTopicRepository.findByIsActiveTrue();
        }
        if (topics.isEmpty()) {
            return List.of(new IcebreakerView("可以先聊聊彼此的校园生活。", "daily", "general"));
        }

        List<IcebreakerTopic> shuffled = new ArrayList<>(topics);
        Collections.shuffle(shuffled, ThreadLocalRandom.current());

        List<IcebreakerView> result = new ArrayList<>();
        for (int i = 0; i < Math.min(count, shuffled.size()); i++) {
            IcebreakerTopic topic = shuffled.get(i);
            result.add(new IcebreakerView(topic.getContent(), topic.getCategory(), "general", topic.getId()));
        }

        return result;
    }

    /**
     * 获取用户的兴趣标签集合。
     */
    private Set<String> getInterestTags(Long userId) {
        return userBasicProfileRepository.findByUserId(userId)
                .map(profile -> parseInterestTags(profile.getInterestTags()))
                .orElse(Collections.emptySet());
    }

    /**
     * 解析兴趣标签 JSON 字符串为 Set 集合。
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