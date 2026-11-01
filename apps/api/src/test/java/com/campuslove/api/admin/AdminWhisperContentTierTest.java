package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.WhisperMessage;
import com.campuslove.api.repository.WhisperMessageRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * W1b-2 运行期判点：悄悄话正文的档位收紧（管理端悄悄话读面与私信侧统一口径）。
 *
 * <p><b>缺陷</b>：改造前 {@code AdminWhisperController} 把
 * {@code whisper_message.content} 原样吐给类级 {@code @PreAuthorize} 放行的<b>全部三档</b>
 * （ADMIN / SUPER_ADMIN / AUDITOR），只做了校区作用域过滤（S3-7），没有做档位收紧；
 * 而同域同语义的 {@code AdminConversationController} 对非超管一律置 null。
 * 结果同一份「两个人私下说的话」，走私信会话页读不到正文、走悄悄话页能整篇读走 ——
 * 保密档位由「走哪个 Controller」决定，这就是自相矛盾。</p>
 *
 * <p><b>本类钉住的口径</b>（四条，每条都是「取消收紧即变红」）：</p>
 * <ul>
 *   <li>超管：正文可见，{@code redacted=false}（改造前后行为一致，不回退既有能力）；</li>
 *   <li>校区管理员：正文为 {@code null}、{@code redacted=true}，且响应文本里不含任何一个字的正文；</li>
 *   <li>收紧只动正文：元数据（收发双方、状态、金额、时间）照常返回，审核工作面不被打断；</li>
 *   <li>档位与校区两条轴互不替代：校区管理员即便在自己校区范围内也读不到正文。</li>
 * </ul>
 *
 * <p>注意 {@code AdminWhisperScopeTest}（上一批 S3-7 交件）只断条数与可见范围、
 * 不断正文取值，故本类新增而不改动它 —— 两条轴各自有判点。</p>
 */
@DisplayName("W1b-2 悄悄话正文档位：只有超管可读，其余整篇收走")
class AdminWhisperContentTierTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String BEIYANG = "北洋大学";
    /** 正文内容刻意取一句「一旦被读走就能在断言里认出」的话 */
    private static final String SECRET = "只说给你听的悄悄话正文";

    @Mock private WhisperMessageRepository repository;
    @Mock private AdminDataScope adminDataScope;

    private AdminWhisperController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AdminWhisperController(repository, adminDataScope);
    }

    private static WhisperMessage whisper(long id, long senderId, long receiverId) {
        WhisperMessage w = new WhisperMessage();
        w.setId(id);
        w.setSenderId(senderId);
        w.setReceiverId(receiverId);
        w.setContent(SECRET);
        w.setStatus("SENT");
        w.setPriceCents(500L);
        return w;
    }

    /** 北洋校区内的一条悄悄话（双方都在本校区）。 */
    private void stubCampusScopedRow() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(BEIYANG);
        when(repository.findAll(any(Sort.class))).thenReturn(List.of(whisper(1L, 1L, 2L)));
        when(adminDataScope.resolveUserCampusNames(any())).thenReturn(Map.of(1L, BEIYANG, 2L, BEIYANG));
    }

    @Test
    @DisplayName("校区管理员：正文为 null 且 redacted=true，响应里不含任何一个字的正文")
    void list_campusAdmin_getsNoContentAtAll() {
        stubCampusScopedRow();
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);

        withUserId(ADMIN_ID, () -> {
            var body = controller.list(1, 20).getBody();
            var item = body.items().get(0);
            assertNull(item.content(), "非超管不得拿到任何正文字样");
            assertTrue(item.redacted(), "收紧必须由服务端显式标记，前端才不需要自己猜");
            assertFalse(String.valueOf(item).contains(SECRET),
                    "视图的 toString 里都不得出现正文（日志泄露面同样要封）");
        });
    }

    @Test
    @DisplayName("超级管理员：正文照旧可见，redacted=false（不把既有能力修坏）")
    void list_superAdmin_stillSeesContent() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(null);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(true);
        when(repository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(whisper(1L, 1L, 2L))));

        withUserId(ADMIN_ID, () -> {
            var body = controller.list(1, 20).getBody();
            var item = body.items().get(0);
            assertEquals(SECRET, item.content(), "超管档位是审核与法务取证的唯一合法正文档位，不得顺手收走");
            assertFalse(item.redacted());
        });
    }

    @Test
    @DisplayName("档位只动正文：元数据（双方 ID / 状态 / 金额 / 计数）照常返回")
    void list_campusAdmin_keepsMetadataForTriage() {
        stubCampusScopedRow();
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);

        withUserId(ADMIN_ID, () -> {
            var body = controller.list(1, 20).getBody();
            var item = body.items().get(0);
            assertEquals(1L, item.id());
            assertEquals(1L, item.senderId());
            assertEquals(2L, item.receiverId());
            assertEquals("SENT", item.status());
            assertEquals(500L, item.priceCents());
            assertEquals(1L, body.total(), "收紧正文不得连带把条数/分页信息改掉（否则审核量无法统计）");
        });
    }

    @Test
    @DisplayName("两条轴互不替代：校区管理员即便在本校区范围内也读不到正文")
    void campusScopeAloneDoesNotGrantContent() {
        stubCampusScopedRow();
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);

        withUserId(ADMIN_ID, () -> {
            var items = controller.list(1, 20).getBody().items();
            assertEquals(1, items.size(), "校区作用域仍按 S3-7 生效（本校区那条可见）");
            items.forEach(i -> assertNull(i.content(), "校区内≠可读正文，档位轴独立负责"));
        });
    }

    @Test
    @DisplayName("哨兵档位（空校区 ADMIN / 空校区 AUDITOR）：既无数据也无正文")
    void noCampusScope_readsNothing() {
        when(adminDataScope.getCurrentAdminCampusName())
                .thenReturn(AdminDataScope.NO_CAMPUS_SCOPE);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);

        withUserId(ADMIN_ID, () -> {
            var body = controller.list(1, 20).getBody();
            assertTrue(body.items().isEmpty());
            assertEquals(0L, body.total());
        });
    }

    @Test
    @DisplayName("与私信侧同判据：两侧都必须只认 isCurrentSuperAdmin 这一个档位来源")
    void tierPredicateIsTheSameOneAsConversations() {
        // 这条是「统一到一条口径」的可执行定义：档位来源只能是 AdminDataScope#isCurrentSuperAdmin，
        // 不允许悄悄话侧另立一套（例如按角色字符串自拼 hasAnyRole 判断）。
        // 把 AdminWhisperController 里那行换成别的判据，本条与静态门同时红。
        stubCampusScopedRow();
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(true);

        withUserId(ADMIN_ID, () -> {
            var item = controller.list(1, 20).getBody().items().get(0);
            assertEquals(SECRET, item.content(),
                    "档位必须由 isCurrentSuperAdmin 单独决定：置 true 就必须能读到正文");
            assertFalse(item.redacted());
        });
    }
}
