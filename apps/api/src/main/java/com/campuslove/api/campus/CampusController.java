package com.campuslove.api.campus;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 校园社交 REST 控制器。
 * 暴露校园话题、回复、认证、活动等 API 端点。
 * 写操作的用户ID从JWT认证上下文中获取。
 */
@Profile("real")
@RestController
@RequestMapping("/api/campus")
public class CampusController {

    private final CampusService campusService;
    private final CampusCertificationService certService;
    private final UserCampusProfileRepository campusProfileRepository;

    public CampusController(
            CampusService campusService,
            CampusCertificationService certService,
            UserCampusProfileRepository campusProfileRepository) {
        this.campusService = campusService;
        this.certService = certService;
        this.campusProfileRepository = campusProfileRepository;
    }

    // ── 校园话题 ──

    /**
     * 获取校园话题列表（分页）。
     * 返回 Spring Data Page 格式以匹配前端期望。
     */
    @GetMapping("/topics")
    public ResponseEntity<CampusTopicPageResponse> listTopics(
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long schoolId = resolveSchoolId(userId);
        if (schoolId == null) {
            return ResponseEntity.ok(new CampusTopicPageResponse(List.of(), 0, page, size));
        }

        List<CampusTopicView> allTopics = campusService.getCampusTopics(schoolId, category);

        // 手动分页（数据量小时可接受）
        int from = page * size;
        int to = Math.min(from + size, allTopics.size());
        List<CampusTopicView> pageContent = from < allTopics.size()
                ? allTopics.subList(from, to)
                : List.of();

        return ResponseEntity.ok(new CampusTopicPageResponse(
                pageContent, allTopics.size(), page, size));
    }

    /**
     * 获取单个校园话题详情。
     */
    @GetMapping("/topics/{id}")
    public ResponseEntity<CampusTopicView> getTopic(@PathVariable("id") Long id) {
        try {
            CampusTopicView topic = campusService.getCampusTopic(id);
            return ResponseEntity.ok(topic);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 创建新的校园话题。
     */
    @PostMapping("/topics")
    public ResponseEntity<CampusTopicView> createTopic(
            @Valid @RequestBody CreateCampusTopicRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long schoolId = resolveSchoolId(userId);
        if (schoolId == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            CampusTopicView topic = campusService.createCampusTopic(
                    userId, schoolId, req.category(), req.title(), req.content());
            return ResponseEntity.ok(topic);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取校园话题回复列表（分页）。
     */
    @GetMapping("/topics/{id}/replies")
    public ResponseEntity<CampusReplyPageResponse> listReplies(
            @PathVariable("id") Long id,
            @RequestParam(name = "page", defaultValue = "0") int page) {
        try {
            List<CampusTopicReplyView> allReplies = campusService.getCampusTopicReplies(id);

            // 手动分页
            int size = 20;
            int from = page * size;
            int to = Math.min(from + size, allReplies.size());
            List<CampusTopicReplyView> pageContent = from < allReplies.size()
                    ? allReplies.subList(from, to)
                    : List.of();

            return ResponseEntity.ok(new CampusReplyPageResponse(
                    pageContent, allReplies.size(), page, size));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 回复校园话题。
     */
    @PostMapping("/topics/{id}/replies")
    public ResponseEntity<CampusTopicReplyView> createReply(
            @PathVariable("id") Long id,
            @Valid @RequestBody CreateCampusReplyRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        try {
            CampusTopicReplyView reply = campusService.replyCampusTopic(id, userId, req.content());
            return ResponseEntity.ok(reply);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── 校园认证 ──

    /**
     * 获取当前用户的校园认证状态。
     */
    @GetMapping("/certification")
    public ResponseEntity<CampusCertificationView> getCertification() {
        Long userId = SecurityUtils.getCurrentUserId();
        CampusCertificationView cert = certService.getCertificationStatus(userId);
        return ResponseEntity.ok(cert);
    }

    /**
     * 提交校园认证申请。
     */
    @PostMapping("/certification")
    public ResponseEntity<CampusCertificationView> submitCertification(
            @Valid @RequestBody CampusCertificationRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        try {
            CampusCertificationView cert = certService.submitCertification(
                    userId, req.schoolName(), req.major(), req.studentIdCardUrl());
            return ResponseEntity.ok(cert);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── 私有辅助方法 ──

    /**
     * 从用户校园资料中解析学校ID。
     * 使用 campusName 的 hashCode 作为 schoolId（与现有推荐算法一致）。
     */
    private Long resolveSchoolId(Long userId) {
        return campusProfileRepository.findByUserId(userId)
                .map(profile -> (long) profile.getCampusName().hashCode())
                .orElse(null);
    }
}

// ── 请求/响应 DTO ──

/**
 * 校园话题分页响应（匹配 Spring Data Page 格式）。
 */
record CampusTopicPageResponse(
    List<CampusTopicView> content,
    int totalElements,
    int number,
    int size
) {}

/**
 * 校园话题回复分页响应。
 */
record CampusReplyPageResponse(
    List<CampusTopicReplyView> content,
    int totalElements,
    int number,
    int size
) {}

/**
 * 创建校园话题请求体。
 */
record CreateCampusTopicRequest(
    @NotBlank String category,
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content
) {}

/**
 * 创建校园话题回复请求体。
 */
record CreateCampusReplyRequest(
    @NotBlank @Size(max = 2000) String content
) {}

/**
 * 校园认证提交请求体。
 */
record CampusCertificationRequest(
    @NotBlank @Size(max = 100) String schoolName,
    @NotBlank @Size(max = 100) String major,
    @NotBlank String studentIdCardUrl
) {}
