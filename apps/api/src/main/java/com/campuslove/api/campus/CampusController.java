package com.campuslove.api.campus;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.Idempotent;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.discover.ActivityService;
import com.campuslove.api.discover.ActivityView;
import com.campuslove.api.entity.School;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.ratelimit.RateLimit;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.village.CampusFeedView;
import com.campuslove.api.village.VillageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 校园社交 REST 控制器。
 * 暴露校园话题、回复、认证、活动等 API 端点。
 * 写操作的用户ID从JWT认证上下文中获取。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/campus")
@Validated
public class CampusController {

    private final CampusService campusService;
    private final CampusCertificationService certService;
    private final UserCampusProfileRepository campusProfileRepository;
    private final SchoolRepository schoolRepository;
    private final ActivityService activityService;
    private final VillageService villageService;

    public CampusController(
            CampusService campusService,
            CampusCertificationService certService,
            UserCampusProfileRepository campusProfileRepository,
            SchoolRepository schoolRepository,
            ActivityService activityService,
            VillageService villageService) {
        this.campusService = campusService;
        this.certService = certService;
        this.campusProfileRepository = campusProfileRepository;
        this.schoolRepository = schoolRepository;
        this.activityService = activityService;
        this.villageService = villageService;
    }

    // ── 校园话题 ──

    /**
     * 获取校园话题列表（分页）。
     *
     * <p>SubTask 5.2.3：改用 Spring Data {@link Pageable} 接收分页参数，
     * 通过 {@link PageImpl} 构造 {@link Page} 返回标准分页结构。</p>
     *
     * <p>历史实现使用手动 {@code subList} 分页，存在以下问题：</p>
     * <ul>
     *   <li>分页逻辑散落在 Controller，违反单一职责；</li>
     *   <li>不支持 {@code sort} 参数，难以扩展排序；</li>
     *   <li>未暴露 {@code totalPages/first/last/empty} 等元数据，前端需自行计算。</li>
     * </ul>
     *
     * <p>修复：使用 {@link Pageable}（Spring Data 标准）接收 page/size/sort，
     * 服务层返回完整 List 后由 {@link PageImpl} 在内存中切片并附带分页元数据。
     * 响应 DTO 沿用 {@link CampusTopicPageResponse}，保持前端契约不变。</p>
     *
     * @param category 话题分类（可选）
     * @param pageable Spring Data 自动绑定的分页参数（page 从 0 开始，size 1~100）
     */
    @GetMapping("/topics")
    public ResponseEntity<CampusTopicPageResponse> listTopics(
            @RequestParam(name = "category", required = false) String category,
            @PageableDefault(size = 20) Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long schoolId = resolveSchoolId(userId);
        if (schoolId == null) {
            // A-26 修复：未绑定学校（或学校不在 schools 表）时返回明确业务错误，
            // 而非静默空列表——引导用户先完成校园认证/绑定学校
            throw new IllegalArgumentException(ErrorMessages.CAMPUS_VERIFICATION_REQUIRED);
        }

        List<CampusTopicView> allTopics = campusService.getCampusTopics(schoolId, category);

        // SubTask 5.2.3：使用 Spring Data PageImpl 替代手动 subList
        // PageImpl 内部完成切片与元数据计算（totalElements/totalPages/number/size）
        Page<CampusTopicView> pageResult = new PageImpl<>(
                slicePage(allTopics, pageable),
                pageable,
                allTopics.size());

        return ResponseEntity.ok(CampusTopicPageResponse.from(pageResult));
    }

    /**
     * SubTask 5.2.3：按 Pageable 对 List 进行内存切片。
     *
     * <p>抽取为独立方法便于复用（如回复列表分页），并集中处理越界场景：</p>
     * <ul>
     *   <li>{@code offset >= total}：返回空 List；</li>
     *   <li>{@code offset + size > total}：截断到 total。</li>
     * </ul>
     */
    private <T> List<T> slicePage(List<T> source, Pageable pageable) {
        if (source.isEmpty()) {
            return List.of();
        }
        int total = source.size();
        int from = (int) Math.min(pageable.getOffset(), total);
        int to = (int) Math.min(pageable.getOffset() + pageable.getPageSize(), total);
        if (from >= to) {
            return List.of();
        }
        return source.subList(from, to);
    }

    /**
     * 获取单个校园话题详情。
     */
    @GetMapping("/topics/{id}")
    public ApiResponse<CampusTopicView> getTopic(@PathVariable("id") @Positive Long id) {
        CampusTopicView topic = campusService.getCampusTopic(id);
        return ApiResponse.ok(topic);
    }

    /**
     * 创建新的校园话题。
     *
     * <p>速率限制：桶容量 20，每 2 秒补充 1 个令牌，按客户端 IP 限流，
     * 防止话题刷屏。</p>
     */
    @PostMapping("/topics")
    @RateLimit(capacity = 20, refillTokens = 0.5, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<CampusTopicView> createTopic(
            @Valid @RequestBody CreateCampusTopicRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        Long schoolId = resolveSchoolId(userId);
        CampusTopicView topic = campusService.createCampusTopic(
                userId, schoolId, req.category(), req.title(), req.content(), req.tags());
        return ApiResponse.ok(topic);
    }

    /**
     * 获取校园话题回复列表（分页）。
     *
     * <p>SubTask 5.2.3：改用 Spring Data {@link Pageable}，与 {@code listTopics} 保持一致。
     * 默认每页 20 条，可通过 {@code size} 参数调整（1~100）。</p>
     */
    @GetMapping("/topics/{id}/replies")
    public ResponseEntity<CampusReplyPageResponse> listReplies(
            @PathVariable("id") @Positive Long id,
            @PageableDefault(size = 20) Pageable pageable) {
        try {
            // 兼容历史默认值：未传 size 时回退到 20
            Pageable effective = normalizeRepliesPageable(pageable);
            List<CampusTopicReplyView> allReplies = campusService.getCampusTopicReplies(id);

            Page<CampusTopicReplyView> pageResult = new PageImpl<>(
                    slicePage(allReplies, effective),
                    effective,
                    allReplies.size());

            return ResponseEntity.ok(CampusReplyPageResponse.from(pageResult));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * SubTask 5.2.3：归一化回复列表分页参数。
     *
     * <p>历史契约默认每页 20 条。当客户端未显式传 size 时，
     * Spring Data 默认 size=20，已与历史行为一致；此方法仅做边界保护：
     * size 超过 100 时截断到 100，避免一次拉取过多数据。</p>
     */
    private Pageable normalizeRepliesPageable(Pageable pageable) {
        if (pageable.getPageSize() > 100) {
            return PageRequest.of(pageable.getPageNumber(), 100, pageable.getSort());
        }
        return pageable;
    }

    /**
     * 回复校园话题。
     *
     * <p>速率限制：桶容量 30，每秒补充 1 个令牌，按客户端 IP 限流，
     * 防止回复刷屏。</p>
     */
    @PostMapping("/topics/{id}/replies")
    @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<CampusTopicReplyView> createReply(
            @PathVariable("id") @Positive Long id,
            @Valid @RequestBody CreateCampusReplyRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        CampusTopicReplyView reply = campusService.replyCampusTopic(id, userId, req.content());
        return ApiResponse.ok(reply);
    }

    // ── 校园认证 ──

    /**
     * 获取当前用户的校园认证状态。
     */
    @GetMapping("/certification")
    public ApiResponse<CampusCertificationView> getCertification() {
        Long userId = SecurityUtils.getCurrentUserId();
        CampusCertificationView cert = certService.getCertificationStatus(userId);
        return ApiResponse.ok(cert);
    }

    /**
     * 提交校园认证申请。
     *
     * <p>速率限制：桶容量 5，每 60 秒补充 1 个令牌（refillTokens≈0.017/s），
     * 按客户端 IP 限流，防止认证申请滥用。
     * 实际 refillTokens 取 0.05（每 20 秒补充 1 个），兼顾用户体验与防滥用。</p>
     */
    @PostMapping("/certification")
    @RateLimit(capacity = 5, refillTokens = 0.05, key = "#request.remoteAddr")
    @Idempotent
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<CampusCertificationView> submitCertification(
            @Valid @RequestBody CampusCertificationRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        CampusCertificationView cert = certService.submitCertification(
                userId, req.schoolName(), req.major(), req.studentIdCardUrl(),
                req.chsiCode(), req.chsiScreenshotUrl());
        return ApiResponse.ok(cert);
    }

    // R4-00358：模拟认证端点（/certification/simulate）已拆分为
    // DemoCertificationSimulateController（仅演示配置开启时注册），
    // 生产 API 面不再暴露该演示残留端点。

    // ── 校园活动 ──

    /**
     * 获取校园活动列表。
     *
     * <p>缺陷修复（走查）：前端 {@code stores/campus.ts} 的
     * {@code fetchCampusActivities()} 调用 {@code GET /api/v1/campus/activities}，
     * 后端此前无此端点返回 404。此处复用 {@link ActivityService} 的 upcoming
     * 活动数据：已绑定学校的用户按校区过滤，未绑定时返回全部活动；
     * 响应结构按前端 {@code CampusActivity} 接口对齐（见
     * {@link CampusActivityListItemView}）。</p>
     *
     * @return 校园活动列表（直接返回数组，与前端 request 封装约定一致）
     */
    @GetMapping("/activities")
    public List<CampusActivityListItemView> getCampusActivities() {
        Long userId = SecurityUtils.getCurrentUserId();
        String campusName = campusProfileRepository.findByUserId(userId)
                .map(profile -> profile.getCampusName())
                .orElse(null);
        Page<ActivityView> page = activityService.getActivities(campusName, null, userId, PageRequest.of(0, 50));
        return page.getContent().stream().map(this::toCampusActivityItem).toList();
    }

    // ── 同校动态流 ──

    /**
     * 获取同校动态流（别名端点）。
     *
     * <p>缺陷修复（走查）：前端写死调用 {@code GET /api/v1/campus/feed}（见
     * {@code stores/village/api.ts} 的 {@code fetchCampusFeedApi}），而后端实际
     * 端点为 {@code /posts/campus-feed}（VillageController），前端请求 404。
     * 本端点为别名，委托 {@link VillageService#getCampusFeed} 返回
     * {@link CampusFeedView}（posts / activities / topics，与前端
     * {@code CampusFeedView} 类型对齐）。用户 ID 从 JWT 认证上下文获取，
     * 与 VillageController 的 campus-feed 行为一致（前端传入的 userId
     * 查询参数不参与鉴权，防止伪造他人身份）。</p>
     *
     * @param page 页码（默认 0）
     * @param size 每页大小（默认 20，上限 100）
     * @return 同校动态流视图
     */
    @GetMapping("/feed")
    public ResponseEntity<CampusFeedView> getCampusFeed(
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        try {
            CampusFeedView feed = villageService.getCampusFeed(userId, page, size);
            return ResponseEntity.ok(feed);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── 私有辅助方法 ──

    /**
     * 将活动视图映射为前端 CampusActivity 结构。
     *
     * <p>缺失字段（coverUrl / endTime / maxParticipants）返回安全默认值，
     * 避免前端渲染 undefined；startTime 取自活动日期（ISO 时间字符串）。</p>
     */
    private CampusActivityListItemView toCampusActivityItem(ActivityView view) {
        return new CampusActivityListItemView(
                view.id(),
                view.title(),
                view.description(),
                "",
                view.activityDate() != null ? view.activityDate().atStartOfDay().toString() : "",
                "",
                view.location(),
                null,
                view.enrollmentCount(),
                null);
    }

    /**
     * 从用户校园资料中解析学校ID（P0-18）。
     *
     * <p>修复：原实现使用 {@code campusName.hashCode()} 推导 schoolId，与
     * schools 表真实主键不一致，导致校园话题种子、管理员管辖校区等按
     * school_id 关联的数据全部无法命中。现改为按校区名查询 schools 表
     * 返回真实 id；schools 表无该校或用户未绑定学校时返回 null。</p>
     *
     * @param userId 当前用户 ID
     * @return schools 表主键 id；未绑定学校或学校不在库中时返回 null
     */
    private Long resolveSchoolId(Long userId) {
        return campusProfileRepository.findByUserId(userId)
                .map(UserCampusProfile::getCampusName)
                .flatMap(schoolRepository::findByName)
                .map(School::getId)
                .orElse(null);
    }
}

// ── 请求/响应 DTO ──

/**
 * 校园话题分页响应（匹配 Spring Data Page 格式）。
 *
 * <p>SubTask 5.2.3：新增 {@link #from(Page)} 工厂方法，从 Spring Data {@link Page}
 * 直接构造响应，避免 Controller 手工拷贝字段，降低字段遗漏风险。</p>
 *
 * <p>额外暴露 {@code totalPages/first/last/empty} 元数据，便于前端分页 UI 渲染
 * （如「上一页/下一页」按钮的 disabled 状态）。</p>
 */
record CampusTopicPageResponse(
    List<CampusTopicView> content,
    int totalElements,
    int number,
    int size,
    int totalPages,
    boolean first,
    boolean last,
    boolean empty
) {
    /** SubTask 5.2.3：从 Spring Data Page 构造响应，集中字段映射。 */
    static CampusTopicPageResponse from(Page<CampusTopicView> page) {
        return new CampusTopicPageResponse(
                page.getContent(),
                (int) page.getTotalElements(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.isEmpty());
    }
}

/**
 * 校园话题回复分页响应。
 *
 * <p>SubTask 5.2.3：与 {@link CampusTopicPageResponse} 对齐，
 * 新增 {@link #from(Page)} 工厂方法与分页元数据字段。</p>
 */
record CampusReplyPageResponse(
    List<CampusTopicReplyView> content,
    int totalElements,
    int number,
    int size,
    int totalPages,
    boolean first,
    boolean last,
    boolean empty
) {
    /** SubTask 5.2.3：从 Spring Data Page 构造响应，集中字段映射。 */
    static CampusReplyPageResponse from(Page<CampusTopicReplyView> page) {
        return new CampusReplyPageResponse(
                page.getContent(),
                (int) page.getTotalElements(),
                page.getNumber(),
                page.getSize(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.isEmpty());
    }
}

/**
 * 创建校园话题请求体。
 *
 * @param category 话题分类（必填）
 * @param title    话题标题（必填，≤200 字）
 * @param content  话题内容（必填，≤5000 字）
 * @param tags     话题标签数组（3-L：可选，≤5 个，每个 ≤20 字符）
 */
record CreateCampusTopicRequest(
    @NotBlank String category,
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    @Size(max = 5) List<@Size(max = 20) String> tags
) {}

/**
 * 创建校园话题回复请求体。
 */
record CreateCampusReplyRequest(
    @NotBlank @Size(max = 2000) String content
) {}

/**
 * 校园认证提交请求体。
 *
 * @param schoolName         学校名称
 * @param major              专业
 * @param studentIdCardUrl   学生证图片 URL
 * @param chsiCode           学信网在线验证码（B1-3 学历认证，可空）
 * @param chsiScreenshotUrl  学信网学历截图 URL（B1-3 学历认证，可空）
 */
record CampusCertificationRequest(
    @NotBlank @Size(max = 100) String schoolName,
    @NotBlank @Size(max = 100) String major,
    // infra R2-00215: 学生证图片 URL 长度上限，防止超长 URL 入库
    @NotBlank @Size(max = 2048) String studentIdCardUrl,
    @Size(max = 64) String chsiCode,
    @Size(max = 2048) String chsiScreenshotUrl
) {}
