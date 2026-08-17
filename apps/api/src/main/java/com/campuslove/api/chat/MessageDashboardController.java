package com.campuslove.api.chat;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 消息首页聚合控制器（消息 V3）。
 */
@RestController
@RequestMapping("/api/v1/messages")
public class MessageDashboardController {

    private final MessageDashboardService messageDashboardService;

    public MessageDashboardController(MessageDashboardService messageDashboardService) {
        this.messageDashboardService = messageDashboardService;
    }

    /**
     * 获取消息首页聚合数据。
     * GET /api/v1/messages/relationship-dashboard
     */
    @GetMapping("/relationship-dashboard")
    @RateLimit(capacity = 60, refillTokens = 1, key = "#request.remoteAddr")
    public MessageDashboardView getRelationshipDashboard() {
        Long userId = SecurityUtils.getCurrentUserId();
        return messageDashboardService.getDashboard(userId);
    }
}
