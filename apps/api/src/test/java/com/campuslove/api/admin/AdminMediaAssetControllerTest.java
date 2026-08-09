package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.repository.MediaAssetRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.time.LocalDateTime;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

/**
 * 管理后台 - 媒体图片审核控制器单元测试（2026-08-09）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>列表：pending 筛选 + pending 优先排序（经 searchForAdmin 委托）</li>
 *   <li>列表：校区管理员强制按管辖校区过滤</li>
 *   <li>详情：正常返回 / 不存在 404</li>
 *   <li>审核：通过写回（audit_status=approved + 审核人 + 审核时间）</li>
 *   <li>审核：拒绝无备注 → 400</li>
 *   <li>审核：拒绝有备注 → 写回</li>
 *   <li>校区越权 → OperationForbiddenException</li>
 * </ul>
 */
class AdminMediaAssetControllerTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final Long ASSET_ID = 1L;
    private static final Long USER_ID = 5L;

    @Mock private MediaAssetRepository mediaAssetRepository;
    @Mock private UserRepository userRepository;
    @Mock private AdminDataScope adminDataScope;
    @Mock private MediaAssetService mediaAssetService;
    private AdminMediaAssetController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AdminMediaAssetController(
                mediaAssetRepository, userRepository, adminDataScope, mediaAssetService);
    }

    // ---- 辅助 ----

    private MediaAsset buildAsset(String auditStatus, Long id) {
        MediaAsset asset = new MediaAsset();
        asset.setId(id);
        asset.setUserId(USER_ID);
        asset.setType("image");
        asset.setUrl("/api/v1/media/5/202608/abc.jpg");
        asset.setOriginalName("photo.jpg");
        asset.setMime("image/jpeg");
        asset.setSize(1024L);
        asset.setWidth(600);
        asset.setHeight(400);
        asset.setStatus("ready");
        asset.setAuditStatus(auditStatus);
        asset.setCreatedAt(LocalDateTime.now());
        return asset;
    }

    private Page<MediaAsset> buildPage(List<MediaAsset> items) {
        return new PageImpl<>(items, PageRequest.of(0, 20), items.size());
    }

    // ---- 列表 ----

    @Test
    @DisplayName("列表：pending 筛选（默认值），pending 优先排序委托仓库查询")
    void listMediaAssets_pendingFilter_shouldDelegateSearch() {
        MediaAsset pending = buildAsset("pending", 1L);
        MediaAsset approved = buildAsset("approved", 2L);
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(null);
        when(mediaAssetRepository.searchForAdmin(
                org.mockito.ArgumentMatchers.eq("pending"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(),
                any(Pageable.class)))
                .thenReturn(buildPage(List.of(pending, approved)));
        when(userRepository.findByIdIn(List.of(USER_ID)))
                .thenReturn(List.of(buildUser()));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminMediaAssetSummaryView> view = controller
                    .listMediaAssets("pending", null, null, 1, 20);

            assertEquals(2, view.total());
            assertEquals(2, view.items().size());
            assertEquals(1L, view.items().get(0).id());
            assertEquals("pending", view.items().get(0).auditStatus());
            assertEquals("小鹿", view.items().get(0).userNickname());
            // pending 优先：仓库层已按 CASE WHEN 排序，此处校验视图透传顺序
            verify(mediaAssetRepository).searchForAdmin(
                    org.mockito.ArgumentMatchers.eq("pending"),
                    org.mockito.ArgumentMatchers.isNull(),
                    org.mockito.ArgumentMatchers.isNull(),
                    any(Pageable.class));
        });
    }

    @Test
    @DisplayName("列表：校区管理员强制按管辖校区过滤，忽略传入 campusName")
    void listMediaAssets_campusAdmin_shouldForceOwnCampus() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn("北京大学");
        when(mediaAssetRepository.searchForAdmin(
                org.mockito.ArgumentMatchers.eq("pending"),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("北京大学"),
                any(Pageable.class)))
                .thenReturn(buildPage(List.of(buildAsset("pending", 1L))));

        withUserId(ADMIN_ID, () -> {
            // 传入 other-campus 应被忽略，实际按管辖校区过滤
            AdminPageView<AdminMediaAssetSummaryView> view = controller
                    .listMediaAssets("pending", null, "其他校区", 1, 20);

            assertEquals(1, view.total());
            verify(mediaAssetRepository).searchForAdmin(
                    org.mockito.ArgumentMatchers.eq("pending"),
                    org.mockito.ArgumentMatchers.isNull(),
                    org.mockito.ArgumentMatchers.eq("北京大学"),
                    any(Pageable.class));
        });
    }

    @Test
    @DisplayName("列表：userId 筛选透传")
    void listMediaAssets_userIdFilter_shouldPassThrough() {
        when(adminDataScope.getCurrentAdminCampusName()).thenReturn(null);
        when(mediaAssetRepository.searchForAdmin(
                org.mockito.ArgumentMatchers.eq("pending"),
                org.mockito.ArgumentMatchers.eq(USER_ID),
                org.mockito.ArgumentMatchers.isNull(),
                any(Pageable.class)))
                .thenReturn(buildPage(List.of(buildAsset("pending", 1L))));

        withUserId(ADMIN_ID, () -> {
            AdminPageView<AdminMediaAssetSummaryView> view = controller
                    .listMediaAssets("pending", USER_ID, null, 1, 20);
            assertEquals(1, view.total());
        });
    }

    // ---- 详情 ----

    @Test
    @DisplayName("详情：正常返回完整元信息")
    void getMediaAssetDetail_existing_shouldReturnDetail() {
        MediaAsset asset = buildAsset("rejected", ASSET_ID);
        asset.setAuditRemark("含联系方式，请更换后重传");
        when(mediaAssetRepository.findById(ASSET_ID)).thenReturn(Optional.of(asset));
        when(adminDataScope.resolveUserCampusName(USER_ID)).thenReturn("北京大学");
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<AdminMediaAssetDetailView> resp = controller
                    .getMediaAssetDetail(ASSET_ID);

            assertEquals(200, resp.getStatusCode().value());
            AdminMediaAssetDetailView view = resp.getBody();
            assertNotNull(view);
            assertEquals(ASSET_ID, view.id());
            assertEquals("rejected", view.auditStatus());
            assertEquals("含联系方式，请更换后重传", view.auditRemark());
            assertEquals("北京大学", view.campusName());
        });
    }

    @Test
    @DisplayName("详情：资产不存在返回 404")
    void getMediaAssetDetail_missing_shouldReturn404() {
        when(mediaAssetRepository.findById(999L)).thenReturn(Optional.empty());

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<AdminMediaAssetDetailView> resp = controller
                    .getMediaAssetDetail(999L);
            assertEquals(404, resp.getStatusCode().value());
        });
    }

    // ---- 审核 ----

    @Test
    @DisplayName("审核：通过 → 写回 approved + 审核人 + 审核时间")
    void auditMediaAsset_approved_shouldWriteBack() {
        MediaAsset asset = buildAsset("pending", ASSET_ID);
        when(mediaAssetRepository.findById(ASSET_ID)).thenReturn(Optional.of(asset));
        when(adminDataScope.resolveUserCampusName(USER_ID)).thenReturn("北京大学");
        when(mediaAssetService.updateAudit(ASSET_ID, "approved", null, ADMIN_ID))
                .thenAnswer(inv -> {
                    asset.setAuditStatus("approved");
                    asset.setAuditorId(ADMIN_ID);
                    return Optional.of(asset);
                });

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> resp = controller.auditMediaAsset(
                    ASSET_ID, new AdminMediaAssetAuditRequest("approved", null));

            assertEquals(200, resp.getStatusCode().value());
            assertEquals("approved", resp.getBody().get("auditStatus"));
            verify(mediaAssetService).updateAudit(ASSET_ID, "approved", null, ADMIN_ID);
        });
    }

    @Test
    @DisplayName("审核：拒绝无备注 → 400")
    void auditMediaAsset_rejectedWithoutRemark_shouldReturn400() {
        MediaAsset asset = buildAsset("pending", ASSET_ID);
        when(mediaAssetRepository.findById(ASSET_ID)).thenReturn(Optional.of(asset));
        when(adminDataScope.resolveUserCampusName(USER_ID)).thenReturn("北京大学");

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> resp = controller.auditMediaAsset(
                    ASSET_ID, new AdminMediaAssetAuditRequest("rejected", ""));

            assertEquals(400, resp.getStatusCode().value());
        });
    }

    @Test
    @DisplayName("审核：拒绝带备注 → 写回 rejected + remark")
    void auditMediaAsset_rejectedWithRemark_shouldWriteBack() {
        MediaAsset asset = buildAsset("pending", ASSET_ID);
        when(mediaAssetRepository.findById(ASSET_ID)).thenReturn(Optional.of(asset));
        when(adminDataScope.resolveUserCampusName(USER_ID)).thenReturn("北京大学");
        when(mediaAssetService.updateAudit(ASSET_ID, "rejected", "含联系方式", ADMIN_ID))
                .thenAnswer(inv -> {
                    asset.setAuditStatus("rejected");
                    asset.setAuditRemark("含联系方式");
                    return Optional.of(asset);
                });

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> resp = controller.auditMediaAsset(
                    ASSET_ID, new AdminMediaAssetAuditRequest("rejected", "含联系方式"));

            assertEquals(200, resp.getStatusCode().value());
            assertEquals("rejected", resp.getBody().get("auditStatus"));
            assertEquals("含联系方式", resp.getBody().get("auditRemark"));
        });
    }

    @Test
    @DisplayName("审核：资产不存在返回 404")
    void auditMediaAsset_missing_shouldReturn404() {
        when(mediaAssetRepository.findById(999L)).thenReturn(Optional.empty());

        withUserId(ADMIN_ID, () -> {
            ResponseEntity<Map<String, Object>> resp = controller.auditMediaAsset(
                    999L, new AdminMediaAssetAuditRequest("approved", null));
            assertEquals(404, resp.getStatusCode().value());
        });
    }

    // ---- 校区越权 ----

    @Test
    @DisplayName("审核：校区管理员操作其他校区上传者的资产 → OperationForbiddenException")
    void auditMediaAsset_campusMismatch_shouldThrow403() {
        MediaAsset asset = buildAsset("pending", ASSET_ID);
        when(mediaAssetRepository.findById(ASSET_ID)).thenReturn(Optional.of(asset));
        when(adminDataScope.resolveUserCampusName(USER_ID)).thenReturn("清华大学");
        org.mockito.Mockito.doThrow(new OperationForbiddenException("CAMPUS_ADMIN_SCOPE_FORBIDDEN"))
                .when(adminDataScope).assertCampusAccess(anyString());

        withUserId(ADMIN_ID, () -> {
            assertThrows(OperationForbiddenException.class, () -> controller
                    .auditMediaAsset(ASSET_ID, new AdminMediaAssetAuditRequest("approved", null)));
        });
    }

    // ---- 辅助 ----

    private User buildUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setNickname("小鹿");
        user.setAvatarUrl("/static/assets/images/avatars/avatar-1.jpg");
        return user;
    }
}
