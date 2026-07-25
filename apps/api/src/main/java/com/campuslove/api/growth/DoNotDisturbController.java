package com.campuslove.api.growth;

import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 通知免打扰控制器（功能6）。
 *
 * <p>提供两个端点：
 * <ul>
 *   <li>GET  /api/dnd          —— 查询当前用户的免打扰设置</li>
 *   <li>PUT  /api/dnd          —— 更新当前用户的免打扰设置</li>
 * </ul>
 * </p>
 *
 * <p>安全性：所有端点通过 {@link SecurityUtils#getCurrentUserId()} 获取当前用户 ID，
 * 不信任客户端传入的 userId 作为身份来源。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>未认证 → SecurityUtils 抛出 401</li>
 *   <li>请求体校验失败 → @Valid 触发 400 Bad Request</li>
 *   <li>业务校验失败（如 CUSTOM 模式缺 customWeekdays）→ 服务层抛出 IllegalArgumentException → 400</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping("/api/dnd")
public class DoNotDisturbController {

    private static final Logger log = LoggerFactory.getLogger(DoNotDisturbController.class);

    private final DoNotDisturbService doNotDisturbService;

    /**
     * 构造函数，注入免打扰服务。
     *
     * @param doNotDisturbService 免打扰服务实现
     */
    public DoNotDisturbController(DoNotDisturbService doNotDisturbService) {
        this.doNotDisturbService = doNotDisturbService;
    }

    /**
     * 查询当前用户的免打扰设置。
     *
     * @return 免打扰设置视图（永不返回 null，未设置时返回默认偏好）
     */
    @GetMapping
    public DoNotDisturbView getSetting() {
        Long userId = SecurityUtils.getCurrentUserId();
        log.debug("查询用户[{}]的免打扰设置", userId);
        return doNotDisturbService.getSetting(userId);
    }

    /**
     * 更新当前用户的免打扰设置。
     *
     * @param request 免打扰设置请求体（自动校验）
     * @return 更新后的免打扰设置视图
     */
    @PutMapping
    public DoNotDisturbView updateSetting(@Valid @RequestBody DoNotDisturbRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        log.debug("更新用户[{}]的免打扰设置: enabled={}, time={}~{}, repeat={}",
                userId, request.enabled(), request.startTime(), request.endTime(), request.repeatMode());
        return doNotDisturbService.updateSetting(userId, request);
    }
}
