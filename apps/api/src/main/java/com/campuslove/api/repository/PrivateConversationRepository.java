package com.campuslove.api.repository;

import com.campuslove.api.entity.PrivateConversation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 私信会话 Repository。
 * 提供基于用户和会话 UID 的查询方法。
 */
public interface PrivateConversationRepository extends JpaRepository<PrivateConversation, Long> {

    /**
     * 查询与指定用户相关的会话，按最后消息时间倒序。
     *
     * @param userAId 用户 A ID
     * @param userBId 用户 B ID
     * @return 会话列表
     */
    @Query("SELECT pc FROM PrivateConversation pc WHERE pc.userAId = :userAId OR pc.userBId = :userBId ORDER BY pc.lastMessageAt DESC")
    List<PrivateConversation> findByUserAIdOrUserBIdOrderByLastMessageAtDesc(
            @Param("userAId") Long userAId,
            @Param("userBId") Long userBId
    );

    /**
     * 根据会话 UID 查询会话。
     *
     * @param conversationUid 会话唯一标识
     * @return 匹配的会话（可能为空）
     */
    Optional<PrivateConversation> findByConversationUid(String conversationUid);

    /**
     * 查询两个用户之间的会话（无论谁是谁的A/B）。
     *
     * @param userAId 用户 A ID
     * @param userBId 用户 B ID
     * @return 匹配的会话（可能为空）
     */
    @Query("SELECT pc FROM PrivateConversation pc WHERE " +
           "(pc.userAId = :userAId AND pc.userBId = :userBId) OR " +
           "(pc.userAId = :userBId AND pc.userBId = :userAId)")
    Optional<PrivateConversation> findByUserPair(
            @Param("userAId") Long userAId,
            @Param("userBId") Long userBId
    );
}
