package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.NotifyConfig;
import com.campuslove.api.repository.NotifyConfigRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 通知配置控制器。
 * <p>提供通知类型的启停状态与模板查询、批量更新。</p>
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET  /api/admin/notify-config       - 查询全部通知配置</li>
 *   <li>PUT  /api/admin/notify-config       - 批量更新通知配置（启用/停用/模板）</li>
 * </ul>
 *
 * <p>数据隔离说明：通知配置为<b>全局资源</b>（全平台统一生效，不区分校区），
 * 不做校区数据隔离；写操作仅限 SUPER_ADMIN。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/notify-config")
@PreAuthorize("hasRole('ADMIN')")
public class AdminNotifyConfigController {

    private final NotifyConfigRepository notifyConfigRepository;

    public AdminNotifyConfigController(NotifyConfigRepository notifyConfigRepository) {
        this.notifyConfigRepository = notifyConfigRepository;
    }

    /**
     * 查询全部通知配置（按 type 升序）。
     */
    @GetMapping
    public ResponseEntity<List<NotifyConfigView>> list() {
        SecurityUtils.getCurrentUserId(); // 校验已登录
        List<NotifyConfigView> views = notifyConfigRepository.findAllByOrderByTypeAsc().stream()
                .map(this::toView)
                .toList();
        return ResponseEntity.ok(views);
    }

    /**
     * 批量更新通知配置。
     * <p>对每个条目按 type 匹配现有记录，更新 enabled/template；
     * 若 type 不存在则新建（便于后续扩展新通知类型）。</p>
     *
     * <p>Task 2.5.4：添加 {@link Transactional} 注解，保证批量更新的原子性。
     * 任意一条记录写入失败时整批回滚，避免出现"部分成功部分失败"的中间态
     * （可能导致前端展示与数据库状态不一致）。</p>
     */
    @Auditable(value = AuditOperation.UPDATE_NOTIFY_CONFIG, targetType = "NOTIFY_CONFIG")
    @PutMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<List<NotifyConfigView>> update(
            @Valid @RequestBody NotifyConfigBatchUpdateRequest request) {
        SecurityUtils.getCurrentUserId();

        if (request == null || request.configs() == null) {
            return ResponseEntity.badRequest().build();
        }

        // 一次性加载现有配置，按 type 索引
        Map<String, NotifyConfig> existing = notifyConfigRepository.findAllByOrderByTypeAsc().stream()
                .collect(Collectors.toMap(NotifyConfig::getType, Function.identity()));

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        for (NotifyConfigUpdateRequest item : request.configs()) {
            if (item.type() == null || item.type().isBlank()) {
                continue;
            }
            NotifyConfig cfg = existing.get(item.type());
            if (cfg == null) {
                // type 不存在则新建
                cfg = new NotifyConfig();
                cfg.setType(item.type());
                cfg.setEnabled(item.enabled() != null ? item.enabled() : Boolean.TRUE);
                cfg.setTemplate(item.template());
                cfg.setUpdatedAt(now);
            } else {
                if (item.enabled() != null) {
                    cfg.setEnabled(item.enabled());
                }
                if (item.template() != null) {
                    cfg.setTemplate(item.template());
                }
                cfg.setUpdatedAt(now);
            }
            notifyConfigRepository.save(cfg);
        }

        List<NotifyConfigView> views = notifyConfigRepository.findAllByOrderByTypeAsc().stream()
                .map(this::toView)
                .toList();
        return ResponseEntity.ok(views);
    }

    private NotifyConfigView toView(NotifyConfig entity) {
        return new NotifyConfigView(
                entity.getId(),
                entity.getType(),
                entity.getEnabled(),
                entity.getTemplate(),
                entity.getUpdatedAt() != null ? entity.getUpdatedAt().toString() : null
        );
    }
}

/** 通知配置视图 */
record NotifyConfigView(
        Long id,
        String type,
        Boolean enabled,
        String template,
        String updatedAt
) {}

/** 单条通知配置更新请求 */
record NotifyConfigUpdateRequest(
        @NotBlank @Size(max = 32) String type,
        Boolean enabled,
        @Size(max = 2000) String template
) {}

/** 批量更新通知配置请求 */
record NotifyConfigBatchUpdateRequest(
        @NotEmpty(message = "configs 列表不能为空")
        List<@Valid NotifyConfigUpdateRequest> configs
) {}
