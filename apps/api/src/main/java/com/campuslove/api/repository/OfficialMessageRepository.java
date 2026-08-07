package com.campuslove.api.repository;

import com.campuslove.api.entity.OfficialMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 官方号消息 Repository。
 * 提供按账号查询消息流等方法。
 */
@Repository
public interface OfficialMessageRepository extends JpaRepository<OfficialMessage, Long> {

    /**
     * 查询某账号的消息流，按发布时间升序（对话时间线顺序）。
     *
     * @param accountId 官方号 ID
     * @return 消息列表
     */
    List<OfficialMessage> findByAccountIdOrderByPublishedAtAsc(Long accountId);
}
