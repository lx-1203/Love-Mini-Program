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
}
