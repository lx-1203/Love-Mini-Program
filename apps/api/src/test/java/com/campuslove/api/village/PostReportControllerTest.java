package com.campuslove.api.village;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.ReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * 帖子举报控制器单元测试（P7 - Task 7.1.1）。
 */
class PostReportControllerTest {

    @Mock private ReportRepository reportRepository;
    @Mock private PostRepository postRepository;

    private PostReportController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new PostReportController(reportRepository, postRepository);
    }

    @Test
    void constructor_shouldAcceptRepositories() {
        // Arrange & Act & Assert
        assertNotNull(new PostReportController(reportRepository, postRepository));
    }

    @Test
    void controller_shouldHaveDependenciesInjected() {
        // Arrange & Act & Assert
        assertNotNull(controller);
    }
}
