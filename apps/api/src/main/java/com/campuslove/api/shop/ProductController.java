package com.campuslove.api.shop;

import com.campuslove.api.common.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商品控制器（3-H 商品）。
 *
 * <p>端点：</p>
 * <ul>
 *   <li>GET /api/v1/products?category=&amp;page=&amp;pageSize= —— 商品分页列表（仅上架，按销量倒序）</li>
 *   <li>GET /api/v1/products/{id} —— 商品详情（不存在返回 404 业务错误 RESOURCE_NOT_FOUND）</li>
 * </ul>
 *
 * <p>category 取值对齐前端 pages/shop/index.vue 分类 Tab：
 * ticket（门票）/ food（美食）/ goods（好物）/ creative（文创）；
 * 不传或 all 表示全部分类。</p>
 */
@RestController
@RequestMapping("/api/v1/products")
@Validated
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * 商品分页列表。
     * GET /api/v1/products?category=ticket&page=0&pageSize=20
     *
     * @param category 分类（ticket/food/goods/creative，缺省/ALL=全部）
     * @param page     页码（从 0 开始）
     * @param pageSize 每页大小（默认 20，最大 100）
     * @return 商品分页视图
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ProductService.ProductPageView> listProducts(
            @RequestParam(name = "category", required = false)
            @Pattern(regexp = "^(all|ticket|food|goods|creative)$",
                    message = "category 取值仅支持 all/ticket/food/goods/creative")
            String category,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "pageSize", defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        return ApiResponse.ok(productService.listProducts(category, page, pageSize));
    }

    /**
     * 商品详情。
     * GET /api/v1/products/{id}
     *
     * @param id 商品 ID
     * @return 商品视图
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<ProductService.ProductView> getProduct(@PathVariable("id") @Positive Long id) {
        return ApiResponse.ok(productService.getProduct(id));
    }
}
