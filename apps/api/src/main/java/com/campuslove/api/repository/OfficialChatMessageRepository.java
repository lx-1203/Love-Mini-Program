package com.campuslove.api.repository;

import com.campuslove.api.entity.OfficialChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 官方客服双向会话消息仓库（R16 2026-09-07）。
 */
public interface OfficialChatMessageRepository extends JpaRepository<OfficialChatMessage, Long> {

    /** 某用户在某官方号下的双向消息（时间升序）。 */
    List<OfficialChatMessage> findByUserIdAndAccountIdOrderByCreatedAtAsc(Long userId, Long accountId);
}
