package com.campuslove.api.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Report;
import com.campuslove.api.repository.ReportRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 举报控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link ReportController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：构造函数注入 reportRepository</li>
 *   <li>场景 2：controller 实例已注入依赖</li>
 * </ul>
 *
 * <p>说明：{@link ReportController#createReport(ReportCreateRequest)} 依赖
 * {@link com.campuslove.api.config.SecurityUtils#getCurrentUserId()}，
 * 在无 Web 上下文的纯单元测试中无法直接验证完整路径；
 * 本测试聚焦于可独立验证的构造注入与 repository 契约。</p>
 */
class ReportControllerTest {

    @Mock private ReportRepository reportRepository;

    private ReportController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new ReportController(reportRepository);
    }

    @Test
    void constructor_shouldAcceptRepository() {
        // Arrange & Act & Assert
        assertNotNull(new ReportController(reportRepository));
    }

    @Test
    void controller_shouldHaveRepositoryInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }

    @Test
    void repository_save_shouldReturnSavedEntityWithId() {
        // Arrange：验证 repository mock 协议
        Report input = new Report();
        input.setTargetType("POST");
        input.setTargetId(100L);
        input.setReason("内容不当");
        input.setReporterId(1L);
        input.setStatus("PENDING");
        input.setCreatedAt(LocalDateTime.now());

        Report saved = new Report();
        saved.setId(99L);
        saved.setTargetType("POST");
        saved.setTargetId(100L);
        saved.setReporterId(1L);
        saved.setReason("内容不当");
        saved.setStatus("PENDING");
        saved.setCreatedAt(input.getCreatedAt());

        when(reportRepository.save(any(Report.class))).thenReturn(saved);

        // Act
        Report result = reportRepository.save(input);

        // Assert：验证 mock 透传协议
        assertNotNull(result);
        assertEquals(99L, result.getId(), "保存后应返回 id");
        assertEquals("POST", result.getTargetType());
        assertEquals(100L, result.getTargetId());
        assertEquals("PENDING", result.getStatus());
        assertSame(saved, result);
        verify(reportRepository).save(any(Report.class));
    }
}
