package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.chat.TempChatCleanupService;
import com.campuslove.api.config.SecurityUtils;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 后台维护操作（2026-10-28）。
 *
 * <p>目前仅开放临时会话材料保留期清理的受控触发：定时任务每小时 :30 自动跑，
 * 本端点用于验收/运维立即执行一次，返回实际删除计数。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/maintenance")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminMaintenanceController {

    private final TempChatCleanupService tempChatCleanupService;

    public AdminMaintenanceController(TempChatCleanupService tempChatCleanupService) {
        this.tempChatCleanupService = tempChatCleanupService;
    }

    /** 立即执行一次临时会话保留期清理（仅 SUPER_ADMIN）。 */
    @PostMapping("/temp-chat-cleanup")
    @Auditable(value = AuditOperation.CLEANUP_TEMP_CHAT, targetType = "TEMP_CHAT",
            description = "管理员手动触发临时会话材料清理")
    public Map<String, Object> cleanupTempChatMaterials() {
        SecurityUtils.getCurrentUserId();
        TempChatCleanupService.CleanupResult result =
                tempChatCleanupService.runRetainedMaterialsCleanup();
        return Map.of(
                "assetsDeleted", result.assetsDeleted(),
                "messagesDeleted", result.messagesDeleted(),
                "lockAcquired", result.lockAcquired());
    }
}
