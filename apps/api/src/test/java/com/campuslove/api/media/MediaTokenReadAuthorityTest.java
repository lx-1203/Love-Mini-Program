package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;

/**
 * P0-2 媒体令牌降权：媒体侧读写语义。
 *
 * <p>降权不是「把媒体接口关掉」：媒体令牌仍要能取到图片（否则小程序 {@code <image src>} 直接黑屏），
 * 但媒体令牌也绝不能：</p>
 * <ul>
 *   <li>换取新的媒体令牌（自我续期 = 变相长会话）；</li>
 *   <li>借 {@code ROLE_MEDIA} 获得任何一档越权读（他人语音/视频、实名认证材料）。</li>
 * </ul>
 *
 * <p>本测试同时钉住两条边界，并配完整会话正控：
 * 「读得到」与「读不到不该读的」必须同时成立，任何一侧写宽/写窄都会被抓住。</p>
 */
class MediaTokenReadAuthorityTest {

    private static final Long OWNER_USER_ID = 100L;
    private static final Long OTHER_USER_ID = 200L;
    private static final Long ADMIN_USER_ID = 300L;
    private static final String MONTH_SEGMENT = "202607";
    private static final String FILE_NAME = "test-avatar.jpg";
    private static final String VALID_SUBPATH = MONTH_SEGMENT + "/" + FILE_NAME;
    /** 内容档高敏感样本：他人语音 */
    private static final String VOICE_SUBPATH = "voice/" + MONTH_SEGMENT + "/a.m4a";
    /** 认证档样本：实名认证材料 */
    private static final String VERIFICATION_SUBPATH = "verification/" + MONTH_SEGMENT + "/id.jpg";

    private Path tempRoot;
    private MediaAccessService mediaAccessService;

    @BeforeEach
    void setUp() throws IOException {
        tempRoot = Files.createTempDirectory("media-token-read-authority-test");
        mediaAccessService = new MediaAccessService(tempRoot.toString());

        Path ownerDir = tempRoot.resolve(OWNER_USER_ID.toString()).resolve(MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Files.writeString(ownerDir.resolve(FILE_NAME), "test-image-content");
        // 高敏感样本：他人语音、实名认证材料
        Path voiceDir = tempRoot.resolve(OWNER_USER_ID.toString()).resolve("voice").resolve(MONTH_SEGMENT);
        Files.createDirectories(voiceDir);
        Files.writeString(voiceDir.resolve("a.m4a"), "voice");
        Path idCardDir = tempRoot.resolve(OWNER_USER_ID.toString())
                .resolve("verification").resolve(MONTH_SEGMENT);
        Files.createDirectories(idCardDir);
        Files.writeString(idCardDir.resolve("id.jpg"), "idcard");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (Files.exists(tempRoot)) {
            try {
                Files.walk(tempRoot)
                        .sorted((a, b) -> b.compareTo(a))
                        .forEach(p -> {
                            try {
                                Files.deleteIfExists(p);
                            } catch (IOException ignored) {
                                // 测试清理忽略删除失败
                            }
                        });
            } catch (IOException ignored) {
                // 同上
            }
        }
    }

    // ========================================================================
    // 一、媒体令牌自我续期必须被拒（控制器层第二道防线）
    // ========================================================================

    @Test
    @DisplayName("媒体会话调用 /api/v1/media/token → 拒绝签发（不得自我续期）")
    void issueMediaToken_withMediaOnlySession_isDenied() {
        MediaAccessController controller = new MediaAccessController(
                mediaAccessService, newProvider());
        SecurityContextHolder.getContext().setAuthentication(
                authentication(OWNER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA)));

        assertThrows(AccessDeniedException.class, controller::issueMediaToken,
                "媒体令牌不得再换一枚媒体令牌（变相延长生命期）");
    }

    @Test
    @DisplayName("正控：完整用户会话调用 /api/v1/media/token → 正常签出 scope=media 短期令牌")
    void issueMediaToken_withFullSession_issuesMediaToken() {
        com.campuslove.api.config.JwtTokenProvider provider = newProvider();
        MediaAccessController controller = new MediaAccessController(mediaAccessService, provider);
        SecurityContextHolder.getContext().setAuthentication(
                authentication(OWNER_USER_ID, List.of("ROLE_USER")));

        MediaAccessController.MediaTokenView view = controller.issueMediaToken();

        assertNotNull(view, "完整会话应能签发媒体令牌");
        assertTrue(provider.isMediaToken(view.token()), "签出的必须是 scope=media 降权令牌");
        assertTrue(view.expiresInSeconds() > 0, "有效期应为正数（短期令牌）");
    }

    // ========================================================================
    // 二、媒体会话的读取范围：能读该读的，读不到不该读的
    // ========================================================================

    @Test
    @DisplayName("媒体会话读自己的图片 → 放行（本人短路，principal 仍可用）")
    void mediaSession_readsOwnImage_isAllowed() {
        Authentication authentication = authentication(OWNER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA));

        MediaAccessService.MediaFile file =
                mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

        assertNotNull(file, "媒体令牌必须能读自己的图片，否则小程序图片直接黑屏");
        assertTrue(file.getResource().exists());
    }

    @Test
    @DisplayName("媒体会话读他人公开图片（内容档 IMAGE）→ 放行，与改造前一致")
    void mediaSession_readsOtherUserPublicImage_isAllowed() {
        Authentication authentication = authentication(OTHER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA));

        MediaAccessService.MediaFile file =
                mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

        assertNotNull(file, "内容档公开图片对已登录主体可读的既有契约不应被降权破坏");
    }

    @Test
    @DisplayName("媒体会话读他人语音 → 403（不因『已认证』放开内容档管理级读取）")
    void mediaSession_readsOtherUserVoice_isDenied() {
        Authentication authentication = authentication(OTHER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA));

        assertThrows(AccessDeniedException.class,
                () -> mediaAccessService.loadMedia(
                        OWNER_USER_ID, VOICE_SUBPATH, authentication),
                "他人语音需要 ADMIN/SUPER_ADMIN/AUDITOR 的完整会话，媒体令牌不具备");
    }

    @Test
    @DisplayName("媒体会话读他人实名认证材料 → 403（认证档仅 SUPER_ADMIN）")
    void mediaSession_readsOtherUserIdCard_isDenied() {
        Authentication authentication = authentication(OTHER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA));

        assertThrows(AccessDeniedException.class,
                () -> mediaAccessService.loadMedia(
                        OWNER_USER_ID, VERIFICATION_SUBPATH, authentication));
    }

    @Test
    @DisplayName("属主本身是管理员时，其媒体令牌也读不到他人语音（降权按令牌不按账号）")
    void adminOwnedMediaSession_readsOtherUserVoice_isDenied() {
        Authentication authentication = authentication(ADMIN_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA));

        assertThrows(AccessDeniedException.class,
                () -> mediaAccessService.loadMedia(
                        OWNER_USER_ID, VOICE_SUBPATH, authentication),
                "媒体令牌不得借属主的账号角色升档");
    }

    @Test
    @DisplayName("正控：管理员完整会话读他人语音 → 放行（既有管理能力未被降权规则破坏）")
    void adminFullSession_readsOtherUserVoice_isAllowed() {
        Authentication authentication = authentication(ADMIN_USER_ID, List.of("ROLE_USER", "ROLE_ADMIN"));

        MediaAccessService.MediaFile file = mediaAccessService.loadMedia(
                OWNER_USER_ID, VOICE_SUBPATH, authentication);

        assertNotNull(file, "管理员完整会话读内容档语音的既有能力应保持");
    }

    @Test
    @DisplayName("正控：普通用户完整会话读自己的语音 → 放行")
    void userFullSession_readsOwnVoice_isAllowed() {
        Authentication authentication = authentication(OWNER_USER_ID, List.of("ROLE_USER"));

        MediaAccessService.MediaFile file = mediaAccessService.loadMedia(
                OWNER_USER_ID, VOICE_SUBPATH, authentication);

        assertNotNull(file, "本人短路不受本次改动影响");
    }

    /* ========== 辅助方法 ========== */

    private com.campuslove.api.config.JwtTokenProvider newProvider() {
        com.campuslove.api.config.JwtConfig config = new com.campuslove.api.config.JwtConfig();
        config.setSecret("test-jwt-secret-for-media-token-read-authority-32-chars-min");
        config.setExpirationMs(7_200_000L);
        config.setKeyVersion(1);
        return new com.campuslove.api.config.JwtTokenProvider(config);
    }

    private Authentication authentication(Long userId, List<String> roles) {
        List<SimpleGrantedAuthority> authorities = roles.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        PreAuthenticatedAuthenticationToken authentication =
                new PreAuthenticatedAuthenticationToken(userId, "credentials", authorities);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
