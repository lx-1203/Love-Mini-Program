package com.campuslove.api.vip;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.VipRedPacketService.ClaimResultView;
import com.campuslove.api.vip.VipRedPacketService.RedPacketView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * VIP 红包控制器。
 * <p>提供红包创建、领取、详情查询等接口。
 * 仅在 real profile 下激活，依赖数据库持久化。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>POST /api/vip/red-packets：创建红包</li>
 *   <li>POST /api/vip/red-packets/{id}/claim：领取红包</li>
 *   <li>GET /api/vip/red-packets/{id}：查询红包详情（含领取记录）</li>
 * </ul>
 *
 * <p>权限说明：/api/** 路径要求已认证，发送者/领取者 ID 从 JWT 上下文获取，
 * 避免客户端伪造身份。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/vip/red-packets")
@Validated
public class VipRedPacketController {

    private final VipRedPacketService redPacketService;

    public VipRedPacketController(VipRedPacketService redPacketService) {
        this.redPacketService = redPacketService;
    }

    /**
     * 创建红包。
     * <p>从 JWT 认证上下文获取发送者 ID，校验请求体后调用服务创建红包。</p>
     *
     * @param request 创建红包请求体
     * @return 创建后的红包视图
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('USER')")
    public RedPacketView createRedPacket(@Valid @RequestBody CreateRedPacketRequest request) {
        Long senderId = SecurityUtils.getCurrentUserId();
        return redPacketService.createRedPacket(
                senderId,
                request.totalAmount(),
                request.totalCount(),
                request.type(),
                request.chatId(),
                request.blessing()
        );
    }

    /**
     * 领取红包。
     *
     * @param id 红包 ID（URL 路径参数）
     * @return 领取结果视图
     */
    @PostMapping("/{id}/claim")
    @PreAuthorize("hasRole('USER')")
    public ClaimResultView claimRedPacket(@PathVariable("id") @Positive Long id) {
        Long claimerId = SecurityUtils.getCurrentUserId();
        return redPacketService.claimRedPacket(id, claimerId);
    }

    /**
     * 查询红包详情（含领取记录）。
     * <p>修复（FIN HIGH-17）：传入当前用户 ID，由服务层校验归属
     * （仅发送者本人/已领取者/会话参与者可查看），防止 IDOR 枚举查看他人红包。</p>
     *
     * @param id 红包 ID
     * @return 红包视图
     */
    @GetMapping("/{id}")
    public RedPacketView getRedPacketDetail(@PathVariable("id") @Positive Long id) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return redPacketService.getRedPacketDetail(id, currentUserId);
    }
}

/**
 * 创建红包请求体。
 *
 * @param totalAmount 总金额（单位：分，100~100000）
 * @param totalCount  总个数（1~100）
 * @param type        类型 NORMAL(普通) / LUCKY(拼手气)
 * @param chatId      关联聊天会话 ID（可选，用于聊天红包场景）
 * @param blessing    祝福语（可选，最长 200 字符）
 */
record CreateRedPacketRequest(
        @NotNull
        @Min(100)
        @Max(100_000)
        Integer totalAmount,
        @NotNull
        @Min(1)
        @Max(100)
        Integer totalCount,
        @NotBlank
        @Pattern(regexp = "NORMAL|LUCKY", message = "type 必须为 NORMAL 或 LUCKY")
        String type,
        @Size(max = 128) String chatId,
        @Size(max = 200) String blessing
) {
}
