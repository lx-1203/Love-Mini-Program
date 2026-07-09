package com.campuslove.api.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * UserBasicProfile 实体单元测试（Phase A - Task B4）。
 *
 * <p>覆盖 Phase A 新增字段的 getter/setter：
 * <ul>
 *   <li>height、educationLevel、relationshipStatus</li>
 *   <li>hometownProvince、hometownCity、futureCity</li>
 *   <li>futurePlanTags、photoGallery（JSON 数组字段）</li>
 *   <li>halfBodyPhotoUrl、personalVideoUrl、profileBackgroundUrl</li>
 * </ul>
 * </p>
 *
 * <p>验证策略：每个字段独立 setter 后立即 getter，断言值一致；
 * 默认值（'[]'）在新建实例时也应被断言。</p>
 */
class UserBasicProfileTest {

    private UserBasicProfile profile;

    @BeforeEach
    void setUp() {
        profile = new UserBasicProfile();
    }

    /**
     * 验证 height 字段的 getter/setter 与范围边界。
     */
    @Test
    void height_getterSetter_shouldWork() {
        assertNull(profile.getHeight(), "新建实例 height 应为 null");
        profile.setHeight(175);
        assertEquals(175, profile.getHeight());
        // 边界值校验
        profile.setHeight(120);
        assertEquals(120, profile.getHeight(), "身高下限 120 应可设置");
        profile.setHeight(250);
        assertEquals(250, profile.getHeight(), "身高上限 250 应可设置");
        // 可置空
        profile.setHeight(null);
        assertNull(profile.getHeight());
    }

    /**
     * 验证 educationLevel 字段的 getter/setter。
     */
    @Test
    void educationLevel_getterSetter_shouldWork() {
        assertNull(profile.getEducationLevel());
        profile.setEducationLevel("bachelor");
        assertEquals("bachelor", profile.getEducationLevel());
        profile.setEducationLevel("phd");
        assertEquals("phd", profile.getEducationLevel());
        profile.setEducationLevel("high_school");
        assertEquals("high_school", profile.getEducationLevel());
        profile.setEducationLevel("master");
        assertEquals("master", profile.getEducationLevel());
    }

    /**
     * 验证 relationshipStatus 字段的 getter/setter。
     */
    @Test
    void relationshipStatus_getterSetter_shouldWork() {
        assertNull(profile.getRelationshipStatus());
        profile.setRelationshipStatus("never");
        assertEquals("never", profile.getRelationshipStatus());
        profile.setRelationshipStatus("married_before");
        assertEquals("married_before", profile.getRelationshipStatus());
        profile.setRelationshipStatus("divorced");
        assertEquals("divorced", profile.getRelationshipStatus());
        profile.setRelationshipStatus("widowed");
        assertEquals("widowed", profile.getRelationshipStatus());
    }

    /**
     * 验证 hometownProvince / hometownCity 字段的 getter/setter。
     */
    @Test
    void hometown_fields_getterSetter_shouldWork() {
        assertNull(profile.getHometownProvince());
        assertNull(profile.getHometownCity());

        profile.setHometownProvince("广东省");
        profile.setHometownCity("广州市");
        assertEquals("广东省", profile.getHometownProvince());
        assertEquals("广州市", profile.getHometownCity());

        // 跨省级联边界（直辖市）
        profile.setHometownProvince("北京市");
        profile.setHometownCity("北京市");
        assertEquals("北京市", profile.getHometownProvince());
        assertEquals("北京市", profile.getHometownCity());
    }

    /**
     * 验证 futureCity 字段的 getter/setter。
     */
    @Test
    void futureCity_getterSetter_shouldWork() {
        assertNull(profile.getFutureCity());
        profile.setFutureCity("深圳市");
        assertEquals("深圳市", profile.getFutureCity());
        profile.setFutureCity("上海市");
        assertEquals("上海市", profile.getFutureCity());
    }

    /**
     * 验证 futurePlanTags 字段（JSON 数组字符串）的 getter/setter。
     */
    @Test
    void futurePlanTags_getterSetter_shouldWork() {
        // 默认值校验
        assertEquals("[]", profile.getFuturePlanTags(),
                "新建实例 futurePlanTags 默认应为 '[]'");

        // 设置 JSON 数组
        String tags = "[\"买房\",\"养猫\",\"创业\"]";
        profile.setFuturePlanTags(tags);
        assertEquals(tags, profile.getFuturePlanTags());

        // 覆盖已有值
        profile.setFuturePlanTags("[\"旅行\"]");
        assertEquals("[\"旅行\"]", profile.getFuturePlanTags());
    }

    /**
     * 验证 photoGallery 字段（JSON 数组字符串）的 getter/setter。
     */
    @Test
    void photoGallery_getterSetter_shouldWork() {
        // 默认值校验
        assertEquals("[]", profile.getPhotoGallery(),
                "新建实例 photoGallery 默认应为 '[]'");

        // 设置照片墙 URL 数组
        String gallery = "[\"/uploads/1/a.jpg\",\"/uploads/1/b.jpg\"]";
        profile.setPhotoGallery(gallery);
        assertEquals(gallery, profile.getPhotoGallery());

        // 清空回 '[]'
        profile.setPhotoGallery("[]");
        assertEquals("[]", profile.getPhotoGallery());
    }

    /**
     * 验证 halfBodyPhotoUrl 字段的 getter/setter。
     */
    @Test
    void halfBodyPhotoUrl_getterSetter_shouldWork() {
        assertNull(profile.getHalfBodyPhotoUrl());
        String url = "/uploads/1/202607/uuid.jpg";
        profile.setHalfBodyPhotoUrl(url);
        assertEquals(url, profile.getHalfBodyPhotoUrl());
    }

    /**
     * 验证 personalVideoUrl 字段的 getter/setter。
     */
    @Test
    void personalVideoUrl_getterSetter_shouldWork() {
        assertNull(profile.getPersonalVideoUrl());
        String url = "/uploads/1/202607/intro.mp4";
        profile.setPersonalVideoUrl(url);
        assertEquals(url, profile.getPersonalVideoUrl());
    }

    /**
     * 验证 profileBackgroundUrl 字段的 getter/setter。
     */
    @Test
    void profileBackgroundUrl_getterSetter_shouldWork() {
        assertNull(profile.getProfileBackgroundUrl());
        String url = "/uploads/1/202607/bg.jpg";
        profile.setProfileBackgroundUrl(url);
        assertEquals(url, profile.getProfileBackgroundUrl());
    }

    /**
     * 验证既有字段（向后兼容）的 getter/setter 仍正常。
     */
    @Test
    void legacyFields_getterSetter_shouldStillWork() {
        profile.setId(99L);
        assertEquals(99L, profile.getId());

        profile.setUserId(1001L);
        assertEquals(1001L, profile.getUserId());

        profile.setNickname("小明");
        assertEquals("小明", profile.getNickname());

        profile.setBio("热爱生活");
        assertEquals("热爱生活", profile.getBio());

        profile.setGradeLabel("大三");
        assertEquals("大三", profile.getGradeLabel());

        profile.setPronouns("他");
        assertEquals("他", profile.getPronouns());

        profile.setInterestTags("[\"摄影\"]");
        assertEquals("[\"摄影\"]", profile.getInterestTags());

        LocalDateTime now = LocalDateTime.now();
        profile.setCreatedAt(now);
        profile.setUpdatedAt(now);
        assertEquals(now, profile.getCreatedAt());
        assertEquals(now, profile.getUpdatedAt());
    }

    /**
     * 验证一次性设置全部新字段后，所有 getter 返回值一致。
     * 用于检测字段间无串扰（如复制粘贴错误）。
     */
    @Test
    void allNewFields_setTogether_shouldAllReadBackCorrectly() {
        profile.setHeight(178);
        profile.setEducationLevel("master");
        profile.setRelationshipStatus("never");
        profile.setHometownProvince("浙江省");
        profile.setHometownCity("杭州市");
        profile.setFutureCity("杭州市");
        profile.setFuturePlanTags("[\"旅行\",\"读书\"]");
        profile.setPhotoGallery("[\"/uploads/1/a.jpg\"]");
        profile.setHalfBodyPhotoUrl("/uploads/1/half.jpg");
        profile.setPersonalVideoUrl("/uploads/1/intro.mp4");
        profile.setProfileBackgroundUrl("/uploads/1/bg.jpg");

        assertEquals(178, profile.getHeight());
        assertEquals("master", profile.getEducationLevel());
        assertEquals("never", profile.getRelationshipStatus());
        assertEquals("浙江省", profile.getHometownProvince());
        assertEquals("杭州市", profile.getHometownCity());
        assertEquals("杭州市", profile.getFutureCity());
        assertEquals("[\"旅行\",\"读书\"]", profile.getFuturePlanTags());
        assertEquals("[\"/uploads/1/a.jpg\"]", profile.getPhotoGallery());
        assertEquals("/uploads/1/half.jpg", profile.getHalfBodyPhotoUrl());
        assertEquals("/uploads/1/intro.mp4", profile.getPersonalVideoUrl());
        assertEquals("/uploads/1/bg.jpg", profile.getProfileBackgroundUrl());
    }
}
