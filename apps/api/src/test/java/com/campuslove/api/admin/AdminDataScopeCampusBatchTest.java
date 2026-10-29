package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * {@link AdminDataScope#resolveUserCampusNames(java.util.Collection)} 单元测试。
 *
 * <p>背景：管理端反馈列表原先对每一行调用一次 resolveUserCampusName，一页即数十上百次
 * {@code findByUserId} 往返（N+1）。批量方法必须在「语义与逐条查询完全一致」的前提下
 * 把查询次数压下来，因此这里同时钉住三件事：结果集正确、去重/空值处理正确、批大小上限生效。</p>
 */
@DisplayName("AdminDataScope - 校区名批量解析（列表接口 N+1 修复）")
class AdminDataScopeCampusBatchTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserCampusProfileRepository profileRepository = mock(UserCampusProfileRepository.class);
    private final AdminDataScope scope = new AdminDataScope(userRepository, profileRepository);

    private static UserCampusProfile profileOf(Long userId, String campusName) {
        UserCampusProfile profile = new UserCampusProfile();
        profile.setUserId(userId);
        profile.setCampusName(campusName);
        return profile;
    }

    @Test
    @DisplayName("空集合与 null 输入返回空 Map，且一次都不查库")
    void resolveUserCampusNames_emptyInput_shouldNotQuery() {
        assertTrue(scope.resolveUserCampusNames(List.of()).isEmpty());
        assertTrue(scope.resolveUserCampusNames(null).isEmpty());
        verifyNoInteractions(profileRepository);
    }

    @Test
    @DisplayName("输入只含 null 元素时不查库（避免空 IN 列表）")
    void resolveUserCampusNames_onlyNulls_shouldNotQuery() {
        assertTrue(scope.resolveUserCampusNames(Arrays.asList(null, null)).isEmpty());
        verifyNoInteractions(profileRepository);
    }

    @Test
    @DisplayName("有资料者入 Map；无资料者与 campusName 为空者都不该被当成某个校区")
    void resolveUserCampusNames_shouldSkipMissingAndBlankCampus() {
        when(profileRepository.findByUserIdIn(anyList()))
                .thenReturn(List.of(profileOf(1L, "北京大学"), profileOf(2L, null)));

        Map<Long, String> result = scope.resolveUserCampusNames(List.of(1L, 2L, 3L));

        assertEquals(1, result.size(), "只有 1L 有可用校区名");
        assertEquals("北京大学", result.get(1L));
        assertNull(result.get(2L), "campusName 为 null 不能进 Map，否则校区过滤会误放行");
        assertNull(result.get(3L), "无校园资料的 userId 不在 Map 中");
    }

    @Test
    @DisplayName("重复 id 与 null 元素先去重再查库，只发一次 IN 查询")
    void resolveUserCampusNames_shouldDeduplicateBeforeQuery() {
        when(profileRepository.findByUserIdIn(anyList()))
                .thenReturn(List.of(profileOf(5L, "A 大学"), profileOf(6L, "B 大学")));

        Map<Long, String> result = scope.resolveUserCampusNames(Arrays.asList(5L, 6L, 5L, null, 6L));

        assertEquals(2, result.size());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(profileRepository, times(1)).findByUserIdIn(captor.capture());
        assertEquals(List.of(5L, 6L), captor.getValue(), "查库入参必须是去重且不含 null 的 id 列表");
    }

    @Test
    @DisplayName("600 个 id 拆成 500 + 100 两批，结果仍完整")
    void resolveUserCampusNames_shouldChunkAtBatchSize() {
        List<Long> ids = new ArrayList<>();
        for (long id = 1; id <= 600; id++) {
            ids.add(id);
        }
        when(profileRepository.findByUserIdIn(anyList())).thenAnswer(invocation -> {
            List<Long> batch = invocation.getArgument(0);
            List<UserCampusProfile> profiles = new ArrayList<>();
            for (Long id : batch) {
                profiles.add(profileOf(id, "C" + id));
            }
            return profiles;
        });

        Map<Long, String> result = scope.resolveUserCampusNames(ids);

        assertEquals(600, result.size(), "分批后不能丢 id");
        assertEquals("C600", result.get(600L));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Long>> captor = ArgumentCaptor.forClass(List.class);
        verify(profileRepository, times(2)).findByUserIdIn(captor.capture());
        List<Integer> batchSizes = captor.getAllValues().stream().map(List::size).toList();
        assertEquals(List.of(500, 100), batchSizes, "单条 IN 查询不得塞入超过 500 个 id");
    }

    @Test
    @DisplayName("批量结果与逐条 resolveUserCampusName 语义一致（同一份数据两侧对齐）")
    void resolveUserCampusNames_shouldMatchSingleLookupSemantics() {
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(profileOf(1L, "清华大学")));
        when(profileRepository.findByUserId(2L)).thenReturn(Optional.of(profileOf(2L, null)));
        when(profileRepository.findByUserId(3L)).thenReturn(Optional.empty());
        when(profileRepository.findByUserIdIn(anyList()))
                .thenReturn(List.of(profileOf(1L, "清华大学"), profileOf(2L, null)));

        Map<Long, String> batch = scope.resolveUserCampusNames(List.of(1L, 2L, 3L));

        for (Long id : List.of(1L, 2L, 3L)) {
            assertEquals(scope.resolveUserCampusName(id), batch.get(id),
                    "userId=" + id + " 的批量结果必须与逐条查询一致");
        }
        assertEquals("清华大学", batch.get(1L), "对齐用例本身也要能失败：正例必须命中");
    }
}
