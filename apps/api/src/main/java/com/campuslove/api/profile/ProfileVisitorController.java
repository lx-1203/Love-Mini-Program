package com.campuslove.api.profile;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.ProfileVisitor;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.ProfileVisitorRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 个人主页访客控制器（功能3）。
 *
 * <p>提供两个端点：
 * <ul>
 *   <li>GET  /api/profile/visitors          —— 查询当前用户的访客列表</li>
 *   <li>POST /api/profile/{userId}/visit    —— 记录当前用户访问他人主页</li>
 * </ul>
 * </p>
 *
 * <p>安全性：所有端点通过 {@link SecurityUtils#getCurrentUserId()} 获取当前用户 ID，
 * 不信任客户端传入的 userId 作为访客身份。</p>
 *
 * <p>去重策略：同一访客对同一主页每天只记录一次访问，
 * 通过数据库唯一约束 + 应用层 existsBy 检查双重保障。</p>
 */
@RestController
@RequestMapping("/api/v1/profile")
public class ProfileVisitorController {

    private static final Logger log = LoggerFactory.getLogger(ProfileVisitorController.class);

    /** 访客时间格式化器，用于视图层展示 */
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ProfileVisitorRepository profileVisitorRepository;
    private final UserRepository userRepository;
    private final UserCampusProfileRepository userCampusProfileRepository;

    /**
     * 构造函数，注入所需 Repository。
     *
     * @param profileVisitorRepository  访客记录数据访问层
     * @param userRepository            用户主表数据访问层（用于丰富访客昵称/头像）
     * @param userCampusProfileRepository 校园资料数据访问层（用于丰富访客学校信息）
     */
    public ProfileVisitorController(ProfileVisitorRepository profileVisitorRepository,
                                    UserRepository userRepository,
                                    UserCampusProfileRepository userCampusProfileRepository) {
        this.profileVisitorRepository = profileVisitorRepository;
        this.userRepository = userRepository;
        this.userCampusProfileRepository = userCampusProfileRepository;
    }

    /**
     * 查询当前用户的访客列表（功能3核心）。
     *
     * <p>返回的每条访客记录包含：
     * <ul>
     *   <li>visitorId：访客用户 ID</li>
     *   <li>nickname：访客昵称（来自 User 表）</li>
     *   <li>avatarUrl：访客头像 URL（来自 User 表）</li>
     *   <li>campusName：访客学校名称（来自 UserCampusProfile 表，可能为空）</li>
     *   <li>visitedAt：访问时间（格式化字符串）</li>
     * </ul>
     * </p>
     *
     * <p>错误处理：
     * <ul>
     *   <li>未认证 → SecurityUtils 抛出 401</li>
     *   <li>用户信息查询异常 → 跳过该访客的丰富信息，仍返回基础访客记录</li>
     * </ul>
     * </p>
     *
     * @return 访客视图列表（按访问时间倒序）
     */
    @GetMapping("/visitors")
    @Transactional(readOnly = true)
    public ApiResponse<List<ProfileVisitorView>> listVisitors() {
        Long hostId = SecurityUtils.getCurrentUserId();
        log.debug("查询用户[{}]的访客列表", hostId);

        List<ProfileVisitor> records = profileVisitorRepository.findByHostIdOrderByVisitedAtDesc(hostId);
        if (records.isEmpty()) {
            return ApiResponse.ok(List.of());
        }

        // 批量查询访客用户信息，避免 N+1 查询
        List<Long> visitorIds = records.stream().map(ProfileVisitor::getVisitorId).distinct().toList();
        Map<Long, User> userMap = new HashMap<>();
        Map<Long, UserCampusProfile> campusMap = new HashMap<>();

        try {
            List<User> users = userRepository.findAllById(visitorIds);
            for (User u : users) {
                userMap.put(u.getId(), u);
            }
        } catch (DataAccessException e) {
            log.warn("批量查询访客用户信息失败: {}", e.getMessage());
        }

        try {
            List<UserCampusProfile> campuses = userCampusProfileRepository.findByUserIdIn(visitorIds);
            for (UserCampusProfile c : campuses) {
                campusMap.put(c.getUserId(), c);
            }
        } catch (DataAccessException e) {
            log.warn("批量查询访客校园资料失败: {}", e.getMessage());
        }

        // 拼装视图
        List<ProfileVisitorView> views = new ArrayList<>(records.size());
        for (ProfileVisitor record : records) {
            User visitor = userMap.get(record.getVisitorId());
            UserCampusProfile campus = campusMap.get(record.getVisitorId());
            String visitedAtStr = record.getVisitedAt() != null
                    ? record.getVisitedAt().format(FORMATTER)
                    : null;
            views.add(new ProfileVisitorView(
                    record.getVisitorId(),
                    visitor != null ? visitor.getNickname() : null,
                    visitor != null ? visitor.getAvatarUrl() : null,
                    campus != null ? campus.getCampusName() : null,
                    visitedAtStr
            ));
        }
        return ApiResponse.ok(views);
    }

    /**
     * 记录当前用户访问他人主页（功能3核心）。
     *
     * <p>逻辑流程：
     * <ol>
     *   <li>校验 targetUserId 非空且不等于当前用户 ID（不记录自访问）</li>
     *   <li>检查当日是否已记录过该访客对该主页的访问（去重）</li>
     *   <li>若未访问过，创建并保存 ProfileVisitor 记录</li>
     * </ol>
     * </p>
     *
     * <p>错误处理：
     * <ul>
     *   <li>targetUserId 为空或等于当前用户 → 抛出 400 Bad Request</li>
     *   <li>目标用户不存在 → 抛出 404 Not Found</li>
     *   <li>并发插入导致唯一约束冲突 → 静默忽略（视为已记录）</li>
     * </ul>
     * </p>
     *
     * @param userId 被访问的主页用户 ID
     * @return 访问记录视图
     */
    @PostMapping("/{userId}/visit")
    @Transactional
    @Idempotent
    public ApiResponse<ProfileVisitorView> recordVisit(@PathVariable("userId") @NotNull Long userId) {
        Long visitorId = SecurityUtils.getCurrentUserId();

        // 参数校验：不能访问自己
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "目标用户 ID 不能为空");
        }
        if (userId.equals(visitorId)) {
            // 自访问不记录，但仍返回一个空视图，保持接口契约一致
            log.debug("用户[{}]访问自己的主页，跳过记录", visitorId);
            return ApiResponse.ok(new ProfileVisitorView(visitorId, null, null, null,
                    LocalDateTime.now().format(FORMATTER)));
        }

        // 校验目标用户存在
        Optional<User> targetUserOpt = userRepository.findById(userId);
        if (targetUserOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "目标用户不存在");
        }

        // 同一天去重：检查当日是否已记录过该访客对该主页的访问
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();
        boolean alreadyVisitedToday = profileVisitorRepository
                .existsByVisitorIdAndHostIdAndVisitedAtBetween(visitorId, userId, dayStart, dayEnd);
        if (alreadyVisitedToday) {
            log.debug("用户[{}]今日已访问过用户[{}]的主页，跳过记录", visitorId, userId);
            // 返回已有记录的视图（不重新插入）
            User target = targetUserOpt.get();
            UserCampusProfile campus = userCampusProfileRepository.findByUserId(userId).orElse(null);
            return ApiResponse.ok(new ProfileVisitorView(
                    visitorId,
                    target.getNickname(),
                    target.getAvatarUrl(),
                    campus != null ? campus.getCampusName() : null,
                    LocalDateTime.now().format(FORMATTER)
            ));
        }

        // 创建并保存访客记录
        ProfileVisitor record = new ProfileVisitor(visitorId, userId, LocalDateTime.now());
        try {
            profileVisitorRepository.save(record);
            log.info("用户[{}]访问用户[{}]的主页，已记录访客记录", visitorId, userId);
        } catch (DataIntegrityViolationException e) {
            // 并发场景下唯一约束冲突，视为已记录
            log.warn("用户[{}]访问用户[{}]的主页时发生唯一约束冲突，视为已记录: {}",
                    visitorId, userId, e.getMessage());
        }

        User target = targetUserOpt.orElseThrow(() ->
                new IllegalStateException("targetUserOpt 已确认非空但 orElseThrow 触发，数据不一致"));
        UserCampusProfile campus = userCampusProfileRepository.findByUserId(userId).orElse(null);
        return ApiResponse.ok(new ProfileVisitorView(
                visitorId,
                target.getNickname(),
                target.getAvatarUrl(),
                campus != null ? campus.getCampusName() : null,
                record.getVisitedAt().format(FORMATTER)
        ));
    }

    /**
     * 访客视图记录（功能3）。
     *
     * <p>仅返回前端展示所需字段，不暴露实体内部状态。</p>
     *
     * @param visitorId  访客用户 ID
     * @param nickname   访客昵称
     * @param avatarUrl  访客头像 URL
     * @param campusName 访客学校名称（可能为空）
     * @param visitedAt  访问时间字符串（格式：yyyy-MM-dd HH:mm:ss）
     */
    public record ProfileVisitorView(
            Long visitorId,
            String nickname,
            String avatarUrl,
            String campusName,
            String visitedAt
    ) {
    }
}
