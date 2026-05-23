package com.campuslove.api.growth;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 签到控制器。
 * 提供签到和查询签到状态的 API。
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
   * POST /api/check-in?userId=xxx
   */
  @PostMapping
  public CheckInResultView checkIn(@RequestParam(name = "userId") Long userId) {
    return checkInService.checkIn(userId);
  }

  /**
   * 查询今日签到状态
   * GET /api/check-in/status?userId=xxx
   */
  @GetMapping("/status")
  public CheckInStatusView getStatus(@RequestParam(name = "userId") Long userId) {
    return checkInService.getCheckInStatus(userId);
  }
}
