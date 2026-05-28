package com.campuslove.api.match;

import java.util.List;

/**
 * 破冰引导服务接口。
 * 提供基于匹配关系的破冰话题推荐功能。
 */
public interface IcebreakerService {

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
    List<IcebreakerView> getIcebreakers(Long matchId);

    /**
     * 匹配后智能破冰：基于双方共同兴趣、学校、圈子、每日一问答等维度
     * 生成 3 个个性化破冰话题。
     *
     * @param userId      当前用户 ID
     * @param matchUserId 匹配对方用户 ID
     * @return 个性化破冰话题列表（最多 3 个）
     */
    List<IcebreakerView> getMatchIcebreakers(Long userId, Long matchUserId);

    /**
     * 私信内破冰：基于对方资料（学校、专业、兴趣标签、圈子）生成话题建议。
     *
     * @param userId     当前用户 ID
     * @param peerUserId 对方用户 ID
     * @return 破冰话题建议列表
     */
    List<IcebreakerView> getProfileBasedIcebreakers(Long userId, Long peerUserId);

    /**
     * 获取通用模板话题（无触发条件的兜底话题）。
     *
     * @return 通用模板话题列表
     */
    List<IcebreakerView> getGenericIcebreakers();
}