package com.campuslove.api.block;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户拉黑控制器（3-F 拉黑）。
 *
 * <p>端点（前缀 /api/v1/users）：</p>
 * <ul>
 *   <li>POST /api/v1/users/{id}/block —— 拉黑目标用户（幂等）</li>
 *   <li>DELETE /api/v1/users/{id}/block —— 解除拉黑（幂等）</li>
 *   <li>GET /api/v1/users/blocked —— 我的被拉黑列表</li>
 * </ul>
 *
 * <p>生效范围（在现有消息/会话/推荐链路接入，见各服务注释）：</p>
 * <ul>
 *   <li>消息发送拦截：任一方拉黑另一方时返回业务错误码 BLOCKED（403）</li>
 *   <li>会话列表过滤：过滤存在拉黑关系的会话</li>
 *   <li>推荐候选排除：排除拉黑双方（匹配引擎 TODO 见 RealMatchService/MatchEngine）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/users")
@Validated
public class BlockController {

    private final BlockService blockService;

    public BlockController(BlockService blockService) {
        this.blockService = blockService;
    }

    /**
     * 拉黑目标用户。
     * POST /api/v1/users/{id}/block
     *
     * <p>幂等：重复拉黑同一用户直接返回成功，不产生重复记录。</p>
     *
     * @param id 目标用户 ID
     * @return 空数据成功响应
     */
    @PostMapping("/{id}/block")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> blockUser(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        blockService.block(userId, id);
        return ApiResponse.empty();
    }

    /**
     * 解除拉黑。
     * DELETE /api/v1/users/{id}/block
     *
     * <p>幂等：未拉黑时解除无操作，直接返回成功。</p>
     *
     * @param id 目标用户 ID
     * @return 空数据成功响应
     */
    @DeleteMapping("/{id}/block")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<Void> unblockUser(@PathVariable("id") @Positive Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        blockService.unblock(userId, id);
        return ApiResponse.empty();
    }

    /**
     * 我的被拉黑列表。
     * GET /api/v1/users/blocked
     *
     * @return 被拉黑用户视图列表（按拉黑时间倒序）
     */
    @GetMapping("/blocked")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<List<BlockedUserView>> getBlockedUsers() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(blockService.getBlockedUsers(userId));
    }
}
