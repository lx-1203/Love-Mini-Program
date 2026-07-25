package com.campuslove.api.repository;

import com.campuslove.api.entity.VipRedPacket;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * VIP 红包 Repository。
 * <p>提供红包记录的持久化与查询能力，支持按发送者、聊天会话查询。</p>
 */
public interface VipRedPacketRepository extends JpaRepository<VipRedPacket, Long> {

    /**
     * 按发送者用户 ID 查询红包列表，按创建时间倒序。
     *
     * @param senderId 发送者用户 ID
     * @return 红包列表
     */
    List<VipRedPacket> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    /**
     * 按聊天会话 ID 查询红包列表，按创建时间倒序。
     * <p>用于"聊天红包"场景，按会话展示历史红包。</p>
     *
     * @param chatId 聊天会话 ID
     * @return 红包列表
     */
    List<VipRedPacket> findByChatIdOrderByCreatedAtDesc(String chatId);
}
