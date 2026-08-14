package com.campuslove.api.shop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.entity.Product;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/**
 * 真实商品服务冒烟测试（3-H 商品）。
 */
class RealProductServiceTest {

    @Mock private com.campuslove.api.repository.ProductRepository productRepository;

    private RealProductService productService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        productService = new RealProductService(productRepository);
    }

    private Product product(Long id, String name, String category, int sales) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setCategory(category);
        p.setSales(sales);
        p.setStock(100);
        p.setStatus(Product.STATUS_ON_SALE);
        p.setPrice(new BigDecimal("99.00"));
        return p;
    }

    @Test
    void listProducts_withoutCategory_shouldQueryAllOnSale() {
        Product p = product(1L, "校园音乐节早鸟票", "ticket", 56);
        Page<Product> page = new PageImpl<>(List.of(p), PageRequest.of(0, 20), 1);
        when(productRepository.findByStatusOrderBySalesDescIdDesc(Product.STATUS_ON_SALE, PageRequest.of(0, 20)))
                .thenReturn(page);

        ProductService.ProductPageView result = productService.listProducts(null, 0, 20);

        assertEquals(1, result.total());
        assertEquals("校园音乐节早鸟票", result.items().get(0).name());
        assertEquals("ticket", result.items().get(0).category());
    }

    @Test
    void listProducts_withCategory_shouldQueryByCategory() {
        when(productRepository.findByCategoryAndStatusOrderBySalesDescIdDesc(
                "ticket", Product.STATUS_ON_SALE, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        ProductService.ProductPageView result = productService.listProducts("ticket", 0, 20);

        assertEquals(0, result.total());
    }

    @Test
    void getProduct_shouldReturnOnSaleProduct() {
        Product p = product(1L, "校园音乐节早鸟票", "ticket", 56);
        when(productRepository.findById(1L)).thenReturn(Optional.of(p));

        ProductService.ProductView view = productService.getProduct(1L);

        assertNotNull(view);
        assertEquals("校园音乐节早鸟票", view.name());
    }

    @Test
    void getProduct_shouldReturn404_whenNotExists() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> productService.getProduct(999L));
    }

    @Test
    void getProduct_shouldReturn404_whenOffSale() {
        Product p = product(1L, "下架商品", "goods", 0);
        p.setStatus(Product.STATUS_OFF_SALE);
        when(productRepository.findById(1L)).thenReturn(Optional.of(p));
        assertThrows(ResourceNotFoundException.class, () -> productService.getProduct(1L));
    }
}
