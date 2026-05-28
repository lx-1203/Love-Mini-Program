package com.campuslove.api.growth;

import com.campuslove.api.config.SecurityUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 签到控制器。
 * 提供签到和查询签到状态的 API。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/check-in")
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
  public CheckInResultView checkIn() {
    Long userId = SecurityUtils.getCurrentUserId();
    return checkInService.checkIn(userId);
  }

  /**
   * 查询今日签到状态
   * GET /api/check-in/status
   */
  @GetMapping("/status")
  public CheckInStatusView getStatus() {
    Long userId = SecurityUtils.getCurrentUserId();
    return checkInService.getCheckInStatus(userId);
  }
}
