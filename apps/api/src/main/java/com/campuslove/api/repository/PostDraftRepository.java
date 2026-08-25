package com.campuslove.api.repository;

import com.campuslove.api.entity.PostDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 发布草稿 Repository。
 */
public interface PostDraftRepository extends JpaRepository<PostDraft, Long> {

    /** 按用户 ID 查找草稿（每用户一条）。 */
    Optional<PostDraft> findByUserId(Long userId);

    /** 按用户 ID 删除草稿。 */
    void deleteByUserId(Long userId);
}
