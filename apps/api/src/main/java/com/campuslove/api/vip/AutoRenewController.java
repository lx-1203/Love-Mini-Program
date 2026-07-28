package com.campuslove.api.vip;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.AutoRenewService.AutoRenewStatusView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 自动续费控制器。
 * <p>提供自动续费状态查询与开启/关闭接口。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>GET /api/vip/auto-renew/status：查询当前用户的自动续费状态</li>
 *   <li>POST /api/vip/auto-renew：开启自动续费</li>
 *   <li>DELETE /api/vip/auto-renew：关闭自动续费</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，用户 ID 从 JWT 上下文获取，
 * 避免客户端伪造身份。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/vip/auto-renew")
public class AutoRenewController {

    private final AutoRenewService autoRenewService;

    public AutoRenewController(AutoRenewService autoRenewService) {
        this.autoRenewService = autoRenewService;
    }

    /**
     * 查询当前用户的自动续费状态。
     * <p>GET /api/vip/auto-renew/status</p>
     *
     * @return 自动续费状态视图
     */
    @GetMapping("/status")
    public AutoRenewStatusView getStatus() {
        Long userId = SecurityUtils.getCurrentUserId();
        return autoRenewService.getStatus(userId);
    }

    /**
     * 开启自动续费。
     * <p>POST /api/vip/auto-renew</p>
     *
     * @param request 开启请求体（可指定套餐 ID，预留扩展）
     * @return 更新后的状态视图
     */
    @PostMapping
    public AutoRenewStatusView enableAutoRenew(@Valid @RequestBody EnableAutoRenewRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return autoRenewService.enable(userId, request.planId());
    }

    /**
     * 关闭自动续费。
     * <p>DELETE /api/vip/auto-renew</p>
     *
     * @return 更新后的状态视图
     */
    @DeleteMapping
    public AutoRenewStatusView disableAutoRenew() {
        Long userId = SecurityUtils.getCurrentUserId();
        return autoRenewService.disable(userId);
    }
}

/**
 * 开启自动续费请求体。
 *
 * @param planId 套餐 ID（可选，用于将来绑定支付渠道等扩展）
 */
record EnableAutoRenewRequest(
        @NotNull String planId
) {
}
