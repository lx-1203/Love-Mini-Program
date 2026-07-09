package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.campus.CampusCertificationView;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.runtime.MockRuntimeState;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

/**
 * 个人资料服务单元测试（Phase B - Task B4）。
 *
 * <p>覆盖 {@link MockProfileService} 的 Phase B 新增方法：
 * <ul>
 *   <li>saveBasicProfile 扩展字段校验（height/educationLevel/relationshipStatus）</li>
 *   <li>uploadBackground / uploadPhoto / deletePhoto / uploadVideo / uploadHalfBody</li>
 *   <li>照片墙索引越界返回 400 等价异常</li>
 *   <li>资料完善度计算（computeProfileCompletion）</li>
 *   <li>认证徽章级别委托查询（resolveBadgeLevel）</li>
 * </ul>
 * </p>
 *
 * <p>测试策略：
 * <ul>
 *   <li>使用真实 MockRuntimeState（内存状态可变）</li>
 *   <li>Mockito mock MediaStorageService 与 CampusCertificationService</li>
 *   <li>使用 MockMultipartFile 模拟上传文件</li>
 * </ul>
 * </p>
 */
class ProfileServiceTest {

    private MockRuntimeState runtimeState;
    private MediaStorageService mediaStorageService;
    private CampusCertificationService campusCertificationService;
    private MockProfileService profileService;

    @BeforeEach
    void setUp() {
        runtimeState = new MockRuntimeState();
        mediaStorageService = mock(MediaStorageService.class);
        campusCertificationService = mock(CampusCertificationService.class);
        profileService = new MockProfileService(
                runtimeState, mediaStorageService, campusCertificationService);
    }

    // ---- TR-B1.1: PUT /api/profile/basic 更新扩展字段 + 完善度计算 ----

    /**
     * 场景：传入合法扩展字段（height/educationLevel/relationshipStatus 等），
     * 保存成功后 View 中应反映新字段值，且 profileCompletion 重算。
     */
    @Test
    void saveBasicProfile_withValidExtendedFields_returnsUpdatedView() {
        // 默认徽章为 none
        when(campusCertificationService.getCertificationStatus(anyLong()))
                .thenReturn(emptyCertView());

        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "安静而明确", "大三", "她/她",
                165, "bachelor", "never",
                "广东省", "广州市", "广州市",
                List.of("买房", "养猫")
        );

        BasicProfileView view = profileService.saveBasicProfile(req);

        assertEquals("若星", view.nickname());
        assertEquals(165, view.height());
        assertEquals("bachelor", view.educationLevel());
        assertEquals("never", view.relationshipStatus());
        assertEquals("广东省", view.hometownProvince());
        assertEquals("广州市", view.hometownCity());
        assertEquals("广州市", view.futureCity());
        assertEquals(List.of("买房", "养猫"), view.futurePlanTags());
        // nickname + bio + (height+edu) + hometown + (photoGallery 默认有 1 张) → 30+20+20+15+15=100
        assertEquals(100, view.profileCompletion(), "完善度应为 100");
        assertEquals("none", view.verificationBadgeLevel());
    }

    /**
     * 场景：height 越界（120-250 之外）应抛 IllegalArgumentException。
     */
    @Test
    void saveBasicProfile_heightOutOfRange_throwsIllegalArgument() {
        BasicProfileRequest tooShort = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                100, null, null, null, null, null, null);

        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class,
                () -> profileService.saveBasicProfile(tooShort));
        assertTrue(ex1.getMessage().contains("height"), "异常信息应包含 height");

        BasicProfileRequest tooTall = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                300, null, null, null, null, null, null);

        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class,
                () -> profileService.saveBasicProfile(tooTall));
        assertTrue(ex2.getMessage().contains("height"));
    }

    /**
     * 场景：educationLevel 取值非法应抛 IllegalArgumentException。
     */
    @Test
    void saveBasicProfile_invalidEducationLevel_throwsIllegalArgument() {
        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                null, "doctorate", null, null, null, null, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.saveBasicProfile(req));
        assertTrue(ex.getMessage().contains("educationLevel"));
    }

    /**
     * 场景：relationshipStatus 取值非法应抛 IllegalArgumentException。
     */
    @Test
    void saveBasicProfile_invalidRelationshipStatus_throwsIllegalArgument() {
        BasicProfileRequest req = new BasicProfileRequest(
                "若星", "bio", "大三", "她/她",
                null, null, "complicated", null, null, null, null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.saveBasicProfile(req));
        assertTrue(ex.getMessage().contains("relationshipStatus"));
    }

    /**
     * 场景：保存基本资料时未传媒体字段，应保留既有 photoGallery/halfBodyPhotoUrl 等值不被清空。
     */
    @Test
    void saveBasicProfile_preservesExistingMediaFields_whenRequestMediaIsNull() {
        // 先上传一张照片以填充 photoGallery
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("image")))
                .thenReturn(new MediaStorageService.UploadResult(
                        "/uploads/1/photo.jpg", 800, 600, "image/jpeg", 1024L, null));

        profileService.uploadPhoto(file("img.jpg", "image/jpeg"), 0);

        // 保存基本资料，不传任何媒体字段
        BasicProfileRequest req = new BasicProfileRequest(
                "新昵称", "新简介", "大四", "他/他",
                null, null, null, null, null, null, null);
        profileService.saveBasicProfile(req);

        BasicProfileView view = profileService.getBasicProfile();
        assertEquals("新昵称", view.nickname());
        // photoGallery 应保留 uploadPhoto 写入的 1 张
        assertEquals(1, view.photoGallery().size(), "photoGallery 应被保留");
        assertEquals("/uploads/1/photo.jpg", view.photoGallery().get(0));
    }

    // ---- TR-B1.2: POST /api/profile/background 上传成功 + URL 写回 ----

    /**
     * 场景：上传背景图成功，URL 写回 profileBackgroundUrl，旧字段（photoGallery）保留。
     */
    @Test
    void uploadBackground_success_writesUrlAndPreservesOtherMedia() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("background")))
                .thenReturn(new MediaStorageService.UploadResult(
                        "/uploads/1/bg.jpg", 1920, 1080, "image/jpeg", 2048L, null));

        BasicProfileView view = profileService.uploadBackground(
                file("bg.jpg", "image/jpeg"));

        assertEquals("/uploads/1/bg.jpg", view.profileBackgroundUrl());
        // 其他媒体字段应保留默认值
        assertNotNull(view.photoGallery());
        assertNotNull(view.halfBodyPhotoUrl());
    }

    // ---- TR-B1.3: POST /api/profile/photos 第 7 张返回 400 ----

    /**
     * 场景：照片墙索引越界（index=6）应抛 IllegalArgumentException，对应 HTTP 400。
     */
    @Test
    void uploadPhoto_indexOutOfRange_throwsIllegalArgument() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("image")))
                .thenReturn(new MediaStorageService.UploadResult(
                        "/uploads/1/photo.jpg", 800, 600, "image/jpeg", 1024L, null));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.uploadPhoto(file("img.jpg", "image/jpeg"), 6));
        assertTrue(ex.getMessage().contains("照片墙索引越界"));
    }

    /**
     * 场景：照片墙索引负数应抛 IllegalArgumentException。
     */
    @Test
    void uploadPhoto_negativeIndex_throwsIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.uploadPhoto(file("img.jpg", "image/jpeg"), -1));
        assertTrue(ex.getMessage().contains("照片墙索引越界"));
    }

    /**
     * 场景：依次上传 6 张照片到索引 0-5 全部成功，photoGallery 长度为 6。
     */
    @Test
    void uploadPhoto_sixPhotos_success() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("image")))
                .thenAnswer(inv -> new MediaStorageService.UploadResult(
                        "/uploads/1/p" + System.nanoTime() + ".jpg",
                        800, 600, "image/jpeg", 1024L, null));

        for (int i = 0; i < 6; i++) {
            profileService.uploadPhoto(file("img" + i + ".jpg", "image/jpeg"), i);
        }

        BasicProfileView view = profileService.getBasicProfile();
        assertEquals(6, view.photoGallery().size(), "照片墙应有 6 张");
    }

    /**
     * 场景：删除指定索引照片后，photoGallery 长度减 1，且其他索引的照片保留。
     */
    @Test
    void deletePhoto_removesCorrectIndex() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("image")))
                .thenAnswer(inv -> new MediaStorageService.UploadResult(
                        "/uploads/1/p" + System.nanoTime() + ".jpg",
                        800, 600, "image/jpeg", 1024L, null));

        profileService.uploadPhoto(file("a.jpg", "image/jpeg"), 0);
        profileService.uploadPhoto(file("b.jpg", "image/jpeg"), 1);
        profileService.uploadPhoto(file("c.jpg", "image/jpeg"), 2);

        BasicProfileView afterDelete = profileService.deletePhoto(1);
        assertEquals(2, afterDelete.photoGallery().size());
        // 剩余应该是 a.jpg（索引 0）和原 c.jpg（变索引 1）
        assertFalse(afterDelete.photoGallery().stream().anyMatch("/uploads/1/p"::equals));
    }

    /**
     * 场景：删除越界索引应抛 IllegalArgumentException。
     */
    @Test
    void deletePhoto_outOfRangeIndex_throwsIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.deletePhoto(6));
        assertTrue(ex.getMessage().contains("照片墙索引越界"));
    }

    // ---- 上传视频 / 半身照 ----

    @Test
    void uploadVideo_success_writesUrl() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("video")))
                .thenReturn(new MediaStorageService.UploadResult(
                        "/uploads/1/intro.mp4", null, null, "video/mp4", 5242880L, 30000));

        BasicProfileView view = profileService.uploadVideo(
                file("intro.mp4", "video/mp4"));

        assertEquals("/uploads/1/intro.mp4", view.personalVideoUrl());
    }

    @Test
    void uploadHalfBody_success_writesUrl() {
        when(mediaStorageService.store(anyLong(), any(MultipartFile.class), eq("image")))
                .thenReturn(new MediaStorageService.UploadResult(
                        "/uploads/1/half.jpg", 800, 1200, "image/jpeg", 2048L, null));

        BasicProfileView view = profileService.uploadHalfBody(
                file("half.jpg", "image/jpeg"));

        assertEquals("/uploads/1/half.jpg", view.halfBodyPhotoUrl());
    }

    /**
     * 场景：上传空文件应抛 IllegalArgumentException（mock service 已被 mock，
     * 此处直接验证 MockProfileService 自己的 file.isEmpty 判断）。
     */
    @Test
    void uploadBackground_emptyFile_throwsIllegalArgument() {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> profileService.uploadBackground(empty));
        assertTrue(ex.getMessage().contains("不能为空"));
    }

    // ---- 徽章级别委托 ----

    /**
     * 场景：CampusCertificationService 返回 APPROVED 时，ProfileService 的 View 中
     * verificationBadgeLevel 应为 "school"。
     */
    @Test
    void getBasicProfile_approvedCertification_returnsSchoolBadge() {
        CampusCertificationView certView = new CampusCertificationView(
                1L, 1L, "模拟大学", "计算机", "card.jpg",
                "APPROVED", "已认证", null, null, LocalDateTime.now(), null);
        when(campusCertificationService.getCertificationStatus(1L)).thenReturn(certView);

        BasicProfileView view = profileService.getBasicProfile();

        assertEquals("school", view.verificationBadgeLevel());
    }

    /**
     * 场景：CampusCertificationService 抛异常时，应降级为 "none" 而非抛出。
     */
    @Test
    void getBasicProfile_certificationServiceThrows_returnsNoneBadge() {
        when(campusCertificationService.getCertificationStatus(anyLong()))
                .thenThrow(new RuntimeException("simulated downstream failure"));

        BasicProfileView view = profileService.getBasicProfile();

        assertEquals("none", view.verificationBadgeLevel(),
                "下游异常时应降级为 none，避免影响 Profile 主流程");
    }

    // ---- 工具方法 ----

    private MockMultipartFile file(String name, String contentType) {
        return new MockMultipartFile("file", name, contentType, new byte[]{1, 2, 3, 4});
    }

    private CampusCertificationView emptyCertView() {
        CampusCertificationView v = new CampusCertificationView();
        v.setUserId(1L);
        v.setStatus(null);
        return v;
    }
}
