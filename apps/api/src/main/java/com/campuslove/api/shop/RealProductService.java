package com.campuslove.api.shop;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.Product;
import com.campuslove.api.repository.ProductRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实商品服务实现（3-H 商品，real profile）。
 *
 * <p>使用 Repository 分页查询 products 表；仅上架商品（status=1）对客户端可见，
 * 详情不存在或已下架统一返回 404 业务错误（RESOURCE_NOT_FOUND）。</p>
 */
@Profile("real")
@Service
public class RealProductService implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(RealProductService.class);

    private final ProductRepository productRepository;

    public RealProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public ProductPageView listProducts(String category, int page, int pageSize) {
        Pageable pageable = PageRequest.of(page, pageSize);
        Page<Product> result;
        if (category == null || category.isBlank() || "all".equalsIgnoreCase(category)) {
            result = productRepository.findByStatusOrderBySalesDescIdDesc(Product.STATUS_ON_SALE, pageable);
        } else {
            result = productRepository.findByCategoryAndStatusOrderBySalesDescIdDesc(
                    category, Product.STATUS_ON_SALE, pageable);
        }
        List<ProductService.ProductView> items = result.getContent().stream()
                .map(ProductService.ProductView::fromEntity)
                .toList();
        return new ProductPageView(items, result.getTotalElements(), page, pageSize);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductService.ProductView getProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("商品不存在: " + productId));
        if (product.getStatus() == null || product.getStatus() != Product.STATUS_ON_SALE) {
            log.info("商品已下架，按不存在处理：productId={}", productId);
            throw new ResourceNotFoundException("商品不存在: " + productId);
        }
        return ProductService.ProductView.fromEntity(product);
    }
}
