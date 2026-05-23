package com.campuslove.api.repository;

import com.campuslove.api.entity.TempChatContactExchange;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 临时聊天联系交换 Repository。
 * 提供基于会话的查询方法。
 */
public interface TempChatContactExchangeRepository extends JpaRepository<TempChatContactExchange, Long> {

    /**
     * 根据会话 ID 查询联系交换记录。
     *
     * @param sessionId 会话 ID
     * @return 匹配的联系交换记录（可能为空）
     */
    Optional<TempChatContactExchange> findBySessionId(Long sessionId);
}
