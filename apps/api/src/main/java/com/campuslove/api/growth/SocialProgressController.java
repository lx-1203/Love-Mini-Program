package com.campuslove.api.growth;

import com.campuslove.api.config.SecurityUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 社交升温进度控制器。
 *
 * <p>缺陷修复（走查）：前端 {@code services/api.ts} 实际调用
 * {@code GET /api/v1/growth/social-progress} 拉取社交漏斗进度，
 * 但后端仅有 {@link SocialProgressService}（real/mock 双实现），缺少 Controller
 * 暴露该端点，导致前端 Real 模式请求 404。本控制器补齐端点，用户 ID 从
 * JWT 认证上下文获取（与项目其他写/读接口保持一致）。</p>
 *
 * <p>响应结构 {@link SocialProgressView} 与前端 {@code SocialProgressData} 对齐：
 * currentTier / tierLabel / exposureCount / likeCount / matchCount / chatCount /
 * circleCount / activityCount / nextAction / progressPercentage。</p>
 */
@RestController
@RequestMapping("/api/v1/growth")
public class SocialProgressController {

    private final SocialProgressService socialProgressService;

    public SocialProgressController(SocialProgressService socialProgressService) {
        this.socialProgressService = socialProgressService;
    }

    /**
     * 获取当前用户的社交升温进度。
     *
     * @return 社交进度视图（与前端 SocialProgressData 字段对齐）
     */
    @GetMapping("/social-progress")
    public SocialProgressView getSocialProgress() {
        Long userId = SecurityUtils.getCurrentUserId();
        return socialProgressService.getProgress(userId);
    }
}
