package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * 悄悄话后台管理的数据作用域单元测试（S3-7，2026-10-30）。
 *
 * <p><b>缺陷基线（改造前）</b>：{@code AdminWhisperController} 只注入了
 * {@code WhisperMessageRepository}，列表是裸 {@code findAll(PageRequest)}、
 * 删除是裸 {@code deleteById(id)}，两个端点上<b>没有任何</b>校区判定；
 * 而同域同表语义的私信会话管理 {@code AdminConversationController} 却按
 * 「双方参与者均属本校区」过滤并拦截越权。结果：北洋大学管理员可以读到、
 * 也可以删除南开大学用户的悄悄话正文。</p>
 *
 * <p>本测试把迁移后的契约钉死，<b>移除作用域判定即变红</b>：</p>
 * <ul>
 *   <li>列表：跨校区悄悄话不得出现在 items/total 中</li>
 *   <li>删除：跨校区目标 → {@link OperationForbiddenException}（HTTP 403），且不得触达仓储删除</li>
 *   <li>哨兵作用域（空校区的 ADMIN / AUDITOR）：列表空集、删除一律 403（fail-closed）</li>
 *   <li>SUPER_ADMIN：仍走数据库分页，可见全量（行为与改造前一致）</li>
 * </ul>
 */
@DisplayName("AdminWhisperController - 校区数据作用域")
class AdminWhisperScopeTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String BEIYANG = "北洋大学";
    private static final String NANKAI = "南开大学";

    @Mock private WhisperMessageRepository repository;
    @Mock private AdminDataScope adminDataScope;

    private AdminWhisperController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AdminWhisperController(repository, adminDataScope);
    }

    /** 造一条悄悄话：sender → receiver。 */
    private static WhisperMessage whisper(long id, long senderId, long receiverId) {
        WhisperMessage w = new WhisperMessage();
        w.setId(id);
        w.setSenderId(senderId);
        w.setReceiverId(receiverId);
        w.setContent("跨校区可见的私密内容");
        w.setStatus("SENT");
        w.setPriceCents(500L);
        return w;
    }

    // ---- 列表 ----

    @Test
    @DisplayName("列表：校区管理员只看到收发双方均属本校区的悄悄话")
    void list_campusAdmin_excludesCrossCampusWhispers() {
        // 1→2 双方均在北洋；3→4 均在南开；5→6 一校一方（跨校区）
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(BEIYANG);
        when(repository.findAll(any(Sort.class)))
                .thenReturn(List.of(whisper(1L, 1L, 2L), whisper(3L, 3L, 4L), whisper(5L, 5L, 6L)));
        when(adminDataScope.resolveUserCampusNames(any())).thenReturn(Map.of(
                1L, BEIYANG, 2L, BEIYANG,
                3L, NANKAI, 4L, NANKAI,
                5L, BEIYANG, 6L, NANKAI));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminWhisperController.AdminWhisperView> body =
                    controller.list(1, 20).getBody();
            assertEquals(1L, body.total(), "只有双方均属本校区的 1 条可见");
            assertEquals(List.of(1L), body.items().stream().map(AdminWhisperController.AdminWhisperView::id).toList());
        });
    }

    @Test
    @DisplayName("列表：参与者无校区资料视为不属于（fail-closed，不得放开）")
    void list_campusAdmin_unknownCampusParticipant_isExcluded() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(BEIYANG);
        when(repository.findAll(any(Sort.class))).thenReturn(List.of(whisper(1L, 1L, 2L)));
        // receiver 校区缺失 → 不能判定为「双方均属本校区」
        when(adminDataScope.resolveUserCampusNames(any())).thenReturn(Map.of(1L, BEIYANG));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminWhisperController.AdminWhisperView> body =
                    controller.list(1, 20).getBody();
            assertEquals(0L, body.total());
            assertTrue(body.items().isEmpty());
        });
    }

    @Test
    @DisplayName("列表：空校区账号（内部哨兵）读不到任何数据，且不拿哨兵比对校区")
    void list_noCampusScope_returnsEmpty() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(AdminDataScope.NO_CAMPUS_SCOPE);

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminWhisperController.AdminWhisperView> body =
                    controller.list(1, 20).getBody();
            assertEquals(0L, body.total());
            assertTrue(body.items().isEmpty());
        });
        verify(repository, never()).findAll(any(Sort.class));
        verify(repository, never()).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("列表：超级管理员仍走数据库分页、可见全量（改造前后行为一致）")
    void list_superAdmin_unchangedDatabasePaging() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(null);
        when(repository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(whisper(1L, 1L, 2L), whisper(3L, 3L, 4L))));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminWhisperController.AdminWhisperView> body =
                    controller.list(1, 20).getBody();
            assertEquals(2L, body.total());
            assertEquals(2, body.items().size());
        });
        verify(repository).findAll(PageRequest.of(0, 20));
    }

    // ---- 删除 ----

    @Test
    @DisplayName("删除：跨校区目标 → 403，且绝不触达仓储删除")
    void delete_crossCampus_shouldThrow403() {
        WhisperMessage target = whisper(9L, 3L, 4L); // 双方均为南开
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(BEIYANG);
        when(repository.findById(9L)).thenReturn(Optional.of(target));
        when(adminDataScope.resolveUserCampusNames(any())).thenReturn(Map.of(3L, NANKAI, 4L, NANKAI));

        withUserId(ADMIN_ID, () -> {
            OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                    () -> controller.delete(9L));
            assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        });
        verify(repository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("删除：收发双方均属本校区 → 放行并执行删除")
    void delete_ownCampus_shouldProceed() {
        WhisperMessage target = whisper(9L, 1L, 2L);
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(BEIYANG);
        when(repository.findById(9L)).thenReturn(Optional.of(target));
        when(adminDataScope.resolveUserCampusNames(any())).thenReturn(Map.of(1L, BEIYANG, 2L, BEIYANG));

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> response = controller.delete(9L);
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(Boolean.TRUE, response.getBody().get("success"));
        });
        verify(repository).deleteById(9L);
    }

    @Test
    @DisplayName("删除：超级管理员不受校区限制（行为与改造前一致）")
    void delete_superAdmin_allowed() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(null);
        when(repository.findById(9L)).thenReturn(Optional.of(whisper(9L, 3L, 4L)));

        withUserId(ADMIN_ID, () -> controller.delete(9L));
        verify(repository).deleteById(9L);
    }

    @Test
    @DisplayName("删除：空校区账号（内部哨兵）一律 403")
    void delete_noCampusScope_shouldThrow403() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(AdminDataScope.NO_CAMPUS_SCOPE);
        when(repository.findById(9L)).thenReturn(Optional.of(whisper(9L, 1L, 2L)));

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> controller.delete(9L)));
        verify(repository, never()).deleteById(anyLong());
    }
}
