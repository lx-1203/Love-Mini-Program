package com.campuslove.api.vip;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.BillingService.BillListResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.context.annotation.Profile;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 账单控制器。
 * <p>提供账单列表查询接口（支持分页）。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>GET /api/vip/bills?page=&size=：查询当前用户的账单列表（按创建时间倒序、分页）</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，用户 ID 从 JWT 上下文获取。</p>
 */
@Profile("real")
@Validated
@RestController
@RequestMapping("/api/v1/vip/bills")
public class BillingController {

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    /**
     * 查询当前用户的账单列表（分页）。
     * <p>默认第 0 页、每页 20 条；最大每页 100 条以防止滥用。</p>
     *
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 20，最大 100）
     * @return 账单列表响应（含 items、total、page、size、totalPages）
     */
    @GetMapping
    public BillListResponse listBills(
            @RequestParam(value = "page", defaultValue = "0")
            @Min(value = 0, message = "页码不能小于 0") Integer page,
            @RequestParam(value = "size", defaultValue = "20")
            @Min(value = 1, message = "每页大小不能小于 1")
            @Max(value = 100, message = "每页大小不能超过 100") Integer size
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        return billingService.listBills(userId, page, size);
    }
}
