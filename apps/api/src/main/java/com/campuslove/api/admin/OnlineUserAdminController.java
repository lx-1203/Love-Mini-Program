package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.auth.OnlineUserService;
import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 在线用户管理控制器（对齐 eladmin「在线用户」）。
 *
 * <p>接口：</p>
 * <ul>
 *   <li>GET  /api/v1/admin/online-users —— 在线用户列表（userId/昵称/登录方式/登录时间）</li>
 *   <li>POST /api/v1/admin/online-users/{userId}/kick —— 强制下线：将该用户在线会话
 *       jti 加入黑名单（{@link TokenBlacklistService}），并删除在线会话记录</li>
 * </ul>
 *
 * <p>权限说明：</p>
 * <ul>
 *   <li>URL 层：SecurityConfig 已配置 /api/v1/admin/** 仅 ADMIN 角色可访问（real 模式）</li>
 *   <li>方法层：{@code @PreAuthorize("hasRole('SUPER_ADMIN')")} —— 在线会话查看与强制下线
 *       属账号安全操作，仅超级管理员可执行</li>
 * </ul>
 *
 * <p>实现说明：会话记录由 {@link OnlineUserService} 维护（登录写入、登出删除，TTL = JWT 有效期）；
 * 踢下线复用既有 jti 黑名单机制（RedisTokenBlacklistService），黑名单 TTL 取会话剩余有效期，
 * token 自然过期后黑名单条目自动清理。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/online-users")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class OnlineUserAdminController {

    private static final Logger log = LoggerFactory.getLogger(OnlineUserAdminController.class);

    private final OnlineUserService onlineUserService;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;

    public OnlineUserAdminController(OnlineUserService onlineUserService,
                                     TokenBlacklistService tokenBlacklistService,
                                     UserRepository userRepository) {
        this.onlineUserService = onlineUserService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.userRepository = userRepository;
    }

    /**
     * 在线用户列表（R4-00388 加分页，在线用户多时防止响应体膨胀）。
     *
     * <p>返回分页在线会话（userId/昵称/登录方式/登录时间），昵称通过 UserRepository
     * 批量查询补全（避免 N+1），用户已被删除时昵称为 null。</p>
     *
     * @param page 页码（从 0 开始，默认 0）
     * @param size 每页大小（默认 50，最大 200）
     * @return 在线用户列表
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<List<OnlineUserView>> listOnlineUsers(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "50") @Min(1) @Max(200) int size) {
        SecurityUtils.getCurrentUserId();

        List<OnlineUserService.OnlineSessionEntry> sessions = onlineUserService.listOnlineSessions();
        if (sessions.isEmpty()) {
            return ApiResponse.ok(List.of());
        }
        // 内存分页（会话源为 Redis SCAN/本地内存，量级受在线用户数限制）
        int start = Math.min(page * size, sessions.size());
        int end = Math.min(start + size, sessions.size());
        sessions = sessions.subList(start, end);

        // 批量预取昵称（避免逐条查库）
        List<Long> userIds = sessions.stream()
                .map(OnlineUserService.OnlineSessionEntry::userId)
                .toList();
        Map<Long, String> nicknameById = userRepository.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getNickname() != null ? u.getNickname() : "", (a, b) -> a));

        List<OnlineUserView> views = new ArrayList<>(sessions.size());
        for (OnlineUserService.OnlineSessionEntry entry : sessions) {
            OnlineUserService.OnlineSessionRecord session = entry.session();
            views.add(new OnlineUserView(
                    entry.userId(),
                    blankToNull(nicknameById.get(entry.userId())),
                    session.loginMethod(),
                    session.loginAtIso()
            ));
        }
        return ApiResponse.ok(views);
    }

    /**
     * 强制下线指定用户。
     *
     * <p>流程：</p>
     * <ol>
     *   <li>查询该用户在线会话；不存在返回 400（业务提示"当前不在线"）</li>
     *   <li>将会话 jti 加入黑名单（TTL = 会话剩余有效期），其已持有的 JWT 立即失效</li>
     *   <li>删除在线会话记录，@Auditable 记录审计（targetId 自动取自 @PathVariable）</li>
     * </ol>
     *
     * @param userId 目标用户 ID
     * @return 操作结果
     */
    @PostMapping("/{userId}/kick")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.KICK_ONLINE_USER, targetType = "USER",
            description = "强制下线在线用户")
    public ApiResponse<Map<String, Object>> kickOnlineUser(@PathVariable("userId") @Positive Long userId) {
        SecurityUtils.getCurrentUserId();

        Optional<OnlineUserService.OnlineSessionRecord> sessionOpt = onlineUserService.getSession(userId);
        if (sessionOpt.isEmpty()) {
            log.info("踢下线失败：用户当前不在线, userId={}", userId);
            throw new IllegalArgumentException(ErrorMessages.USER_NOT_ONLINE);
        }
        OnlineUserService.OnlineSessionRecord session = sessionOpt.get();

        // 将 jti 加入黑名单（TTL = 会话剩余有效期），token 自然过期后自动清理
        long remainingTtl = session.remainingTtlSeconds();
        if (remainingTtl > 0) {
            tokenBlacklistService.revoke(session.jti(), remainingTtl);
        }
        // 删除在线会话记录，该用户后续请求将被 JwtAuthenticationFilter 以 TOKEN_REVOKED 拒绝
        onlineUserService.removeLogin(userId);
        log.info("强制下线成功, userId={}, jti={}, 黑名单TTL={}s", userId, session.jti(), remainingTtl);

        return ApiResponse.ok(Map.of(
                "userId", userId,
                "success", true
        ));
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}

/**
 * 在线用户视图。
 *
 * @param userId      用户 ID
 * @param nickname    用户昵称（用户已删除时为 null）
 * @param loginMethod 登录方式（wechat / phone / admin）
 * @param loginAt     登录时间（ISO 格式）
 */
record OnlineUserView(Long userId, String nickname, String loginMethod, String loginAt) {
}
