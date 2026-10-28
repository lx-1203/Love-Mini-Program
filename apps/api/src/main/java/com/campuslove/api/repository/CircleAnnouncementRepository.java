package com.campuslove.api.repository;

import com.campuslove.api.entity.CircleAnnouncement;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 圈子公告仓库（2026-10-28 表化）。
 */
@Repository
public interface CircleAnnouncementRepository extends JpaRepository<CircleAnnouncement, Long> {

    /** 客户端：仅已发布；置顶优先、发布时间倒序。 */
    List<CircleAnnouncement> findByCircleIdAndStatusOrderByIsPinnedDescPublishedAtDesc(
            Long circleId, CircleAnnouncement.Status status, Pageable pageable);

    /** 后台：包含草稿/下线；置顶优先、创建时间倒序。 */
    Page<CircleAnnouncement> findByCircleIdOrderByIsPinnedDescCreatedAtDesc(Long circleId, Pageable pageable);

    Optional<CircleAnnouncement> findByIdAndCircleId(Long id, Long circleId);

    List<CircleAnnouncement> findByCircleIdAndStatusAndIsPinnedTrue(
            Long circleId, CircleAnnouncement.Status status);
}
