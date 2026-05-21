package com.campuslove.api.admin;

import com.campuslove.api.repository.VerificationRepository;
import com.campuslove.api.repository.VerificationRepository.VerificationRecord;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;

/**
 * 管理员认证审核接口。
 * 仅在 DataSource 可用时创建（db profile）。
 */
@RestController
@RequestMapping("/api/admin")
@ConditionalOnBean(DataSource.class)
public class AdminVerificationController {

    private static final Logger log = LoggerFactory.getLogger(AdminVerificationController.class);

    private final VerificationRepository verificationRepository;

    public AdminVerificationController(VerificationRepository verificationRepository) {
        this.verificationRepository = verificationRepository;
    }

    /**
     * 列出待审核的认证申请。
     */
    @GetMapping("/verifications")
    public ResponseEntity<?> listVerifications(
            @RequestParam(defaultValue = "pending") String status,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {

        List<VerificationRecord> records = verificationRepository.findByStatus(status, limit, offset);
        List<Map<String, Object>> result = records.stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.id(),
                        "userId", r.userId(),
                        "studentId", r.studentId(),
                        "imagePath", r.imagePath(),
                        "status", r.status(),
                        "reviewNotes", r.reviewNotes() != null ? r.reviewNotes() : "",
                        "reviewedBy", r.reviewedBy() != null ? r.reviewedBy() : 0L,
                        "reviewedAt", r.reviewedAt() != null ? r.reviewedAt().toString() : null,
                        "createdAt", r.createdAt().toString()
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * 审核认证申请（通过或拒绝）。
     */
    @PostMapping("/verifications/{id}/review")
    public ResponseEntity<?> reviewVerification(
            @PathVariable Long id,
            @RequestBody ReviewRequest body) {

        if (!"approved".equals(body.status()) && !"rejected".equals(body.status())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "invalid_status", "message", "status 必须为 approved 或 rejected"));
        }

        // 验证申请存在
        var existing = verificationRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "not_found", "message", "认证申请不存在"));
        }

        verificationRepository.review(id, body.status(), body.notes(), body.reviewedBy());

        log.info("Verification reviewed: id={}, status={}, reviewedBy={}", id, body.status(), body.reviewedBy());

        var updated = verificationRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "id", updated.id(),
                "userId", updated.userId(),
                "studentId", updated.studentId(),
                "imagePath", updated.imagePath(),
                "status", updated.status(),
                "reviewNotes", updated.reviewNotes() != null ? updated.reviewNotes() : "",
                "reviewedBy", updated.reviewedBy() != null ? updated.reviewedBy() : 0L,
                "reviewedAt", updated.reviewedAt() != null ? updated.reviewedAt().toString() : null,
                "createdAt", updated.createdAt().toString()
        ));
    }

    record ReviewRequest(String status, String notes, Long reviewedBy) {
    }
}