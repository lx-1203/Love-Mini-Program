package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CircleAnnouncement;
import com.campuslove.api.repository.CircleAnnouncementRepository;
import com.campuslove.api.repository.InterestCircleRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 圈子公告（2026-10-28 表化）。
 *
 * <p>读：ADMIN/SUPER_ADMIN/AUDITOR；写：ADMIN/SUPER_ADMIN。
 * 同圈 published 至多一条置顶，发布/置顶时由服务端互斥。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/forum/circles/{circleId}/announcements")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
@Validated
public class AdminCircleAnnouncementController {

    private final CircleAnnouncementRepository announcementRepository;
    private final InterestCircleRepository interestCircleRepository;
    private final AdminDataScope adminDataScope;

    public AdminCircleAnnouncementController(CircleAnnouncementRepository announcementRepository,
                                             InterestCircleRepository interestCircleRepository,
                                             AdminDataScope adminDataScope) {
        this.announcementRepository = announcementRepository;
        this.interestCircleRepository = interestCircleRepository;
        this.adminDataScope = adminDataScope;
    }

    /** 公告列表（含草稿/下线；置顶优先、创建时间倒序）。 */
    @GetMapping
    public AdminPageView<AdminCircleAnnouncementView> list(
            @PathVariable("circleId") @Positive Long circleId,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);
        Page<CircleAnnouncement> result =
                announcementRepository.findByCircleIdOrderByIsPinnedDescCreatedAtDesc(circleId, pageable);
        List<AdminCircleAnnouncementView> items = result.getContent().stream()
                .map(this::toView)
                .toList();
        return new AdminPageView<>(items, result.getTotalElements(), safePage, safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize));
    }

    /** 新建公告（草稿）。 */
    @PostMapping
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员新增圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> create(
            @PathVariable("circleId") @Positive Long circleId,
            @Valid @RequestBody AdminCircleAnnouncementRequest request) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        String content = normalize(request.content());
        if (content == null) {
            throw new IllegalArgumentException("公告正文不能为空");
        }
        CircleAnnouncement announcement = new CircleAnnouncement();
        announcement.setCircleId(circleId);
        announcement.setTitle(normalize(request.title()));
        announcement.setContent(content);
        announcement.setIsPinned(false);
        announcement.setStatus(CircleAnnouncement.Status.draft);
        announcement.setAuthorId(operatorId);
        CircleAnnouncement saved = announcementRepository.save(announcement);
        return ResponseEntity.ok(toView(saved));
    }

    /** 编辑公告（草稿/已发布均可；发布态编辑不改发布时间）。 */
    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员编辑圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> update(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody AdminCircleAnnouncementRequest request) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        if (request.title() != null) {
            announcement.setTitle(normalize(request.title()));
        }
        if (request.content() != null) {
            String content = normalize(request.content());
            if (content == null) {
                throw new IllegalArgumentException("公告正文不能为空");
            }
            announcement.setContent(content);
        }
        if (request.pinned() != null) {
            announcement.setIsPinned(request.pinned());
        }
        CircleAnnouncement saved = announcementRepository.save(announcement);
        return ResponseEntity.ok(toView(saved));
    }

    /** 发布公告（同时保证同圈置顶互斥）。 */
    @PostMapping("/{id}/publish")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员发布圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> publish(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        announcement.setStatus(CircleAnnouncement.Status.published);
        if (announcement.getPublishedAt() == null) {
            announcement.setPublishedAt(LocalDateTime.now(TimeZones.BUSINESS));
        }
        CircleAnnouncement saved = announcementRepository.save(announcement);
        if (Boolean.TRUE.equals(saved.getIsPinned())) {
            unpinOthers(circleId, saved.getId());
        }
        return ResponseEntity.ok(toView(saved));
    }

    /** 下线公告（立即从客户端消失，并取消置顶）。 */
    @PostMapping("/{id}/offline")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员下线圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> offline(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        announcement.setStatus(CircleAnnouncement.Status.offline);
        announcement.setIsPinned(false);
        CircleAnnouncement saved = announcementRepository.save(announcement);
        return ResponseEntity.ok(toView(saved));
    }

    /** 置顶公告（仅已发布公告；同圈互斥）。 */
    @PostMapping("/{id}/pin")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员置顶圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> pin(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        if (announcement.getStatus() != CircleAnnouncement.Status.published) {
            throw new IllegalArgumentException("请先发布公告，再置顶");
        }
        announcement.setIsPinned(true);
        CircleAnnouncement saved = announcementRepository.save(announcement);
        unpinOthers(circleId, saved.getId());
        return ResponseEntity.ok(toView(saved));
    }

    /** 取消置顶。 */
    @PostMapping("/{id}/unpin")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员取消置顶圈子公告")
    public ResponseEntity<AdminCircleAnnouncementView> unpin(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        announcement.setIsPinned(false);
        CircleAnnouncement saved = announcementRepository.save(announcement);
        return ResponseEntity.ok(toView(saved));
    }

    /** 删除 = 下线（保留审计可见的历史记录）。 */
    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_CIRCLE_ANNOUNCEMENT, targetType = "CIRCLE_ANNOUNCEMENT",
            description = "管理员删除（下线）圈子公告")
    public ResponseEntity<Void> delete(
            @PathVariable("circleId") @Positive Long circleId,
            @PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();
        requireCircle(circleId);
        adminDataScope.assertCampusAccess(null);
        CircleAnnouncement announcement = findOrThrow(circleId, id);
        announcement.setStatus(CircleAnnouncement.Status.offline);
        announcement.setIsPinned(false);
        announcementRepository.save(announcement);
        return ResponseEntity.noContent().build();
    }

    private void unpinOthers(Long circleId, Long keepId) {
        List<CircleAnnouncement> pinned = announcementRepository
                .findByCircleIdAndStatusAndIsPinnedTrue(circleId, CircleAnnouncement.Status.published);
        for (CircleAnnouncement item : pinned) {
            if (!item.getId().equals(keepId)) {
                item.setIsPinned(false);
                announcementRepository.save(item);
            }
        }
    }

    private CircleAnnouncement findOrThrow(Long circleId, Long id) {
        return announcementRepository.findByIdAndCircleId(id, circleId)
                .orElseThrow(() -> new IllegalArgumentException("公告不存在: " + id));
    }

    private void requireCircle(Long circleId) {
        if (!interestCircleRepository.existsById(circleId)) {
            throw new IllegalArgumentException("圈子不存在: " + circleId);
        }
    }

    private AdminCircleAnnouncementView toView(CircleAnnouncement a) {
        return new AdminCircleAnnouncementView(
                a.getId(), a.getCircleId(), a.getTitle(), a.getContent(),
                Boolean.TRUE.equals(a.getIsPinned()), a.getStatus().name(), a.getAuthorId(),
                a.getPublishedAt(), a.getCreatedAt(), a.getUpdatedAt());
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

/** 公告请求体（编辑时字段可空，表示不修改）。 */
record AdminCircleAnnouncementRequest(
        @Size(max = 80) String title,
        @Size(max = 1000) String content,
        Boolean pinned
) {
}

/** 后台公告视图（含草稿/下线）。 */
record AdminCircleAnnouncementView(
        Long id,
        Long circleId,
        String title,
        String content,
        boolean isPinned,
        String status,
        Long authorId,
        LocalDateTime publishedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
