package com.campuslove.api.growth;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 签到控制器。
 * 提供签到和查询签到状态的 API。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 *
 * 功能7：新增 POST /api/check-in/make-up 端点，用于补签昨日及之前 7 天内的日期。
 */
@RestController
@RequestMapping("/api/v1/check-in")
public class CheckInController {

  private final CheckInService checkInService;

  public CheckInController(CheckInService checkInService) {
    this.checkInService = checkInService;
  }

  /**
   * 签到
   * POST /api/check-in
   */
  @PostMapping
  @Idempotent
  public ApiResponse<CheckInResultView> checkIn() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(checkInService.checkIn(userId));
  }

  /**
   * 查询今日签到状态
   * GET /api/check-in/status
   */
  @GetMapping("/status")
  public ApiResponse<CheckInStatusView> getStatus() {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(checkInService.getCheckInStatus(userId));
  }

  /**
   * 功能7：签到补签。
   *
   * <p>端点：POST /api/check-in/make-up</p>
   *
   * <p>业务规则：
   * <ul>
   *   <li>仅可补签昨日及之前 7 天内的日期（不可补签当天/未来/超出 7 天）</li>
   *   <li>不能补签已签到过的日期</li>
   *   <li>每月补签次数上限默认 3 次（由 MakeUpQuota.limitCount 控制）</li>
   *   <li>首次补签免费，其后每次消耗 50 积分</li>
   * </ul>
   * </p>
   *
   * <p>鉴权：从 SecurityContext 获取当前登录用户 ID。</p>
   *
   * <p>错误处理：
   * <ul>
   *   <li>日期格式无效 / 超出范围 / 已签到过 / 超出月配额 → IllegalArgumentException → 400 Bad Request</li>
   *   <li>未登录 → 401 Unauthorized（由 SecurityUtils 抛出）</li>
   * </ul>
   * </p>
   *
   * @param request 补签请求体（含 date 字段，yyyy-MM-dd）
   * @return 补签结果视图（含连续天数/已用次数/消耗积分）
   */
  @PostMapping("/make-up")
  @Idempotent
  public ApiResponse<MakeUpCheckInResultView> makeUp(@Valid @RequestBody MakeUpCheckInRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    return ApiResponse.ok(checkInService.makeUp(userId, request.date()));
  }
}
