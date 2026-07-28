package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.RecommendationPreference;
import com.campuslove.api.repository.RecommendationPreferenceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * UserPreferenceCalculator 单元测试（Task 4.1.2）。
 *
 * <p>覆盖范围：</p>
 * <ul>
 *   <li>getPreferences：默认值与持久化记录查询</li>
 *   <li>savePreferences：参数校验、新增/更新分支</li>
 *   <li>updatePreferences：参数校验、scope 合法性校验、异常包装</li>
 *   <li>parseInterestTags：JSON 解析与异常降级</li>
 *   <li>parseStringList：JSON 解析与异常降级</li>
 * </ul>
 */
class UserPreferenceCalculatorTest {

    @Mock private RecommendationPreferenceRepository recommendationPreferenceRepository;

    private UserPreferenceCalculator calculator;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        calculator = new UserPreferenceCalculator(
                recommendationPreferenceRepository,
                new ObjectMapper());
    }

    // ============ getPreferences ============

    /**
     * 场景：未持久化的用户调用 getPreferences 应返回默认值。
     */
    @Test
    void getPreferences_noPersistedRecord_returnsDefault() {
        Long userId = 100L;
        when(recommendationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.empty());

        RecommendationPreferencesView view = calculator.getPreferences(userId);

        assertEquals("12:00", view.dailyNotifyTime());
        assertEquals("campus_first", view.scope());
        assertTrue(view.campusPriority());
    }

    /**
     * 场景：用户已持久化偏好时返回数据库中的值。
     */
    @Test
    void getPreferences_persistedRecord_returnsStoredValues() {
        Long userId = 200L;
        RecommendationPreference pref = new RecommendationPreference();
        pref.setUserId(userId);
        pref.setPreferredTime("18:30");
        pref.setScope("city");
        pref.setCampusPriority(false);
        when(recommendationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.of(pref));

        RecommendationPreferencesView view = calculator.getPreferences(userId);

        assertEquals("18:30", view.dailyNotifyTime());
        assertEquals("city", view.scope());
        assertFalse(view.campusPriority());
    }

    /**
     * 场景：userId 为 null 应抛 IllegalArgumentException。
     */
    @Test
    void getPreferences_nullUserId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.getPreferences(null));
        assertEquals("userId is required", ex.getMessage());
    }

    // ============ savePreferences ============

    /**
     * 场景：首次保存偏好（数据库无记录）应创建新实体并持久化。
     */
    @Test
    void savePreferences_firstTime_createsNewRecord() {
        Long userId = 300L;
        when(recommendationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.empty());

        RecommendationPreferencesView result = calculator.savePreferences(
                userId, "09:00", "city", false);

        assertEquals("09:00", result.dailyNotifyTime());
        assertEquals("city", result.scope());
        assertFalse(result.campusPriority());

        verify(recommendationPreferenceRepository, times(1)).save(any(RecommendationPreference.class));
    }

    /**
     * 场景：已有偏好时 savePreferences 应更新现有记录。
     */
    @Test
    void savePreferences_existingRecord_updatesInPlace() {
        Long userId = 301L;
        RecommendationPreference existing = new RecommendationPreference();
        existing.setUserId(userId);
        existing.setPreferredTime("12:00");
        existing.setScope("campus_first");
        existing.setCampusPriority(true);
        when(recommendationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.of(existing));

        RecommendationPreferencesView result = calculator.savePreferences(
                userId, "20:00", "unlimited", null);

        assertEquals("20:00", result.dailyNotifyTime());
        assertEquals("unlimited", result.scope());
        // campusPriority 为 null 时应默认为 true
        assertTrue(result.campusPriority());
        verify(recommendationPreferenceRepository, times(1)).save(existing);
    }

    /**
     * 场景：preferredTime 为空应抛异常。
     */
    @Test
    void savePreferences_blankPreferredTime_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.savePreferences(1L, "", "city", true));
        assertEquals("preferredTime is required", ex.getMessage());

        verify(recommendationPreferenceRepository, never()).save(any());
    }

    /**
     * 场景：scope 为空应抛异常。
     */
    @Test
    void savePreferences_blankScope_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.savePreferences(1L, "12:00", "  ", true));
        assertEquals("scope is required", ex.getMessage());

        verify(recommendationPreferenceRepository, never()).save(any());
    }

    /**
     * 场景：userId 为 null 应抛异常。
     */
    @Test
    void savePreferences_nullUserId_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.savePreferences(null, "12:00", "city", true));
        assertEquals("userId is required", ex.getMessage());
    }

    // ============ updatePreferences ============

    /**
     * 场景：updatePreferences 首次调用应创建新记录。
     */
    @Test
    void updatePreferences_firstTime_createsNewRecord() {
        Long userId = 400L;
        RecommendationPreference data = new RecommendationPreference();
        data.setPreferredTime("14:00");
        data.setScope("unlimited");
        data.setCampusPriority(true);

        when(recommendationPreferenceRepository.findByUserId(userId))
                .thenReturn(Optional.empty());

        RecommendationPreferencesView result = calculator.updatePreferences(userId, data);

        assertEquals("14:00", result.dailyNotifyTime());
        assertEquals("unlimited", result.scope());
        verify(recommendationPreferenceRepository, times(1)).save(any(RecommendationPreference.class));
    }

    /**
     * 场景：scope 不合法应抛 IllegalArgumentException。
     */
    @Test
    void updatePreferences_invalidScope_throwsException() {
        RecommendationPreference data = new RecommendationPreference();
        data.setPreferredTime("14:00");
        data.setScope("invalid_scope");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.updatePreferences(1L, data));
        assertTrue(ex.getMessage().contains("推荐范围(scope)无效"));
        verify(recommendationPreferenceRepository, never()).save(any());
    }

    /**
     * 场景：preferredTime 为空应抛异常。
     */
    @Test
    void updatePreferences_blankPreferredTime_throwsException() {
        RecommendationPreference data = new RecommendationPreference();
        data.setPreferredTime("  ");
        data.setScope("city");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.updatePreferences(1L, data));
        assertTrue(ex.getMessage().contains("preferredTime"));
    }

    /**
     * 场景：data 为 null 应抛异常。
     */
    @Test
    void updatePreferences_nullData_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.updatePreferences(1L, null));
        assertEquals("偏好数据不能为空", ex.getMessage());
    }

    /**
     * 场景：userId 为 null 应抛异常。
     */
    @Test
    void updatePreferences_nullUserId_throwsException() {
        RecommendationPreference data = new RecommendationPreference();
        data.setPreferredTime("12:00");
        data.setScope("city");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> calculator.updatePreferences(null, data));
        assertEquals("userId 不能为空", ex.getMessage());
    }

    // ============ parseInterestTags ============

    /**
     * 场景：合法 JSON 数组应正确解析为 Set。
     */
    @Test
    void parseInterestTags_validJson_returnsSet() {
        Set<String> result = calculator.parseInterestTags("[\"摄影\", \"篮球\", \"阅读\"]");

        assertEquals(3, result.size());
        assertTrue(result.contains("摄影"));
        assertTrue(result.contains("篮球"));
        assertTrue(result.contains("阅读"));
    }

    /**
     * 场景：null / 空白 JSON 应返回空集合。
     */
    @Test
    void parseInterestTags_nullOrBlank_returnsEmptySet() {
        assertTrue(calculator.parseInterestTags(null).isEmpty());
        assertTrue(calculator.parseInterestTags("").isEmpty());
        assertTrue(calculator.parseInterestTags("   ").isEmpty());
    }

    /**
     * 场景：JSON 解析失败应返回空集合，不抛异常。
     */
    @Test
    void parseInterestTags_invalidJson_returnsEmptySet() {
        assertTrue(calculator.parseInterestTags("not a json").isEmpty());
        assertTrue(calculator.parseInterestTags("[unclosed").isEmpty());
    }

    // ============ parseStringList ============

    /**
     * 场景：合法 JSON 数组应正确解析为 List。
     */
    @Test
    void parseStringList_validJson_returnsList() {
        List<String> result = calculator.parseStringList("[\"url1\", \"url2\"]");

        assertEquals(2, result.size());
        assertEquals("url1", result.get(0));
        assertEquals("url2", result.get(1));
    }

    /**
     * 场景：null / 空白 JSON 应返回空列表。
     */
    @Test
    void parseStringList_nullOrBlank_returnsEmptyList() {
        assertTrue(calculator.parseStringList(null).isEmpty());
        assertTrue(calculator.parseStringList("").isEmpty());
        assertTrue(calculator.parseStringList("   ").isEmpty());
    }

    /**
     * 场景：JSON 解析失败应返回空列表，不抛异常。
     */
    @Test
    void parseStringList_invalidJson_returnsEmptyList() {
        assertTrue(calculator.parseStringList("invalid").isEmpty());
        assertTrue(calculator.parseStringList("[unclosed,").isEmpty());
        assertTrue(calculator.parseStringList("{not: array}").isEmpty());
    }
}
