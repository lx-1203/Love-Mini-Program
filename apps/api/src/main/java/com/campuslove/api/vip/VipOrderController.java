package com.campuslove.api.vip;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.config.FeatureSwitch;
import com.campuslove.api.config.FeatureSwitchKeys;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.wxpay.WxPayProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 微信支付订单控制器（2026-10-05 微信支付工程补齐）。
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/v1/vip/orders：下单（校验套餐 → 服务端定价 → 落 PENDING →
 *       微信 JSAPI 统一下单 → 返回 wx.requestPayment 五件套）。
 *       商业化子闸 {@code commerce.vip} 封存时 403 COMMERCE_DISABLED；
 *       微信支付配置闸关闭时 404（管道未开）。</li>
 *   <li>GET /api/v1/vip/orders/{orderNo}：查询订单状态（归属校验，仅本人可见）。</li>
 * </ul>
 *
 * <p>约定：客户端在收到 404 / COMMERCE_DISABLED 时维持「支付未开通」提示
 * （商业化总开关本次不解封，本次仅打通支付管道）。</p>
 */
@Profile("real")
@Validated
@RestController
@RequestMapping("/api/v1/vip/orders")
public class VipOrderController {

    private final VipOrderService vipOrderService;
    private final WxPayProperties wxPayProperties;

    public VipOrderController(VipOrderService vipOrderService,
                              WxPayProperties wxPayProperties) {
        this.vipOrderService = vipOrderService;
        this.wxPayProperties = wxPayProperties;
    }

    /**
     * 创建 VIP 微信支付订单。
     * POST /api/v1/vip/orders
     *
     * @param request 下单请求（planId）
     * @return wx.requestPayment 五件套（orderNo/appId/timeStamp/nonceStr/package/signType/paySign）
     */
    @PostMapping
    @FeatureSwitch(FeatureSwitchKeys.COMMERCE_VIP)
    @PreAuthorize("hasRole('USER')")
    public VipOrderService.OrderCreatedView createOrder(@Valid @RequestBody VipOrderCreateRequest request) {
        // 微信支付配置闸：管道未开（enabled=false）时 404，与回调端点口径一致
        if (wxPayProperties == null || !wxPayProperties.isEnabled()) {
            throw new ResourceNotFoundException("资源不存在");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        return vipOrderService.createOrder(userId, request.planId());
    }

    /**
     * 查询订单状态（仅本人订单可见）。
     * GET /api/v1/vip/orders/{orderNo}
     *
     * @param orderNo 订单号
     * @return 订单状态视图
     */
    @GetMapping("/{orderNo}")
    @PreAuthorize("hasRole('USER')")
    public VipOrderService.OrderStatusView getOrder(@PathVariable("orderNo") String orderNo) {
        Long userId = SecurityUtils.getCurrentUserId();
        return vipOrderService.getOrder(userId, orderNo);
    }
}

/**
 * VIP 下单请求体。
 *
 * @param planId 套餐 ID（monthly/quarterly/yearly）
 */
record VipOrderCreateRequest(
        @NotBlank(message = "套餐 ID 不能为空") @Size(max = 32) String planId
) {
}
