package com.campuslove.api.shop;

import com.campuslove.api.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 商品服务实现（@Profile("mock")）。
 *
 * <p>展示版（showcase）与本地开发在 mock profile 下运行：无数据库，本实现用内存
 * 商品列表模拟 products 表，种子数据与 real（Flyway V2026.08.10.0022）完全一致，
 * 使 /api/v1/products 端点可用且行为一致。</p>
 *
 * <p>与 {@link RealProductService} 行为对齐：</p>
 * <ul>
 *   <li>分页：仅上架商品、按销量倒序</li>
 *   <li>详情：不存在或下架返回 404 业务错误（RESOURCE_NOT_FOUND）</li>
 * </ul>
 */
@Profile("mock")
@Service
public class MockProductService implements ProductService {

    private final List<ProductView> products = new CopyOnWriteArrayList<>();

    public MockProductService() {
        products.add(new ProductView(1L, "校园音乐节早鸟票", "校园音乐节早鸟票，热门抢手，手慢无",
                new BigDecimal("99.00"), new BigDecimal("129.00"),
                "/static/images/products/ticket-1.jpg", "ticket", 56, 200, "2026-08-10T00:00:00"));
        products.add(new ProductView(2L, "校园文创帆布袋", "校园文创帆布袋，新品上架",
                new BigDecimal("29.90"), new BigDecimal("39.90"),
                "/static/images/products/merch-1.jpg", "creative", 128, 300, "2026-08-10T00:00:00"));
        products.add(new ProductView(3L, "食堂午餐优惠券", "食堂午餐优惠券，限量供应",
                new BigDecimal("9.90"), new BigDecimal("15.00"),
                "/static/images/products/food-1.jpg", "food", 234, 500, "2026-08-10T00:00:00"));
        products.add(new ProductView(4L, "校徽纪念徽章", "校徽纪念徽章，收藏必备",
                new BigDecimal("19.90"), new BigDecimal("25.00"),
                "/static/images/products/merch-2.jpg", "goods", 89, 400, "2026-08-10T00:00:00"));
        products.add(new ProductView(5L, "篮球赛门票", "篮球赛门票，火热开售",
                new BigDecimal("15.00"), new BigDecimal("20.00"),
                "/static/images/products/ticket-2.jpg", "ticket", 45, 150, "2026-08-10T00:00:00"));
        products.add(new ProductView(6L, "校园手绘地图", "校园手绘地图，推荐入手",
                new BigDecimal("12.90"), new BigDecimal("18.00"),
                "/static/images/products/food-2.jpg", "creative", 167, 260, "2026-08-10T00:00:00"));
    }

    @Override
    public ProductPageView listProducts(String category, int page, int pageSize) {
        List<ProductView> filtered = new ArrayList<>(products);
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            filtered.removeIf(p -> !category.equals(p.category()));
        }
        filtered.sort(Comparator.comparing(ProductView::sales).reversed());
        long total = filtered.size();
        int start = (int) Math.min((long) page * pageSize, filtered.size());
        int end = (int) Math.min((long) start + pageSize, filtered.size());
        return new ProductPageView(new ArrayList<>(filtered.subList(start, end)), total, page, pageSize);
    }

    @Override
    public ProductView getProduct(Long productId) {
        return products.stream()
                .filter(p -> p.id().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("商品不存在: " + productId));
    }
}
