package com.campuslove.api.repository;

import com.campuslove.api.entity.UserFollow;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 用户关注关系 Repository。
 * 提供关注关系的查询、删除和统计方法。
 */
@Repository
public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {

    /**
     * 根据关注者和被关注者 ID 查询关注关系。
     *
     * @param followerId  关注者用户 ID
     * @param followingId 被关注者用户 ID
     * @return 关注关系（可能为空）
     */
    Optional<UserFollow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    /**
     * 根据关注者和被关注者 ID 删除关注关系（取关）。
     *
     * @param followerId  关注者用户 ID
     * @param followingId 被关注者用户 ID
     */
    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    /**
     * 统计指定用户的粉丝数量。
     *
     * @param followingId 被关注者用户 ID
     * @return 粉丝数量
     */
    long countByFollowingId(Long followingId);

    /**
     * 统计指定用户的关注数量。
     *
     * @param followerId 关注者用户 ID
     * @return 关注数量
     */
    long countByFollowerId(Long followerId);

    /**
     * 判断指定用户是否关注了另一个用户。
     *
     * @param followerId  关注者用户 ID
     * @param followingId 被关注者用户 ID
     * @return 是否存在关注关系
     */
    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    /**
     * 查询指定用户关注的所有关注关系（关注列表）。
     *
     * @param followerId 关注者用户 ID
     * @return 关注关系列表
     */
    List<UserFollow> findByFollowerId(Long followerId);

    /**
     * 查询指定用户的所有粉丝关注关系（粉丝列表）。
     *
     * @param followingId 被关注者用户 ID
     * @return 粉丝关注关系列表
     */
    List<UserFollow> findByFollowingId(Long followingId);
}
