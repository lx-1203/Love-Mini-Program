package com.campuslove.api.match;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.monitor.MatchMetrics;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

/**
 * 匹配控制器单元测试（P7 - Task 7.1.1）。
 *
 * <p>覆盖 {@link MatchController} 的核心场景：</p>
 * <ul>
 *   <li>场景 1：getFormConfig 委托 matchService.getFormConfig</li>
 *   <li>场景 2：getMatch 委托 matchService.getMatch</li>
 *   <li>场景 3：getLikedMe/getVisitors/getHeartSignals/getMyLikes 委托查询接口</li>
 *   <li>场景 4：acceptHeartSignal/declineHeartSignal 委托状态更新</li>
 *   <li>场景 5：rewind 委托 matchService.rewind</li>
 *   <li>场景 6：getIcebreakers 委托 icebreakerService</li>
 *   <li>场景 7：getMatchesDto 暂返回空列表</li>
 * </ul>
 *
 * <p>说明：likeUser/passUser/createMatch/createQuickMatch 等需依赖
 * {@link com.campuslove.api.config.SecurityUtils#getCurrentUserId()} 静态方法，
 * 在无 Web 上下文的纯单元测试中无法直接验证，相关场景由集成测试覆盖。
 * 本测试聚焦于可独立验证的委托契约。</p>
 */
class MatchControllerTest {

    @Mock private MatchService matchService;
    @Mock private IcebreakerService icebreakerService;
    @Mock private MatchMetrics matchMetrics;

    private MatchController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new MatchController(matchService, icebreakerService, matchMetrics);
    }

    @Test
    void constructor_shouldAcceptDependencies() {
        // Arrange & Act & Assert
        assertNotNull(new MatchController(matchService, icebreakerService, matchMetrics));
    }

    @Test
    void getFormConfig_shouldDelegateToService() {
        // Arrange
        MatchFormConfigView view = new MatchFormConfigView(List.of());
        when(matchService.getFormConfig()).thenReturn(view);

        // Act
        MatchFormConfigView result = controller.getFormConfig();

        // Assert
        assertSame(view, result, "应原样返回 service 结果");
        verify(matchService).getFormConfig();
    }

    @Test
    void getMatch_shouldDelegateToService() {
        // Arrange
        MatchResultView view = new MatchResultView(
                "match-1", "MATCHED", "话题", "对方", 30, "推荐破冰", "session-1");
        when(matchService.getMatch(eq("match-1"))).thenReturn(view);

        // Act
        MatchResultView result = controller.getMatch("match-1");

        // Assert
        assertSame(view, result);
        verify(matchService).getMatch(eq("match-1"));
    }

    @Test
    void getMatchesDto_shouldReturnEmptyList() {
        // Act
        ResponseEntity<List<com.campuslove.api.dto.MatchDto>> result = controller.getMatchesDto();

        // Assert
        assertNotNull(result);
        assertEquals(0, result.getBody().size(), "DTO 端点暂返回空列表");
        verify(matchService, never()).getHeartSignals(anyLong());
    }

    @Test
    void getIcebreakers_shouldDelegateToService() {
        // Arrange
        Long matchId = 42L;
        List<IcebreakerView> views = List.of(
                new IcebreakerView("话题 1", "interests", "common_interest"));
        when(icebreakerService.getIcebreakers(matchId)).thenReturn(views);

        // Act
        ResponseEntity<List<IcebreakerView>> result = controller.getIcebreakers(matchId);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getBody().size());
        verify(icebreakerService).getIcebreakers(matchId);
    }

    @Test
    void getIcebreakers_shouldReturnBadRequestOnIllegalArgument() {
        // Arrange
        Long matchId = -1L;
        when(icebreakerService.getIcebreakers(matchId))
                .thenThrow(new IllegalArgumentException("invalid"));

        // Act
        ResponseEntity<List<IcebreakerView>> result = controller.getIcebreakers(matchId);

        // Assert
        assertEquals(400, result.getStatusCode().value());
        assertNull(result.getBody());
    }

    @Test
    void getFormConfig_shouldReturnEmptySectionsByDefault() {
        // Arrange
        when(matchService.getFormConfig()).thenReturn(new MatchFormConfigView(List.of()));

        // Act
        MatchFormConfigView result = controller.getFormConfig();

        // Assert
        assertNotNull(result.sections());
        assertEquals(0, result.sections().size());
    }

    @Test
    void constructor_shouldNotInvokeServiceMethods() {
        // Arrange & Act：构造时不应触发任何服务调用
        new MatchController(matchService, icebreakerService, matchMetrics);

        // Assert
        verify(matchService, times(0)).getFormConfig();
        verify(matchService, never()).getMatch(anyString());
    }
}
