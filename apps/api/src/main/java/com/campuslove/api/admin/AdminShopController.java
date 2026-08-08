package com.campuslove.api.admin;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.ShopItem;
import com.campuslove.api.repository.ShopItemRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 积分商城商品管理控制器（商业模式分页）。
 *
 * <p>支持商品 CRUD + 上下架，客户端积分商城（pages/shop）从此数据读取。
 * 数据隔离：校区管理员仅见「全局商品 + 本校区商品」，写操作越权 403。</p>
 *
 * <p>端点：</p>
 * <ul>
 *   <li>GET /api/v1/admin/business/shop — 分页列表（keyword/category/published/campusName）</li>
 *   <li>POST /api/v1/admin/business/shop — 新增商品</li>
 *   <li>PUT /api/v1/admin/business/shop/{id} — 编辑商品</li>
 *   <li>DELETE /api/v1/admin/business/shop/{id} — 删除商品</li>
 *   <li>POST /api/v1/admin/business/shop/{id}/publish — 上架</li>
 *   <li>POST /api/v1/admin/business/shop/{id}/unpublish — 下架</li>
 * </ul>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/business/shop")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminShopController {

    private final ShopItemRepository shopItemRepository;
    private final AdminDataScope adminDataScope;

    public AdminShopController(ShopItemRepository shopItemRepository,
                               AdminDataScope adminDataScope) {
        this.shopItemRepository = shopItemRepository;
        this.adminDataScope = adminDataScope;
    }

    /**
     * 分页查询商品列表。
     *
     * @param keyword    标题模糊关键字，可选
     * @param category   分类：ticket/food/goods/creative，可选
     * @param published  上下架筛选，可选
     * @param campusName 校区筛选（可选；校区管理员登录时强制按其管辖校区，忽略本参数）
     * @param page       页码，1-based，默认 1
     * @param pageSize   每页大小，默认 20，最大 100
     * @return 分页商品列表
     */
    @GetMapping
    public AdminPageView<AdminShopItemView> listShopItems(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "published", required = false) Boolean published,
            @RequestParam(name = "campusName", required = false) String campusName,
            @RequestParam(name = "page", defaultValue = "1") @Min(1) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        SecurityUtils.getCurrentUserId();

        // 数据隔离：校区管理员强制按其管辖校区过滤（可见全局商品 + 本校区商品）
        String effectiveCampus = adminDataScope.getCurrentAdminCampusName();
        if (effectiveCampus == null) {
            effectiveCampus = normalize(campusName);
        }

        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, pageSize));
        Pageable pageable = PageRequest.of(safePage - 1, safeSize);

        Page<ShopItem> result = shopItemRepository.searchForAdmin(
                normalize(keyword), normalize(category), published, effectiveCampus, pageable);

        List<AdminShopItemView> items = result.getContent().stream()
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
     * 新增商品（校区管理员创建时强制归属其管辖校区）。
     *
     * @param req 新增请求体
     * @return 创建后的商品
     */
    @PostMapping
    @Transactional
    @Auditable(value = AuditOperation.CREATE_SHOP_ITEM, targetType = "SHOP_ITEM",
            description = "新增商城商品")
    public ResponseEntity<AdminShopItemView> createShopItem(@Valid @RequestBody AdminShopItemRequest req) {
        SecurityUtils.getCurrentUserId();

        ShopItem item = new ShopItem();
        item.setTitle(req.title().trim());
        item.setCategory(req.category() != null ? req.category().trim() : "goods");
        item.setPriceCents(req.priceCents() != null ? req.priceCents() : 0);
        item.setOriginalPrice(req.originalPrice());
        item.setImageUrl(req.imageUrl() != null ? req.imageUrl().trim() : "");
        item.setDescription(req.description() != null ? req.description().trim() : "");
        item.setStock(req.stock() != null ? req.stock() : -1);
        item.setPublished(req.published() != null ? req.published() : true);
        item.setSortOrder(req.sortOrder() != null ? req.sortOrder() : 0);

        // 数据隔离：校区管理员创建的商品强制归属其管辖校区
        String myCampus = adminDataScope.getCurrentAdminCampusName();
        if (myCampus != null) {
            item.setCampusName(myCampus);
        } else {
            item.setCampusName(normalize(req.campusName()));
        }

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        item.setCreatedAt(now);
        item.setUpdatedAt(now);
        ShopItem saved = shopItemRepository.save(item);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 编辑商品（越权校验）。
     *
     * @param id  商品 ID
     * @param req 编辑请求体
     * @return 更新后的商品；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.UPDATE_SHOP_ITEM, targetType = "SHOP_ITEM",
            description = "编辑商城商品")
    public ResponseEntity<AdminShopItemView> updateShopItem(
            @PathVariable("id") @Min(1) Long id,
            @Valid @RequestBody AdminShopItemRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<ShopItem> itemOpt = shopItemRepository.findById(id);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ShopItem item = itemOpt.get();
        // 越权校验：校区管理员不可编辑其他校区商品
        adminDataScope.assertCampusAccess(item.getCampusName());

        if (req.title() != null) {
            item.setTitle(req.title().trim());
        }
        if (req.category() != null) {
            item.setCategory(req.category().trim());
        }
        if (req.priceCents() != null) {
            item.setPriceCents(req.priceCents());
        }
        if (req.originalPrice() != null) {
            item.setOriginalPrice(req.originalPrice());
        }
        if (req.imageUrl() != null) {
            item.setImageUrl(req.imageUrl().trim());
        }
        if (req.description() != null) {
            item.setDescription(req.description().trim());
        }
        if (req.stock() != null) {
            item.setStock(req.stock());
        }
        if (req.sortOrder() != null) {
            item.setSortOrder(req.sortOrder());
        }
        item.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        ShopItem saved = shopItemRepository.save(item);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 上架商品。
     *
     * @param id 商品 ID
     * @return 更新后的商品；不存在返回 404
     */
    @PostMapping("/{id}/publish")
    @Transactional
    @Auditable(value = AuditOperation.PUBLISH_SHOP_ITEM, targetType = "SHOP_ITEM",
            description = "上架商城商品")
    public ResponseEntity<AdminShopItemView> publishShopItem(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<ShopItem> itemOpt = shopItemRepository.findById(id);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ShopItem item = itemOpt.get();
        adminDataScope.assertCampusAccess(item.getCampusName());
        item.setPublished(true);
        item.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        ShopItem saved = shopItemRepository.save(item);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 下架商品（下架后客户端商城不再展示，已兑换记录保留）。
     *
     * @param id 商品 ID
     * @return 更新后的商品；不存在返回 404
     */
    @PostMapping("/{id}/unpublish")
    @Transactional
    @Auditable(value = AuditOperation.UNPUBLISH_SHOP_ITEM, targetType = "SHOP_ITEM",
            description = "下架商城商品")
    public ResponseEntity<AdminShopItemView> unpublishShopItem(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<ShopItem> itemOpt = shopItemRepository.findById(id);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ShopItem item = itemOpt.get();
        adminDataScope.assertCampusAccess(item.getCampusName());
        item.setPublished(false);
        item.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        ShopItem saved = shopItemRepository.save(item);
        return ResponseEntity.ok(toView(saved));
    }

    /**
     * 删除商品（越权校验）。
     *
     * @param id 商品 ID
     * @return 204 删除成功；404 不存在
     */
    @DeleteMapping("/{id}")
    @Transactional
    @Auditable(value = AuditOperation.DELETE_SHOP_ITEM, targetType = "SHOP_ITEM",
            description = "删除商城商品")
    public ResponseEntity<Void> deleteShopItem(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<ShopItem> itemOpt = shopItemRepository.findById(id);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        adminDataScope.assertCampusAccess(itemOpt.get().getCampusName());
        shopItemRepository.delete(itemOpt.get());
        return ResponseEntity.noContent().build();
    }

    private AdminShopItemView toView(ShopItem item) {
        return new AdminShopItemView(
                item.getId(),
                item.getTitle(),
                item.getCategory(),
                item.getPriceCents(),
                item.getOriginalPrice(),
                item.getImageUrl(),
                item.getDescription(),
                item.getStock(),
                item.getSalesCount(),
                item.getPublished(),
                item.getSortOrder(),
                item.getCampusName(),
                item.getCreatedAt() != null ? item.getCreatedAt().toString() : null,
                item.getUpdatedAt() != null ? item.getUpdatedAt().toString() : null
        );
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

/**
 * 新增/编辑商城商品请求体。
 *
 * @param title         商品标题（必填，1-128 字）
 * @param category      分类：ticket/food/goods/creative
 * @param priceCents    积分价格（分）
 * @param originalPrice 划线价（分，可空）
 * @param imageUrl      商品图片 URL
 * @param description   商品描述
 * @param stock         库存（-1=不限）
 * @param published     是否上架
 * @param sortOrder     排序权重
 * @param campusName    所属校区（可空，全局商品）
 */
record AdminShopItemRequest(
        @NotBlank(message = "商品标题不能为空")
        @Size(min = 1, max = 128, message = "商品标题长度须为 1-128 字") String title,
        String category,
        @Min(0) Integer priceCents,
        @Min(0) Integer originalPrice,
        String imageUrl,
        String description,
        Integer stock,
        Boolean published,
        Integer sortOrder,
        String campusName) {
}

/**
 * 商城商品视图。
 */
record AdminShopItemView(
        Long id,
        String title,
        String category,
        Integer priceCents,
        Integer originalPrice,
        String imageUrl,
        String description,
        Integer stock,
        Integer salesCount,
        Boolean published,
        Integer sortOrder,
        String campusName,
        String createdAt,
        String updatedAt) {
}
