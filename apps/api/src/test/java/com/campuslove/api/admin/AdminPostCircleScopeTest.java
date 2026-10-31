package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.Post.AuditStatus;
import com.campuslove.api.entity.Post.PostStatus;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import com.campuslove.api.testdata.PostFactory;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * 帖子后台管理（{@link AdminPostController}）的<b>圈层数据作用域</b>单元测试（S2-7，2026-10-31）。
 *
 * <p><b>缺陷基线（改造前）</b>：本控制器只有<b>校区</b>一条轴——列表走
 * {@code PostRepository#searchForAdmin}（按作者 {@code user_campus_profile.campus_name} 过滤），
 * 审核/删除走 {@code adminDataScope.assertCampusAccess(...)}。而 {@code AdminScopeService}
 * 这条「谁绑了哪个圈层节点」的第二授权轴早已接进
 * {@code AdminVillagePostController} 与 {@code AdminUserController}：
 * 在 {@code admin_layer} 绑了 {@code C1/R3}（华东大区）这类圈层的账号，
 * 若其 {@code users.campus_name} 为空或与他校管理员相同，本控制器就把它当成
 * 「无校区 → 内部哨兵 → 什么都看不见」的账号，或把它困在单校口径里；圈层×角色正交模型
 * 在帖子管理面形同虚设。</p>
 *
 * <p><b>为什么读列表与写操作必须同一次改动</b>（上一轮把本控制器显式挂起的理由）：
 * 只换写侧（审核/删除按圈层放行）而列表仍是校区轴，管理员便能审核<b>自己列表里看不见</b>的行；
 * 只换读侧则反之（看得到却点不动）。两种错配都比单一口径危险，
 * 所以本类同时断言：圈层账号的列表走新增的 {@code searchForAdminScoped}，
 * 写操作走 {@code adminScopeService.assertInScope(post.getOwnerCirclePath())}，二者同轴。</p>
 *
 * <p>本用例钉住的契约：</p>
 * <ul>
 *   <li>圈层账号列表：改用圈层子树查询（恰好那一棵子树），且不再叠加自身校区</li>
 *   <li>圈层账号写操作：子树内放行；子树外 → 403 且<b>零写入</b></li>
 *   <li>未绑圈层的校区账号：读写逐字节沿用旧校区轴（增量迁移，可见性不放大）</li>
 *   <li>哨兵账号（空校区 ADMIN / AUDITOR）：列表仍以哨兵当查询参数收敛为空集、
 *       写操作一律 403，且哨兵只做过滤值、绝不成为存储值（fail-closed）</li>
 *   <li>SUPER_ADMIN：行为与改造前一致（仍走 {@code searchForAdmin}，不做圈层过滤）</li>
 *   <li>新增的圈层查询必须在<b>路径段</b>上前缀匹配（禁裸 {@code LIKE '节点%'}，
 *       否则 {@code C1/R3/S1} 会命中 {@code C1/R3/S14}）——注解即真相，反射读回断言</li>
 * </ul>
 */
@DisplayName("AdminPostController - 圈层数据作用域")
class AdminPostCircleScopeTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String CAMPUS_A = "北洋大学";
    private static final String REGION_EAST = "C1/R3";
    private static final String CAMPUS_NODE = "C1/R3/S1";
    private static final String OUTSIDE_NODE = "C1/R4/S9";

    @Mock private PostRepository postRepository;
    @Mock private UserRepository userRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private AdminDataScope adminDataScope;
    @Mock private AdminScopeService adminScopeService;
    @Mock private RealAdminStatsService adminStatsService;

    private AdminPostController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AdminPostController(postRepository, userRepository, commentRepository,
                adminDataScope, adminScopeService, adminStatsService);
    }

    /** 造一条归属某圈层节点的帖子。 */
    private static Post postInCircle(long id, long authorId, String ownerCirclePath) {
        Post post = PostFactory.defaultPost(authorId);
        post.setId(id);
        post.setOwnerCirclePath(ownerCirclePath);
        post.setAuditStatus(AuditStatus.pending);
        return post;
    }

    private static Page<Post> pageOf(List<Post> posts) {
        return new PageImpl<>(posts);
    }

    /** 反射读回新增圈层查询的 JPQL（注解即真相：子树语义写错就等于列表口径写错）。 */
    private static String jpqlOf(String methodName) {
        for (Method method : PostRepository.class.getMethods()) {
            if (!method.getName().equals(methodName)) {
                continue;
            }
            Query annotation = method.getAnnotation(Query.class);
            assertNotNull(annotation, methodName + " 必须带 @Query");
            return annotation.value();
        }
        throw new AssertionError("PostRepository 上找不到方法：" + methodName);
    }

    // ==================== 1. 圈层账号的列表 ====================

    @Test
    @DisplayName("列表：已绑圈层的账号改用圈层子树查询，返回恰为该子树的行")
    void list_circleBoundAdmin_usesCircleScopedQuery() {
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(REGION_EAST));
        // 管理员自身校区（旧轴）即便存在也不参与圈层分支：证明「以圈层为准」
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(CAMPUS_A);
        List<Post> subtree = List.of(
                postInCircle(1L, 11L, CAMPUS_NODE),
                postInCircle(2L, 12L, REGION_EAST + "/S2"));
        when(postRepository.searchForAdminScoped(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), isNull(), eq(ADMIN_ID), any(Pageable.class)))
                .thenReturn(pageOf(subtree));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminPostSummaryView> body =
                    controller.listPosts(null, null, null, null, null, 1, 20);
            assertEquals(List.of(1L, 2L),
                    body.items().stream().map(AdminPostSummaryView::id).toList(),
                    "列表必须恰好是当前管理员绑定节点的子树");
        });
        // 旧校区轴查询不得再被使用（否则绑了大区也只看到本校，正交模型形同虚设）
        verify(postRepository, never()).searchForAdmin(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("列表：圈层分支下调用方显式传的 campusName 仍可主动收窄，管理员自身校区不叠加")
    void list_circleBoundAdmin_honorsExplicitCampusNarrowingOnly() {
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(CAMPUS_NODE));
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(CAMPUS_A);
        when(postRepository.searchForAdminScoped(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq("南开大学"), eq(ADMIN_ID), any(Pageable.class)))
                .thenReturn(pageOf(List.of()));

        withUserId(ADMIN_ID, () -> controller.listPosts(null, null, null, null, "南开大学", 1, 20));

        verify(postRepository).searchForAdminScoped(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq("南开大学"), eq(ADMIN_ID), any(Pageable.class));
    }

    @Test
    @DisplayName("列表：未绑圈层的校区账号沿用旧校区轴（增量迁移，不放大也不误挡可见性）")
    void list_campusOnlyAdmin_keepsLegacyCampusQuery() {
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of());
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(CAMPUS_A);
        when(postRepository.searchForAdmin(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq(CAMPUS_A), any(Pageable.class)))
                .thenReturn(pageOf(List.of(postInCircle(1L, 11L, CAMPUS_NODE))));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminPostSummaryView> body =
                    controller.listPosts(null, null, null, null, null, 1, 20);
            assertEquals(1L, body.total());
        });
        verify(postRepository, never()).searchForAdminScoped(any(), any(), any(), any(), any(),
                any(), any(), any());
    }

    @Test
    @DisplayName("列表：哨兵账号（空校区 ADMIN/AUDITOR）读查询以哨兵为过滤值收敛为空集，且零写入")
    void list_sentinelScopeAccount_failsClosed() {
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of());
        when(adminDataScope.getCurrentAdminCampusName())
                .thenReturn(AdminDataScope.NO_CAMPUS_SCOPE);
        when(postRepository.searchForAdmin(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq(AdminDataScope.NO_CAMPUS_SCOPE), any(Pageable.class)))
                .thenReturn(pageOf(List.of()));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminPostSummaryView> body =
                    controller.listPosts(null, null, null, null, "任意校区", 1, 20);
            assertEquals(0L, body.total(), "哨兵账号不得被传入的 campusName 放开");
            assertTrue(body.items().isEmpty());
        });
        // 哨兵只做查询参数；校区账号忽略调用方 campusName（否则越权读别的校区）
        verify(postRepository).searchForAdmin(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq(AdminDataScope.NO_CAMPUS_SCOPE), any(Pageable.class));
        verify(postRepository, never()).searchForAdminScoped(any(), any(), any(), any(), any(),
                any(), any(), any());
    }

    @Test
    @DisplayName("列表：SUPER_ADMIN 行为不变（仍走旧查询、不带圈层过滤）")
    void list_superAdmin_unchanged() {
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(true);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(AdminScopeService.GLOBAL_PREFIX));
        when(postRepository.searchForAdmin(isNull(), isNull(), eq(PostStatus.deleted),
                isNull(), isNull(), eq("任意校区"), any(Pageable.class)))
                .thenReturn(pageOf(List.of(postInCircle(1L, 11L, OUTSIDE_NODE))));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminPostSummaryView> body =
                    controller.listPosts(null, null, null, null, "任意校区", 1, 20);
            assertEquals(1L, body.total());
        });
        verify(postRepository, never()).searchForAdminScoped(any(), any(), any(), any(), any(),
                any(), any(), any());
    }

    // ==================== 2. 写操作与列表同轴 ====================

    @Test
    @DisplayName("审核：圈层子树外的帖子 → 403，且零写入（不出现「审掉列表里看不见的行」）")
    void audit_outsideCircleScope_returns403AndDoesNotWrite() {
        Post target = postInCircle(9L, 99L, OUTSIDE_NODE);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(REGION_EAST));
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));
        // 断言用的桩：控制器把帖子的归属圈层原样交给圈层轴判定，判定不通过即 403
        doThrow(new OperationForbiddenException("越权访问：该数据归属圈层不在你的数据域内"))
                .when(adminScopeService).assertInScope(OUTSIDE_NODE);

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> controller.auditPost(9L, new AdminPostAuditRequest("approved", null))));

        verify(adminScopeService).assertInScope(OUTSIDE_NODE);
        verify(postRepository, never()).save(any(Post.class));
        verify(adminStatsService, never()).invalidateStatsCache();
    }

    @Test
    @DisplayName("审核：圈层子树内的帖子 → 放行并落库（读列表同一条轴，看得见才审得着）")
    void audit_insideCircleScope_proceeds() {
        Post target = postInCircle(9L, 99L, CAMPUS_NODE);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(REGION_EAST));
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> response =
                    controller.auditPost(9L, new AdminPostAuditRequest("approved", "合规"));
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("approved", response.getBody().get("auditStatus"));
        });
        verify(adminScopeService).assertInScope(CAMPUS_NODE);
        verify(postRepository).save(target);
        assertEquals(AuditStatus.approved, target.getAuditStatus(), "放行的审核必须真的改了状态");
    }

    @Test
    @DisplayName("审核：未归属（owner_circle_path 为 NULL）的帖子对局部圈层账号一律 403")
    void audit_unownedPost_localCircleScope_returns403() {
        Post target = postInCircle(9L, 99L, null);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(REGION_EAST));
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));
        doThrow(new OperationForbiddenException("未归属数据不对局部作用域开放"))
                .when(adminScopeService).assertInScope(null);

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> controller.auditPost(9L, new AdminPostAuditRequest("approved", null))));
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    @DisplayName("删除：校区管理员删非本校区作者的帖子 → 403，且零写入")
    void delete_campusAdminOutsideCampus_returns403AndDoesNotWrite() {
        Post target = postInCircle(9L, 99L, CAMPUS_NODE);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of());
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));
        when(adminDataScope.resolveUserCampusName(99L)).thenReturn("南开大学");
        doThrow(new OperationForbiddenException("越权访问：该数据不属于你管辖的校区"))
                .when(adminDataScope).assertCampusAccess("南开大学");

        withUserId(ADMIN_ID, () -> {
            OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                    () -> controller.deletePost(9L));
            assertEquals(HttpStatus.FORBIDDEN, ex.getHttpStatus());
        });
        verify(postRepository, never()).save(any(Post.class));
        assertEquals(PostStatus.active, target.getStatus(), "被拒的删除不得改动作废状态");
    }

    @Test
    @DisplayName("删除：哨兵账号（空校区）一律 403，且绝不触达 save")
    void delete_sentinelScopeAccount_failsClosed() {
        Post target = postInCircle(9L, 99L, CAMPUS_NODE);
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of());
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));
        when(adminDataScope.resolveUserCampusName(99L)).thenReturn(CAMPUS_A);
        // 空校区账号在 assertCampusAccess 内部拿到 NO_CAMPUS_SCOPE 哨兵 → 一律拒绝
        doThrow(new OperationForbiddenException(AdminDataScope.NO_CAMPUS_SCOPE + " 作用域无写权限"))
                .when(adminDataScope).assertCampusAccess(anyString());

        withUserId(ADMIN_ID, () -> assertThrows(OperationForbiddenException.class,
                () -> controller.deletePost(9L)));
        verify(postRepository, never()).save(any(Post.class));
        verify(postRepository, never()).delete(any());
    }

    @Test
    @DisplayName("删除：圈层账号只在自己的子树内放行")
    void delete_circleBoundAdmin_insideSubtree_proceeds() {
        Post target = postInCircle(9L, 99L, REGION_EAST + "/S7");
        when(adminDataScope.isCurrentSuperAdmin()).thenReturn(false);
        when(adminScopeService.currentPrefixes()).thenReturn(List.of(REGION_EAST));
        when(postRepository.findById(9L)).thenReturn(Optional.of(target));

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> response = controller.deletePost(9L);
            assertEquals(HttpStatus.OK, response.getStatusCode());
        });
        verify(adminScopeService).assertInScope(REGION_EAST + "/S7");
        verify(adminDataScope, never()).assertCampusAccess(any());
        assertEquals(PostStatus.deleted, target.getStatus());
    }

    // ==================== 3. 新增查询本身的口径 ====================

    @Test
    @DisplayName("searchForAdminScoped 的 JPQL 必须按路径段匹配子树、并挂 admin_layer 数据域")
    void circleScopedQuery_matchesByPathSegmentAndAdminLayer() {
        String jpql = jpqlOf("searchForAdminScoped");

        // 圈层子树：绑定节点本身 + 其下一层（大区 C1/R3 覆盖其下所有学校）
        assertTrue(jpql.contains("p.ownerCirclePath = cl.circlePath"),
                "缺少「同节点」分支");
        assertTrue(jpql.contains("LIKE CONCAT(cl.circlePath, '/%')"),
                "子树匹配必须带路径分隔符：裸 CONCAT(cl.circlePath, '%') 会让 C1/R3/S1 命中 C1/R3/S14");
        assertTrue(jpql.contains("FROM AdminLayer al") && jpql.contains("al.adminId = :adminId")
                        && jpql.contains("cl.id = al.circleLayerId"),
                "必须用调用管理员在 admin_layer 绑定的节点作为数据域");

        // 与 searchForAdmin 同口径的筛选项一个都不能少（否则同一筛法在两条轴上结果不同尺）
        String legacy = jpqlOf("searchForAdmin");
        for (String clause : List.of(":auditStatus IS NULL", ":status IS NULL",
                ":excludeStatus IS NULL", ":category IS NULL", ":authorId IS NULL",
                ":campusName IS NULL", "FROM UserCampusProfile ucp")) {
            assertTrue(jpql.contains(clause), "圈层版查询丢了筛选条件：" + clause);
            assertTrue(legacy.contains(clause), "旧查询口径被改动：" + clause);
        }
        assertTrue(jpql.contains("ORDER BY p.createdAt DESC"), "排序须与旧查询一致");
    }

    @Test
    @DisplayName("哨兵常量的语义不变：只做读过滤与写拒绝，控制器内不出现任何 setter 写入")
    void sentinelNeverBecomesStoredValue() throws Exception {
        // 源码级自检：本控制器不得把作用域返回值/哨兵塞进实体 setter
        // （全局同条门禁见 tests/admin-scope-leak.spec.mjs）
        String source = readControllerSource();
        assertTrue(!source.contains("setCampusName(AdminDataScope.NO_CAMPUS_SCOPE"),
                "哨兵字符串被当成归属校区写进实体");
        assertTrue(source.contains("adminScopeService.assertInScope"),
                "写操作失去了圈层轴拦截（退回单轴即本用例的缺陷本身）");
        assertTrue(source.contains("searchForAdminScoped"),
                "列表失去了与写操作同轴的圈层查询（会出现审掉看不见行的缺陷）");
    }

    private static String readControllerSource() throws Exception {
        java.nio.file.Path path = java.nio.file.Path.of(
                "src", "main", "java", "com", "campuslove", "api", "admin",
                "AdminPostController.java");
        if (!java.nio.file.Files.exists(path)) {
            // surefire 的工作目录可能是聚合根（apps/api），两种起点都试
            path = java.nio.file.Path.of("apps", "api", "src", "main", "java", "com",
                    "campuslove", "api", "admin", "AdminPostController.java");
        }
        return java.nio.file.Files.readString(path);
    }
}
