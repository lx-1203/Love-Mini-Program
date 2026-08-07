package com.campuslove.api.admin;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.CheckIn;
import com.campuslove.api.repository.CheckInRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 金币（积分）商业模块控制器。
 * <p>提供金币/积分流水分页查询。</p>
 * <p>实现说明：当前系统无独立金币/积分流水实体（积分商城为独立模块，后续任务处理），
 * 签到积分流水以 {@link CheckIn}（check_ins 表）作为数据源：
 * 每次签到即一笔积分流水，签到来源（NORMAL 正常签到 / MAKE_UP 补签）作为流水类型。</p>
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 * <p>数据隔离：签到记录按用户归属校区（{@code UserCampusProfile.campusName}）过滤，
 * 校区管理员仅可见本校区用户的积分流水。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/coins")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminCoinController {

    private final CheckInRepository checkInRepository;
    /** 校园管理员数据隔离（商业模式：每个高校一个管理员） */
    private final AdminDataScope adminDataScope;

    public AdminCoinController(CheckInRepository checkInRepository, AdminDataScope adminDataScope) {
        this.checkInRepository = checkInRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询签到积分流水（支持用户/来源/日期范围筛选 + 校区数据隔离）。
     *
     * @param userId   用户 ID，可选
     * @param type     流水类型（签到来源 NORMAL/MAKE_UP），可选
     * @param dateFrom 签到起始日期，可选
     * @param dateTo   签到结束日期，可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页签到积分流水（按签到时间倒序）
     */
    @GetMapping
    public AdminPageView<AdminCoinFlowView> listCoinFlows(
            @RequestParam(name = "userId", required = false) @Positive Long userId,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "dateFrom", required = false) LocalDate dateFrom,
            @RequestParam(name = "dateTo", required = false) LocalDate dateTo,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedType = parseSourceType(type);

        // 日期范围参数自校验：起始日期不得晚于结束日期
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new IllegalArgumentException("起始日期不能晚于结束日期");
        }

        // 数据隔离：签到记录按用户归属校区过滤
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<CheckIn> result = checkInRepository.searchForAdmin(
                userId, normalizedType, dateFrom, dateTo, effectiveCampus, pageable);

        List<AdminCoinFlowView> items = result.getContent().stream()
                .map(this::toView)
                .toList();

        return new AdminPageView<>(
                items,
                result.getTotalElements(),
                safePage,
                safeSize,
                AdminPageView.calculateTotalPages(result.getTotalElements(), safeSize)
        );
    }

    /**
     * Entity 转积分流水视图。
     */
    private AdminCoinFlowView toView(CheckIn checkIn) {
        return new AdminCoinFlowView(
                checkIn.getId(),
                checkIn.getUserId(),
                checkIn.getCheckInDate(),
                checkIn.getSource(),
                checkIn.getConsecutiveDays(),
                checkIn.getCreatedAt()
        );
    }

    /**
     * 解析签到来源参数（大小写不敏感），非法参数直接 400。
     */
    private String parseSourceType(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (CheckIn.SOURCE_NORMAL.equalsIgnoreCase(trimmed)) {
            return CheckIn.SOURCE_NORMAL;
        }
        if (CheckIn.SOURCE_MAKE_UP.equalsIgnoreCase(trimmed)) {
            return CheckIn.SOURCE_MAKE_UP;
        }
        throw new IllegalArgumentException("非法流水类型参数: " + value + "，仅支持 NORMAL/MAKE_UP");
    }

    /**
     * 管理后台 - 签到积分流水视图。
     *
     * @param id              流水 ID
     * @param userId          用户 ID
     * @param checkInDate     签到日期
     * @param source          签到来源 NORMAL/MAKE_UP
     * @param consecutiveDays 连续签到天数
     * @param createdAt       签到时间
     */
    public record AdminCoinFlowView(
            Long id,
            Long userId,
            LocalDate checkInDate,
            String source,
            Integer consecutiveDays,
            LocalDateTime createdAt
    ) {
    }
}
