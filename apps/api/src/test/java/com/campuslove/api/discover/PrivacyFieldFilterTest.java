package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * 隐私字段过滤白名单漂移测试（2026-08-12 V3.1 新增）。
 *
 * <p>背景：V3 给 {@link RecommendedPersonView} 增加 {@code profileBackgroundUrl} 字段时
 * 未同步 {@link PrivacyFieldFilter#ALLOWED_FIELDS}，导致运行时 sanitize 抛异常、
 * GET /recommendations 游客+登录全 500。本测试在编译期/运行期双重防漂移：</p>
 * <ul>
 *   <li>白名单与 record 字段集合差集为空（新增字段未同步白名单时测试立刻红）；</li>
 *   <li>{@code assertFieldsInWhitelist} 不抛异常（sanitize 关键路径）。</li>
 * </ul>
 */
class PrivacyFieldFilterTest {

    /** 场景：RecommendedPersonView 声明的字段必须全部出现在 ALLOWED_FIELDS 白名单中。 */
    @Test
    void allRecommendedPersonViewFields_areAllowed() {
        Set<String> recordFields = new HashSet<>(
                Arrays.stream(RecommendedPersonView.class.getRecordComponents())
                        .map(RecordComponent::getName)
                        .toList());
        Set<String> allowed = PrivacyFieldFilter.ALLOWED_FIELDS;

        Set<String> missing = new HashSet<>(recordFields);
        missing.removeAll(allowed);

        assertTrue(missing.isEmpty(),
                "RecommendedPersonView 字段未同步到 PrivacyFieldFilter.ALLOWED_FIELDS: " + missing);
    }

    /** 场景：sanitize 对非空列表执行白名单校验时不抛异常（推荐接口 500 回归防线）。 */
    @Test
    void assertFieldsInWhitelist_doesNotThrow_forRecommendedPersonView() {
        assertDoesNotThrow(() ->
                PrivacyFieldFilter.assertFieldsInWhitelist(RecommendedPersonView.class));
    }

    /** 场景：白名单不含已知敏感字段（防止敏感字段被误放行）。 */
    @Test
    void allowedFields_doNotContainSensitiveNames() {
        List<String> forbidden = List.of("phone", "idcard", "password", "openid", "secret");
        for (String field : PrivacyFieldFilter.ALLOWED_FIELDS) {
            String lower = field.toLowerCase();
            for (String pattern : forbidden) {
                assertTrue(!lower.contains(pattern),
                        "白名单不应包含敏感字段: " + field);
            }
        }
    }

    /** 场景：白名单字段数应与 record 字段数一致（防漏加也防多放）。 */
    @Test
    void allowedFieldCount_matchesRecordFieldCount() {
        long recordFieldCount = Arrays.stream(RecommendedPersonView.class.getRecordComponents()).count();
        assertEquals(recordFieldCount, PrivacyFieldFilter.ALLOWED_FIELDS.size(),
                "ALLOWED_FIELDS 应与 RecommendedPersonView 字段数一致");
    }
}
