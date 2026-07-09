package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 系统配置控制器（任务 8）。
 * 提供系统参数、业务规则、功能开关的查询与更新接口。
 *
 * <p>接口列表：
 * <ul>
 *     <li>GET  /api/admin/configs          - 参数配置列表</li>
 *     <li>PUT  /api/admin/configs/{key}    - 参数配置更新</li>
 *     <li>GET  /api/admin/rules            - 规则列表</li>
 *     <li>PUT  /api/admin/rules/{id}       - 规则更新</li>
 *     <li>GET  /api/admin/switches         - 开关控制列表</li>
 *     <li>PUT  /api/admin/switches/{key}   - 开关切换</li>
 * </ul>
 *
 * <p>当前实现：任何已认证用户可访问（与 AdminCertificationController 保持一致）。
 * 生产环境应叠加角色校验（如 @PreAuthorize("hasRole('ADMIN')")），但本任务不修改 SecurityConfig。
 */
@Profile("real")
@RestController
@RequestMapping("/api/admin")
public class AdminConfigController {

    private final AdminConfigService configService;

    public AdminConfigController(AdminConfigService configService) {
        this.configService = configService;
    }

    /**
     * 获取系统参数配置列表。
     */
    @GetMapping("/configs")
    public ResponseEntity<List<AdminConfigView>> listConfigs() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.listConfigs());
    }

    /**
     * 更新指定 key 的系统参数配置。
     */
    @PutMapping("/configs/{key}")
    public ResponseEntity<AdminConfigView> updateConfig(
            @PathVariable("key") String key,
            @Valid @RequestBody UpdateConfigRequest req) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        try {
            AdminConfigView view = configService.updateConfig(
                    key, req.value(), req.description(), operatorId);
            return ResponseEntity.ok(view);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取业务规则列表。
     */
    @GetMapping("/rules")
    public ResponseEntity<List<AdminRuleView>> listRules() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.listRules());
    }

    /**
     * 更新指定 id 的业务规则。
     */
    @PutMapping("/rules/{id}")
    public ResponseEntity<AdminRuleView> updateRule(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateRuleRequest req) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        try {
            AdminRuleView view = configService.updateRule(
                    id, req.expression(), req.enabled(), req.description(), operatorId);
            return ResponseEntity.ok(view);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 获取功能开关列表。
     */
    @GetMapping("/switches")
    public ResponseEntity<List<AdminSwitchView>> listSwitches() {
        SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(configService.listSwitches());
    }

    /**
     * 切换指定 key 的功能开关状态。
     */
    @PutMapping("/switches/{key}")
    public ResponseEntity<AdminSwitchView> updateSwitch(
            @PathVariable("key") String key,
            @Valid @RequestBody UpdateSwitchRequest req) {
        Long operatorId = SecurityUtils.getCurrentUserId();
        try {
            AdminSwitchView view = configService.updateSwitch(key, req.enabled(), operatorId);
            return ResponseEntity.ok(view);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}

/**
 * 更新系统参数配置请求体。
 */
record UpdateConfigRequest(
        @NotBlank String value,
        String description
) {}

/**
 * 更新业务规则请求体。
 * 所有字段可选，null 表示不修改对应字段。
 */
record UpdateRuleRequest(
        String expression,
        Boolean enabled,
        String description
) {}

/**
 * 切换功能开关请求体。
 */
record UpdateSwitchRequest(
        @NotNull Boolean enabled
) {}
