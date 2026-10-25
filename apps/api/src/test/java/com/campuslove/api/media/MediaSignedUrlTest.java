package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
 * P0-2 收口最后一寸：能力型媒体 URL 的「签发即授权」语义。
 *
 * <p>签名 URL 把「能不能读」提前到了签发那一刻，所以签发端点本身必须走与
 * {@code GET /api/v1/media/{userId}/**} 完全同一套归属/档位判定。否则攻击者只要
 * 调一次 {@code POST /media/sign} 就能拿到他人实名认证材料的可读 URL——
 * 那等于把上一轮辛苦收紧的媒体分级读取重新打开。</p>
 *
 * <p>本测试钉三件事：读得到的照常能签、不该读的**一个字节都不签**、
 * 以及签名 URL 的形态与拒绝路径不泄露存在性。</p>
 */
class MediaSignedUrlTest {

    private static final Long OWNER_USER_ID = 100L;
    private static final Long OTHER_USER_ID = 200L;
    private static final String MONTH_SEGMENT = "202607";
    private static final String AVATAR_SUBPATH = MONTH_SEGMENT + "/test-avatar.jpg";
    private static final String VOICE_SUBPATH = "voice/" + MONTH_SEGMENT + "/a.m4a";
    private static final String ID_CARD_SUBPATH = "verification/" + MONTH_SEGMENT + "/id.jpg";

    private static final String TEST_SECRET = "signed-url-test-secret-at-least-32-chars-long";

    private Path tempRoot;
    private MediaAccessService mediaAccessService;
    private MediaUrlSigner signer;
    private MediaAccessController controller;

    @BeforeEach
    void setUp() throws IOException {
        tempRoot = Files.createTempDirectory("media-signed-url-test");
        mediaAccessService = new MediaAccessService(tempRoot.toString());
        signer = new MediaUrlSigner("", TEST_SECRET);
        controller = new MediaAccessController(mediaAccessService, null, signer);

        Files.createDirectories(tempRoot.resolve(OWNER_USER_ID.toString()).resolve(MONTH_SEGMENT));
        Files.writeString(
                tempRoot.resolve(OWNER_USER_ID.toString()).resolve(MONTH_SEGMENT).resolve("test-avatar.jpg"),
                "image");
        Files.createDirectories(tempRoot.resolve(OWNER_USER_ID.toString()).resolve("voice").resolve(MONTH_SEGMENT));
        Files.writeString(
                tempRoot.resolve(OWNER_USER_ID.toString()).resolve("voice").resolve(MONTH_SEGMENT).resolve("a.m4a"),
                "voice");
        Files.createDirectories(tempRoot.resolve(OWNER_USER_ID.toString())
                .resolve("verification").resolve(MONTH_SEGMENT));
        Files.writeString(
                tempRoot.resolve(OWNER_USER_ID.toString()).resolve("verification").resolve(MONTH_SEGMENT).resolve("id.jpg"),
                "idcard");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ========================================================================
    // 一、可读的路径必须签得出来
    // ========================================================================

    @Test
    @DisplayName("本人给自己的头像签发 → 返回带 exp/sig 的可用 URL")
    void sign_ownAvatar_succeeds() {
        authenticateAs(OWNER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, AVATAR_SUBPATH))));

        assertEquals(1, view.items().size(), "本人可读路径必须签出来");
        MediaAccessController.MediaSignView.SignedPath item = view.items().get(0);
        assertEquals(mediaPath(OWNER_USER_ID, AVATAR_SUBPATH), item.path());
        assertTrue(item.url().startsWith(item.path() + "?exp="), "URL 形态应为 路径?exp=…&sig=…：" + item.url());
        assertTrue(item.url().contains("&sig="), "URL 必须带签名参数");
        assertTrue(item.expiresAt() > java.time.Instant.now().getEpochSecond(), "过期时刻必须在未来");
        // 签完立刻可校验：签发与校验必须同源，否则「签得出但验不过」会在真机上表现为全黑图
        String signature = item.url().substring(item.url().indexOf("&sig=") + 5);
        assertTrue(signer.verify(item.path(), item.expiresAt(), signature), "刚签发的签名必须当场校验通过");
    }

    @Test
    @DisplayName("登录用户对他人内容档图片可签（与 GET 的公开读口径一致，不额外收紧）")
    void sign_otherUserPublicImage_succeeds() {
        authenticateAs(OTHER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, AVATAR_SUBPATH))));

        assertEquals(1, view.items().size(), "IMAGE 内容档对登录用户公开读，签发不得比 GET 更严");
    }

    // ========================================================================
    // 二、不该读的一条都不签（这是本端点的安全下限）
    // ========================================================================

    @Test
    @DisplayName("他人实名认证材料不得签发，且响应不泄露该路径是否存在")
    void sign_otherUserIdCard_isNotSigned() {
        authenticateAs(OTHER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, ID_CARD_SUBPATH))));

        assertTrue(view.items().isEmpty(), "认证档材料对非本人不得签发，实际：" + view.items());
        // 无 denied 字段：拒绝以「省略」表达，避免本端点沦为「这条路径存在吗」的探测预言机
        assertEquals(0, countDeniedFields(view), "响应不得携带逐条拒绝原因");
    }

    @Test
    @DisplayName("他人语音/视频（内容档但非公开读）不得签发")
    void sign_otherUserVoice_isNotSigned() {
        authenticateAs(OTHER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, VOICE_SUBPATH))));

        assertTrue(view.items().isEmpty(), "语音对非本人不得签发");
    }

    @Test
    @DisplayName("本人签自己的认证材料 → 允许（不得把正常读取打断）")
    void sign_ownIdCard_succeeds() {
        authenticateAs(OWNER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, ID_CARD_SUBPATH))));

        assertEquals(1, view.items().size(), "本人对自己的材料必须可签，否则真机会黑图");
    }

    // ========================================================================
    // 三、会话形态与路径形态的拒绝
    // ========================================================================

    @Test
    @DisplayName("媒体作用域令牌不得调用签发端点（否则短期凭据可自我扩权成一批可读 URL）")
    void sign_withMediaOnlySession_denied() {
        SecurityContextHolder.getContext().setAuthentication(
                authentication(OWNER_USER_ID, List.of(MediaTokenPolicy.ROLE_MEDIA)));

        assertThrows(AccessDeniedException.class, () -> controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, AVATAR_SUBPATH)))));
    }

    @Test
    @DisplayName("未认证调用签发端点 → 拒绝")
    void sign_withoutAuthentication_denied() {
        SecurityContextHolder.clearContext();

        assertThrows(AccessDeniedException.class, () -> controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(mediaPath(OWNER_USER_ID, AVATAR_SUBPATH)))));
    }

    @Test
    @DisplayName("非媒体读取形态的路径一律不签：公开资产、穿越、越界前缀")
    void sign_nonMediaPaths_areSkipped() {
        authenticateAs(OWNER_USER_ID, List.of("ROLE_USER"));

        MediaAccessController.MediaSignView view = controller.signMediaUrls(
                new MediaAccessController.MediaSignRequest(List.of(
                        "/api/v1/media/app-assets/generated/a.png",   // 本就 permitAll，无需签名
                        "/api/v1/media/" + OWNER_USER_ID + "/../../etc/passwd",
                        "/api/v1/media/not-a-user-id/x.jpg",
                        "/api/v1/users/1/avatar",
                        "")));

        assertTrue(view.items().isEmpty(), "以上形态都不该被签：" + view.items());
    }

    @Test
    @DisplayName("空请求体与 null 路径不炸（返回空集）")
    void sign_nullInput_returnsEmpty() {
        authenticateAs(OWNER_USER_ID, List.of("ROLE_USER"));

        assertTrue(controller.signMediaUrls(new MediaAccessController.MediaSignRequest(null)).items().isEmpty());
        assertTrue(controller.signMediaUrls(null).items().isEmpty());
    }

    // ========================================================================
    // 四、签名器自身：篡改、过期、错密钥
    // ========================================================================

    @Test
    @DisplayName("签名逐字绑定路径：换一张图就验不过")
    void signature_isPathBound() {
        String path = mediaPath(OWNER_USER_ID, AVATAR_SUBPATH);
        long exp = signer.expiresAtNow();
        String sig = signer.sign(path, exp);

        assertTrue(signer.verify(path, exp, sig));
        assertFalse(signer.verify(mediaPath(OWNER_USER_ID, VOICE_SUBPATH), exp, sig), "签名不得跨路径复用");
        assertFalse(signer.verify(path + "x", exp, sig));
        assertFalse(signer.verify(path, exp + 1, sig), "过期时刻被改即失效");
    }

    @Test
    @DisplayName("过期签名一律拒绝；非 hex 与空签名不抛异常只返回 false")
    void signature_rejectsExpiredAndGarbage() {
        String path = mediaPath(OWNER_USER_ID, AVATAR_SUBPATH);
        long past = java.time.Instant.now().getEpochSecond() - 10;
        String sig = signer.sign(path, past);

        assertFalse(signer.verify(path, past, sig), "过期必须拒绝");
        assertFalse(signer.verify(path, signer.expiresAtNow(), "zzzz"));
        assertFalse(signer.verify(path, signer.expiresAtNow(), ""));
        assertFalse(signer.verify(path, signer.expiresAtNow(), null));
    }

    @Test
    @DisplayName("换一把密钥，旧签名全部失效")
    void signature_isKeyBound() {
        String path = mediaPath(OWNER_USER_ID, AVATAR_SUBPATH);
        long exp = signer.expiresAtNow();
        String sig = signer.sign(path, exp);
        MediaUrlSigner other = new MediaUrlSigner("", "a-completely-different-secret-value-32-chars!!");

        assertFalse(other.verify(path, exp, sig));
        assertNotNull(signer.sign(path, exp));
    }

    /** 反射式检查：响应 record 除 items 外不得多出逐条拒绝原因字段。 */
    private int countDeniedFields(MediaAccessController.MediaSignView view) {
        return (int) java.util.Arrays.stream(MediaAccessController.MediaSignView.class.getRecordComponents())
                .filter(component -> !"items".equals(component.getName()))
                .count();
    }

    private static String mediaPath(Long ownerUserId, String subPath) {
        return "/api/v1/media/" + ownerUserId + "/" + subPath;
    }

    private void authenticateAs(Long userId, List<String> roles) {
        SecurityContextHolder.getContext().setAuthentication(authentication(userId, roles));
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
