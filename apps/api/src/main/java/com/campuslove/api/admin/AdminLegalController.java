package com.campuslove.api.admin;

import com.campuslove.api.clientconfig.LegalDocumentService;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.LegalDocument;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 法律文本（用户协议/隐私政策）编辑与发布。
 *
 * <p>读：ADMIN / SUPER_ADMIN / AUDITOR；写：仅 SUPER_ADMIN。
 * 发布同一类型的新版本会把该类型旧的 published 版本降为 draft。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/legal-documents")
@Validated
public class AdminLegalController {

    private final LegalDocumentService legalDocumentService;

    public AdminLegalController(LegalDocumentService legalDocumentService) {
        this.legalDocumentService = legalDocumentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')")
    public ApiResponse<List<LegalDocumentView>> list() {
        return ApiResponse.ok(legalDocumentService.listAll().stream().map(this::toView).toList());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<LegalDocumentView> update(@PathVariable("id") @Positive Long id,
                                                 @Valid @RequestBody UpdateRequest request) {
        LegalDocument doc = legalDocumentService.update(
                id, request.title(), request.content(), request.version(),
                request.effectiveAt(), SecurityUtils.getCurrentUserId());
        return ApiResponse.ok(toView(doc));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<LegalDocumentView> publish(@PathVariable("id") @Positive Long id) {
        return ApiResponse.ok(toView(legalDocumentService.publish(id, SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/{id}/offline")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<LegalDocumentView> offline(@PathVariable("id") @Positive Long id) {
        return ApiResponse.ok(toView(legalDocumentService.offline(id, SecurityUtils.getCurrentUserId())));
    }

    private LegalDocumentView toView(LegalDocument doc) {
        return new LegalDocumentView(
                doc.getId(),
                doc.getDocType(),
                doc.getTitle(),
                doc.getContent(),
                doc.getVersion(),
                doc.getStatus(),
                doc.getEffectiveAt() != null ? doc.getEffectiveAt().toString() : null,
                doc.getUpdatedAt() != null ? doc.getUpdatedAt().toString() : null);
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 128) String title,
            @NotBlank String content,
            @NotBlank @Size(max = 32) String version,
            LocalDateTime effectiveAt) {
    }

    public record LegalDocumentView(
            Long id,
            String docType,
            String title,
            String content,
            String version,
            String status,
            String effectiveAt,
            String updatedAt) {
    }
}
