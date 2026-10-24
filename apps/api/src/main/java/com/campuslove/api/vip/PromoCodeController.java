package com.campuslove.api.vip;

import com.campuslove.api.config.FeatureSwitch;
import com.campuslove.api.config.FeatureSwitchKeys;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.PromoCodeService.RedeemResultView;
import com.campuslove.api.vip.PromoCodeService.ValidateResultView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 优惠码控制器。
 * <p>提供优惠码验证与兑换预览接口。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/v1/vip/promo-codes/validate：验证优惠码（不消耗使用次数）</li>
 *   <li>POST /api/v1/vip/promo-codes/redeem：兑换预览（P0-3 B：不消耗使用次数）</li>
 * </ul>
 *
 * <p><b>消耗点唯一性（P0-3 B）</b>：真正的消耗（原子扣减 remaining_uses +
 * 写 promo_code_usages）只发生在钱包购买事务内
 * （{@link BillingService#purchaseVip} → {@link PromoCodeService#redeem}），
 * 定价基数恒为服务端目录原价。本控制器不再消耗，避免「独立页兑换掉单次可用码、
 * 购买时码已耗尽」的资金外链路。</p>
 *
 * <p>权限说明：/api/** 路径要求已认证，用户 ID 从 JWT 上下文获取。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/vip/promo-codes")
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
    @PreAuthorize("hasRole('USER')")
    public ValidateResultView validate(@Valid @RequestBody ValidatePromoCodeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return promoCodeService.validate(request.code(), userId, request.baseAmount());
    }

    /**
     * 兑换优惠码（P0-3 B：预览语义，零消耗）。
     *
     * <p>请求体与响应体与原契约一致（{@code code} + {@code baseAmount} →
     * {@link RedeemResultView}），但不再扣减使用次数、不写用量记录：
     * 折扣真正的消耗与成交发生在 {@code POST /api/v1/vip/bills/purchase}。
     * 校验口径（存在/生效/剩余次数/单用户上限）与消耗路径完全一致，
     * 因此已用完或已达上限的码在这里同样被拒。</p>
     *
     * @param request 兑换请求体
     * @return 兑换预览结果（折扣与折后金额，未发生消耗）
     */
    @PostMapping("/redeem")
    @FeatureSwitch(FeatureSwitchKeys.COMMERCE_VIP)
    @PreAuthorize("hasRole('USER')")
    public RedeemResultView redeem(@Valid @RequestBody ValidatePromoCodeRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return promoCodeService.previewRedeem(request.code(), userId, request.baseAmount());
    }
}

/**
 * 优惠码验证/兑换请求体。
 *
 * <p>{@code baseAmount} 只用于本端的折扣<b>预览</b>报价（P0-3 B）：
 * 真正成交时折扣基数由服务端 {@link VipPlanCatalog} 原价给出，
 * 客户端上送的金额不参与定价。</p>
 *
 * @param code       优惠码字符串（必填，最长 64 字符，与 promo_codes.code 列宽一致）
 * @param baseAmount 预览用基础金额（分，>=0）
 */
record ValidatePromoCodeRequest(
        @NotBlank
        @Size(max = 64) String code,
        @NotNull
        @Min(0) Integer baseAmount
) {
}
