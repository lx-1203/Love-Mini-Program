package com.campuslove.api.admin;

import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.HashMap;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 悄悄话管理（v3.1 审核红线：列表/查看/删除）。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/whispers")
@PreAuthorize("hasRole('ADMIN')")
public class AdminWhisperController {

    private final WhisperMessageRepository repository;

    public AdminWhisperController(WhisperMessageRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<AdminPageView<AdminWhisperView>> list(
        @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
        @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(200) int size) {
        Page<WhisperMessage> result = repository.findAll(PageRequest.of(page - 1, size));
        var items = result.getContent().stream().map(AdminWhisperView::of).toList();
        return ResponseEntity.ok(new AdminPageView<>(
            items,
            result.getTotalElements(),
            page,
            size,
            AdminPageView.calculateTotalPages(result.getTotalElements(), size)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable("id") @Positive Long id) {
        repository.deleteById(id);
        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("success", true);
        return ResponseEntity.ok(body);
    }

    /** 悄悄话管理视图 */
    public record AdminWhisperView(
        Long id, Long senderId, Long receiverId, String content,
        String status, Long priceCents, String createdAt, String readAt
    ) {
        static AdminWhisperView of(WhisperMessage m) {
            return new AdminWhisperView(
                m.getId(), m.getSenderId(), m.getReceiverId(), m.getContent(),
                m.getStatus(), m.getPriceCents(),
                m.getCreatedAt() != null ? m.getCreatedAt().toString() : null,
                m.getReadAt() != null ? m.getReadAt().toString() : null
            );
        }
    }
}
