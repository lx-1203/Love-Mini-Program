package com.campuslove.api.controller;

import com.campuslove.api.repository.VerificationRepository.VerificationRecord;
import com.campuslove.api.service.FileStorageService;
import com.campuslove.api.service.VerificationService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import javax.sql.DataSource;

/**
 * 学生身份认证接口。
 * 仅在 DataSource 可用时创建（db profile）。
 */
@RestController
@RequestMapping("/api/verification")
@ConditionalOnBean(DataSource.class)
public class VerificationController {

    private static final Logger log = LoggerFactory.getLogger(VerificationController.class);

    private final VerificationService verificationService;
    private final FileStorageService fileStorageService;

    public VerificationController(VerificationService verificationService,
                                   FileStorageService fileStorageService) {
        this.verificationService = verificationService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * 提交学生证认证申请（multipart 上传）。
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submitVerification(
            @RequestParam("image") MultipartFile image,
            @RequestParam("studentId") String studentId,
            HttpServletRequest request) {

        Long userId = getUserId(request);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "unauthorized", "message", "请先登录"));
        }

        try {
            // 存储上传的学生证图片
            String imagePath = fileStorageService.store(image, "verification");

            // 创建认证申请
            VerificationRecord record = verificationService.submitVerification(userId, studentId, imagePath);

            log.info("Verification submitted: id={}, userId={}", record.id(), userId);

            return ResponseEntity.ok(Map.of(
                    "id", record.id(),
                    "userId", record.userId(),
                    "studentId", record.studentId(),
                    "imagePath", record.imagePath(),
                    "status", record.status(),
                    "createdAt", record.createdAt().toString()
            ));
        } catch (IOException e) {
            log.error("Failed to store verification image", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "upload_failed", "message", "图片上传失败"));
        }
    }

    /**
     * 查询当前用户的认证状态。
     */
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(HttpServletRequest request) {
        Long userId = getUserId(request);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "unauthorized", "message", "请先登录"));
        }

        VerificationRecord record = verificationService.getStatus(userId);
        if (record == null) {
            return ResponseEntity.ok(Map.of("submitted", false));
        }

        return ResponseEntity.ok(Map.of(
                "submitted", true,
                "id", record.id(),
                "studentId", record.studentId(),
                "imagePath", record.imagePath(),
                "status", record.status(),
                "reviewNotes", record.reviewNotes() != null ? record.reviewNotes() : "",
                "reviewedAt", record.reviewedAt() != null ? record.reviewedAt().toString() : null,
                "createdAt", record.createdAt().toString()
        ));
    }

    /**
     * 从请求属性中提取 userId（由 AuthInterceptor 设置）。
     */
    private Long getUserId(HttpServletRequest request) {
        Object attr = request.getAttribute("userId");
        if (attr instanceof Long) {
            return (Long) attr;
        }
        if (attr instanceof String) {
            try {
                return Long.parseLong((String) attr);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}