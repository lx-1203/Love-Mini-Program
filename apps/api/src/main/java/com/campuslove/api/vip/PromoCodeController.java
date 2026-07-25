package com.campuslove.api.vip;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.PromoCodeService.RedeemResultView;
import com.campuslove.api.vip.PromoCodeService.ValidateResultView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 优惠码控制器。
 * <p>提供优惠码验证与兑换接口。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/vip/promo-codes/validate：验证优惠码（不消耗使用次数）</li>
 *   <li>POST /api/vip/promo-codes/redeem：兑换优惠码（消耗使用次数）</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，用户 ID 从 JWT 上下文获取。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/vip/promo-codes")
public class PromoCodeController {

    private final PromoCodeService promoCodeService;

    public PromoCodeController(PromoCodeService promoCodeService) {
        this.promoCodeService = promoCodeService;
    }

    /**
     * 验证优惠码（不消耗使用次数）。
     *
     * @param request 验证请求体
     * @return 验证结果视图
     */
    @PostMapping("/validate")
    public ValidateResultView validate(@Valid @RequestBody ValidatePromoCodeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return promoCodeService.validate(request.code(), userId, request.baseAmount());
    }

    /**
     * 兑换优惠码（消耗使用次数）。
     *
     * @param request 兑换请求体
     * @return 兑换结果视图
     */
    @PostMapping("/redeem")
    public RedeemResultView redeem(@Valid @RequestBody ValidatePromoCodeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return promoCodeService.redeem(request.code(), userId, request.baseAmount());
    }
}

/**
 * 优惠码验证/兑换请求体。
 *
 * @param code       优惠码字符串（必填，最长 64 字符）
 * @param baseAmount 基础金额（分，>=0）
 */
record ValidatePromoCodeRequest(
        @NotBlank
        @Size(max = 64) String code,
        @NotNull
        @Min(0) Integer baseAmount
) {
}
