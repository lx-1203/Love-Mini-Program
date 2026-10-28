package com.campuslove.api.repository;

import com.campuslove.api.entity.ContentMention;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 内容 @ 提及仓库（2026-10-28 统一表）。
 */
@Repository
public interface ContentMentionRepository extends JpaRepository<ContentMention, Long> {

    List<ContentMention> findByTargetTypeAndTargetIdAndNotifiedFalse(String targetType, Long targetId);

    boolean existsByTargetTypeAndTargetIdAndMentionedUserId(
            String targetType, Long targetId, Long mentionedUserId);

    long deleteByTargetTypeAndTargetId(String targetType, Long targetId);
}
