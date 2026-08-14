package com.campuslove.api.invite;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 邀请奖励控制器（3-K 邀请奖励）。
 *
 * <p>端点：</p>
 * <ul>
 *   <li>POST /api/v1/invites —— 生成/返回我的邀请码（幂等）</li>
 *   <li>GET /api/v1/invites —— 查询我的邀请码（不生成，未创建返回 code=null）</li>
 *   <li>POST /api/v1/invites/accept —— 绑定邀请关系（校验：邀请码存在/不能邀请自己/一人只能绑定一次；
 *       accept 时即发奖励入邀请人钱包）</li>
 *   <li>GET /api/v1/invites/rewards —— 我的奖励记录列表（作为邀请人）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/invites")
@Validated
public class InviteController {

    private final InviteService inviteService;

    public InviteController(InviteService inviteService) {
        this.inviteService = inviteService;
    }

    /**
     * 生成/返回我的邀请码（幂等：已存在则直接返回）。
     * POST /api/v1/invites
     *
     * @return 邀请码视图
     */
    @PostMapping
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<InviteService.InviteCodeView> getOrCreateInviteCode() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(inviteService.getOrCreateInviteCode(userId));
    }

    /**
     * 查询我的邀请码（不生成；未创建返回 code=null）。
     * GET /api/v1/invites
     *
     * @return 邀请码视图
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<InviteService.InviteCodeView> getMyInviteCode() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(inviteService.getMyInviteCode(userId));
    }

    /**
     * 绑定邀请关系（幂等）。
     * POST /api/v1/invites/accept  body: {"code":"XXXX"}
     *
     * @param request 邀请码请求体
     * @return 绑定结果视图（含邀请人信息与奖励）
     */
    @PostMapping("/accept")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<InviteService.AcceptResultView> acceptInvite(
            @Valid @RequestBody AcceptInviteRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(inviteService.acceptInvite(userId, request.code()));
    }

    /**
     * 我的奖励记录列表。
     * GET /api/v1/invites/rewards
     *
     * @return 奖励记录视图列表（按发放时间倒序，含被邀请人昵称）
     */
    @GetMapping("/rewards")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<InviteService.RewardView>> listMyRewards() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(inviteService.listMyRewards(userId));
    }
}

/**
 * 绑定邀请请求体。
 *
 * @param code 邀请码
 */
record AcceptInviteRequest(
        @NotBlank(message = "邀请码不能为空")
        @Size(max = 16, message = "邀请码长度不能超过 16")
        String code
) {
}
