package com.campuslove.api.block;

import java.util.List;

/**
 * 用户拉黑服务接口（3-F 拉黑）。
 *
 * <p>提供拉黑、解除拉黑、被拉黑列表查询，以及供消息/会话/推荐链路复用的
 * 拉黑关系判定能力。</p>
 */
public interface BlockService {

    /**
     * 拉黑目标用户（幂等：已拉黑则直接返回，不产生重复记录）。
     *
     * @param userId       当前用户 ID（拉黑发起方）
     * @param targetUserId 目标用户 ID（被拉黑）
     * @throws IllegalArgumentException 拉黑自己时抛出
     */
    void block(Long userId, Long targetUserId);

    /**
     * 解除拉黑（幂等：未拉黑则无操作）。
     *
     * @param userId       当前用户 ID
     * @param targetUserId 目标用户 ID
     */
    void unblock(Long userId, Long targetUserId);

    /**
     * 查询当前用户的被拉黑用户列表（含对方昵称/头像，按拉黑时间倒序）。
     *
     * @param userId 当前用户 ID
     * @return 被拉黑用户视图列表
     */
    List<BlockedUserView> getBlockedUsers(Long userId);

    /**
     * 判断两个用户之间是否存在拉黑关系（任一方拉黑另一方）。
     *
     * <p>供消息发送拦截 / 会话过滤 / 推荐排除复用。</p>
     *
     * @param userId  用户 A ID
     * @param otherId 用户 B ID
     * @return 存在拉黑关系时为 true
     */
    boolean isBlockedBetween(Long userId, Long otherId);

    /**
     * 查询与当前用户存在拉黑关系的全部对方用户 ID（双向并集，去重）。
     *
     * <p>供会话列表过滤与推荐/匹配候选排除复用。</p>
     *
     * @param userId 当前用户 ID
     * @return 存在拉黑关系的对方用户 ID 列表
     */
    List<Long> getBlockedRelationUserIds(Long userId);
}
