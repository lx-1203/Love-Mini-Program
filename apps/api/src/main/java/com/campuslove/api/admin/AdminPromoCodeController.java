package com.campuslove.api.admin;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.repository.PromoCodeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 兑换码（VIP 优惠码）商业模块控制器。
 * <p>提供兑换码分页列表、批量生成、作废、CSV 导出等管理端点。</p>
 * <p>权限说明：URL 层 /api/admin/** 已限制 ADMIN 角色；
 * 方法层 @PreAuthorize 作为深度防御（需 @EnableMethodSecurity 启用后生效）。</p>
 * <p>数据隔离说明：兑换码为全局资源（createdBy 管理员，无校区归属），不做校区过滤。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/promo-codes")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminPromoCodeController {

    /** 批量生成单批最大数量 */
    private static final int MAX_BATCH_COUNT = 500;

    /** 百分比折扣最大值（100%） */
    private static final int MAX_PERCENT = 100;

    /** 兑换码前缀 + 随机部分长度（如 LVIP + 8 位 = 12 位） */
    private static final String CODE_PREFIX = "LVIP";

    /** 兑换码随机字符集（大写字母 + 数字，避免混淆字符） */
    private static final String CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /** 兑换码唯一性重试上限 */
    private static final int CODE_RETRY_LIMIT = 20;

    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final PromoCodeRepository promoCodeRepository;

    public AdminPromoCodeController(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    /**
     * 分页查询兑换码列表（支持状态/码模糊筛选）。
     *
     * @param status   状态（ACTIVE/DISABLED），可选
     * @param keyword  兑换码模糊匹配，可选
     * @param page     页码，1-based，默认 1
     * @param pageSize 每页大小，默认 20，最大 100
     * @return 分页兑换码列表（按创建时间倒序）
     */
    @GetMapping
    public AdminPageView<AdminPromoCodeView> listPromoCodes(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        String normalizedStatus = parsePromoStatus(status);
        String normalizedKeyword = normalize(keyword);

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<PromoCode> result = promoCodeRepository.searchForAdmin(
                normalizedStatus, normalizedKeyword, pageable);

        List<AdminPromoCodeView> items = result.getContent().stream()
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
     * 批量生成兑换码。
     *
     * <p>生成规则：码格式为 {@code LVIP + 8 位随机大写字母数字}（字符集剔除 0/O、1/I 等易混淆字符），
     * 逐码校验唯一性（冲突时重试，上限 {@link #CODE_RETRY_LIMIT} 次），
     * 全部码在同一事务内写入 promo_codes 表。</p>
     *
     * <p>字段说明：</p>
     * <ul>
     *   <li>count：生成数量（1-500）</li>
     *   <li>discountType：折扣类型 AMOUNT(满减金额，单位分) / PERCENT(百分比，1-100)</li>
     *   <li>discountValue：折扣值</li>
     *   <li>maxUses：最大使用次数（0 表示不限，剩余次数初始化为 Integer.MAX_VALUE 与客户端兑换语义一致）</li>
     *   <li>validFrom / validTo：有效期范围（validTo 必须晚于 validFrom）</li>
     *   <li>remark：备注</li>
     * </ul>
     *
     * @param req 批量生成请求体
     * @return 生成结果（生成数量、示例码）
     */
    @PostMapping("/batch")
    @Transactional
    @Auditable(value = AuditOperation.CREATE_PROMO_CODE, targetType = "PROMO_CODE",
            description = "管理员批量生成兑换码")
    public Map<String, Object> batchCreate(@Valid @RequestBody AdminBatchPromoCodeRequest req) {
        Long adminId = SecurityUtils.getCurrentUserId();

        // 显式参数校验（与 @Valid 双保险，保证统一中文错误文案）
        if (req.count() == null || req.count() < 1 || req.count() > MAX_BATCH_COUNT) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_GENERATE_COUNT_PREFIX + MAX_BATCH_COUNT + " 之间");
        }
        PromoCode.DiscountType discountType = parseDiscountType(req.discountType());
        if (req.discountValue() == null || req.discountValue() <= 0) {
            throw new IllegalArgumentException(ErrorMessages.DISCOUNT_VALUE_POSITIVE);
        }
        if (discountType == PromoCode.DiscountType.PERCENT && req.discountValue() > MAX_PERCENT) {
            throw new IllegalArgumentException(ErrorMessages.DISCOUNT_PERCENT_MAX_PREFIX + MAX_PERCENT);
        }
        if (req.maxUses() == null || req.maxUses() < 0) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_MAX_USES_NOT_NEGATIVE);
        }
        if (req.validFrom() == null || req.validTo() == null) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_VALID_PERIOD_REQUIRED);
        }
        if (!req.validTo().isAfter(req.validFrom())) {
            throw new IllegalArgumentException(ErrorMessages.PROMO_END_AFTER_START);
        }

        String remark = normalize(req.remark());
        List<String> generatedCodes = new ArrayList<>(req.count());
        for (int i = 0; i < req.count(); i++) {
            generatedCodes.add(createPromoCode(discountType, req, adminId, remark));
        }

        return Map.of(
                "success", true,
                "count", generatedCodes.size(),
                "sampleCode", generatedCodes.get(0)
        );
    }

    /**
     * 作废兑换码（置为 DISABLED）。
     * <p>作废为幂等操作：已作废的兑换码再次作废直接返回当前状态。</p>
     *
     * @param id 兑换码 ID
     * @return 操作结果；兑换码不存在返回 404
     */
    @PostMapping("/{id}/disable")
    @Transactional
    @Auditable(value = AuditOperation.DISABLE_PROMO_CODE, targetType = "PROMO_CODE",
            description = "管理员作废兑换码")
    public ResponseEntity<Map<String, Object>> disable(@PathVariable("id") @Positive Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<PromoCode> promoOpt = promoCodeRepository.findById(id);
        if (promoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PromoCode promo = promoOpt.get();
        promo.setStatus(PromoCode.PromoStatus.DISABLED.name());
        // updatedAt 由 @LastModifiedDate 自动维护
        promoCodeRepository.save(promo);

        return ResponseEntity.ok(Map.of(
                "id", promo.getId(),
                "code", promo.getCode(),
                "status", promo.getStatus(),
                "success", true
        ));
    }

    /**
     * 导出兑换码 CSV（UTF-8 + BOM，便于 Excel 直接打开中文不乱码）。
     * <p>导出全量兑换码（不分页），按创建时间倒序。</p>
     *
     * @return CSV 文件响应
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv() {
        SecurityUtils.getCurrentUserId();

        List<PromoCode> all = promoCodeRepository.findAll(
                Sort.by(Sort.Direction.DESC, "createdAt"));

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM：Excel 识别中文表头
        sb.append('\uFEFF');
        sb.append("兑换码,折扣类型,折扣值,状态,有效期起,有效期止\n");
        for (PromoCode p : all) {
            sb.append(escapeCsv(p.getCode())).append(',')
                    .append(discountTypeLabel(p.getDiscountType())).append(',')
                    .append(p.getDiscountValue()).append(',')
                    .append(statusLabel(p.getStatus())).append(',')
                    .append(formatDateTime(p.getValidFrom())).append(',')
                    .append(formatDateTime(p.getValidTo()))
                    .append('\n');
        }

        String filename = "promo_codes_" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now(TimeZones.BUSINESS)) + ".csv";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成并保存单个兑换码。
     *
     * @param discountType 折扣类型（已校验）
     * @param req          批量生成请求体
     * @param adminId      当前管理员 ID
     * @param remark       备注（已归一化）
     * @return 生成的兑换码字符串
     */
    private String createPromoCode(PromoCode.DiscountType discountType, AdminBatchPromoCodeRequest req,
                                   Long adminId, String remark) {
        String code = generateUniqueCode();

        PromoCode promo = new PromoCode();
        promo.setCode(code);
        promo.setDiscountType(discountType.name());
        promo.setDiscountValue(req.discountValue());
        promo.setMaxUses(req.maxUses());
        promo.setMaxUsesPerUser(1);
        promo.setUsedCount(0);
        // maxUses=0（不限次数）时剩余次数初始化为 Integer.MAX_VALUE，与 Flyway 迁移语义一致
        promo.setRemainingUses(req.maxUses() == 0 ? Integer.MAX_VALUE : req.maxUses());
        promo.setValidFrom(req.validFrom());
        promo.setValidTo(req.validTo());
        promo.setStatus(PromoCode.PromoStatus.ACTIVE.name());
        promo.setCreatedBy(adminId);
        promo.setRemark(remark);
        // createdAt/updatedAt 由 @CreatedDate/@LastModifiedDate 自动维护
        promoCodeRepository.save(promo);
        return code;
    }

    /**
     * 生成唯一兑换码（LVIP + 8 位随机大写字母数字）。
     *
     * @return 唯一兑换码
     * @throws IllegalArgumentException 连续重试仍冲突时抛出
     */
    private String generateUniqueCode() {
        for (int attempt = 0; attempt < CODE_RETRY_LIMIT; attempt++) {
            StringBuilder sb = new StringBuilder(CODE_PREFIX);
            for (int i = 0; i < 8; i++) {
                sb.append(CODE_CHARSET.charAt(SECURE_RANDOM.nextInt(CODE_CHARSET.length())));
            }
            String code = sb.toString();
            if (promoCodeRepository.findByCode(code).isEmpty()) {
                return code;
            }
        }
        throw new IllegalArgumentException(ErrorMessages.PROMO_GEN_CONFLICT_RETRY);
    }

    /**
     * Entity 转视图。
     */
    private AdminPromoCodeView toView(PromoCode promo) {
        return new AdminPromoCodeView(
                promo.getId(),
                promo.getCode(),
                promo.getDiscountType(),
                promo.getDiscountValue(),
                promo.getMaxUses(),
                promo.getMaxUsesPerUser(),
                promo.getUsedCount(),
                promo.getRemainingUses(),
                promo.getValidFrom(),
                promo.getValidTo(),
                promo.getStatus(),
                promo.getRemark(),
                promo.getCreatedBy(),
                promo.getCreatedAt()
        );
    }

    /**
     * 解析兑换码状态参数（大小写不敏感），非法参数直接 400。
     */
    private String parsePromoStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (PromoCode.PromoStatus s : PromoCode.PromoStatus.values()) {
            if (s.name().equalsIgnoreCase(trimmed)) {
                return s.name();
            }
        }
        throw new IllegalArgumentException(ErrorMessages.ILLEGAL_PROMO_STATUS_PREFIX + value);
    }

    /**
     * 解析折扣类型参数（大小写不敏感），非法参数直接 400。
     */
    private PromoCode.DiscountType parseDiscountType(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(ErrorMessages.DISCOUNT_TYPE_REQUIRED);
        }
        String trimmed = value.trim();
        for (PromoCode.DiscountType t : PromoCode.DiscountType.values()) {
            if (t.name().equalsIgnoreCase(trimmed)) {
                return t;
            }
        }
        throw new IllegalArgumentException(ErrorMessages.ILLEGAL_DISCOUNT_TYPE_PREFIX + value + "，仅支持 AMOUNT/PERCENT");
    }

    /**
     * 折扣类型中文标签（CSV 导出用）。
     */
    private String discountTypeLabel(String discountType) {
        if (PromoCode.DiscountType.PERCENT.name().equals(discountType)) {
            return "百分比折扣";
        }
        return "满减金额";
    }

    /**
     * 状态中文标签（CSV 导出用）。
     */
    private String statusLabel(String status) {
        if (PromoCode.PromoStatus.DISABLED.name().equals(status)) {
            return "已禁用";
        }
        return "可用";
    }

    /**
     * 时间格式化（CSV 导出用），null 返回空串。
     */
    private String formatDateTime(LocalDateTime value) {
        return value == null ? "" : CSV_DATE_FORMAT.format(value);
    }

    /**
     * CSV 字段转义：含逗号/引号/换行时用双引号包裹并转义。
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /**
     * 参数归一化：空字符串视为 null。
     */
    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    /**
     * 管理后台 - 批量生成兑换码请求体。
     *
     * @param count         生成数量（1-500）
     * @param discountType  折扣类型 AMOUNT/PERCENT
     * @param discountValue 折扣值（AMOUNT 为分，PERCENT 为 1-100）
     * @param maxUses       最大使用次数（0 表示不限）
     * @param validFrom     有效期开始时间
     * @param validTo       有效期结束时间
     * @param remark        备注（可空）
     */
    public record AdminBatchPromoCodeRequest(
            // R4-01843：统一使用 MAX_BATCH_COUNT 常量（原为字面量 500，与校验分支易漂移）
            @Min(1) @Max(AdminPromoCodeController.MAX_BATCH_COUNT) Integer count,
            String discountType,
            @Positive Integer discountValue,
            @Min(0) Integer maxUses,
            LocalDateTime validFrom,
            LocalDateTime validTo,
            String remark
    ) {
    }

    /**
     * 管理后台 - 兑换码视图。
     *
     * @param id            兑换码 ID
     * @param code          兑换码字符串
     * @param discountType  折扣类型 AMOUNT/PERCENT
     * @param discountValue 折扣值
     * @param maxUses       最大使用次数
     * @param maxUsesPerUser 单用户最大使用次数
     * @param usedCount     已使用次数
     * @param remainingUses 剩余可用次数
     * @param validFrom     有效期开始时间
     * @param validTo       有效期结束时间
     * @param status        状态 ACTIVE/DISABLED
     * @param remark        备注
     * @param createdBy     创建者用户 ID
     * @param createdAt     创建时间
     */
    public record AdminPromoCodeView(
            Long id,
            String code,
            String discountType,
            Integer discountValue,
            Integer maxUses,
            Integer maxUsesPerUser,
            Integer usedCount,
            Integer remainingUses,
            LocalDateTime validFrom,
            LocalDateTime validTo,
            String status,
            String remark,
            Long createdBy,
            LocalDateTime createdAt
    ) {
    }
}
