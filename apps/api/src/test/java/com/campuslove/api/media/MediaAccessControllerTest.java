package com.campuslove.api.media;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.preauth.PreAuthenticatedAuthenticationToken;
import org.springframework.web.servlet.HandlerMapping;

/**
 * Task 0.3.2d：MediaAccessController 单元测试。
 *
 * <p>覆盖 5 个核心鉴权场景（与 spec.md 要求一一对应）：
 * <ol>
 *   <li>本人访问：当前 userId = 文件归属 userId → 200 成功返回 Resource</li>
 *   <li>他人访问：当前 userId ≠ 文件归属 userId 且非 ADMIN → 403 AccessDeniedException</li>
 *   <li>管理员访问：当前用户为 ADMIN，访问任意 userId 的文件 → 200 成功返回 Resource</li>
 *   <li>无 token：Authentication 为 null（未认证）→ 403 AccessDeniedException</li>
 *   <li>路径穿越（Path Traversal）：subPath 含 {@code ..} → 400 ResponseStatusException</li>
 * </ol>
 * </p>
 *
 * <p>测试策略：
 * <ul>
 *   <li>使用临时目录作为 storageRoot，避免污染工作目录</li>
 *   <li>构造真实媒体文件，通过 MediaAccessService.loadMedia() 验证端到端鉴权</li>
 *   <li>Authentication 通过 PreAuthenticatedAuthenticationToken 构造，模拟 JwtAuthenticationFilter
 *       注入的认证主体（principal=userId, authorities=ROLE_USER/ROLE_ADMIN）</li>
 *   <li>无 token 场景：将 SecurityContext 清空，传入 null Authentication</li>
 * </ul>
 * </p>
 *
 * <p>注：本测试覆盖 MediaAccessController 的全部鉴权分支，包括 Service 层的路径安全校验，
 *       通过 Controller → Service 调用链路完整验证。Path Traversal 校验在 Service 层执行，
 *       因此直接调用 Service.loadMedia() 即可覆盖。</p>
 */
class MediaAccessControllerTest {

    /** 测试用文件归属者 userId */
    private static final Long OWNER_USER_ID = 100L;
    /** 测试用其他用户 userId */
    private static final Long OTHER_USER_ID = 200L;
    /** 测试用管理员 userId */
    private static final Long ADMIN_USER_ID = 300L;
    /** 测试用月份目录 */
    private static final String MONTH_SEGMENT = "202607";
    /** 测试用文件名 */
    private static final String FILE_NAME = "test-avatar.jpg";
    /** 测试用合法子路径 */
    private static final String VALID_SUBPATH = MONTH_SEGMENT + "/" + FILE_NAME;

    private Path tempRoot;
    private MediaAccessService mediaAccessService;
    private MediaAccessController mediaAccessController;

    @BeforeEach
    void setUp() throws IOException {
        tempRoot = Files.createTempDirectory("media-access-test");
        mediaAccessService = new MediaAccessService(tempRoot.toString());
        mediaAccessController = new MediaAccessController(mediaAccessService);

        // 在 storageRoot/{OWNER_USER_ID}/{MONTH_SEGMENT}/ 下创建测试文件
        Path ownerDir = tempRoot.resolve(OWNER_USER_ID.toString())
                .resolve(MONTH_SEGMENT);
        Files.createDirectories(ownerDir);
        Path testFile = ownerDir.resolve(FILE_NAME);
        Files.writeString(testFile, "test-image-content");

        // 同样为 admin 测试场景创建 admin 自己的文件（用于验证 admin 访问他人文件路径）
        // 已通过 OWNER_USER_ID 的文件覆盖（admin 访问 OWNER_USER_ID 的文件）
    }

    @AfterEach
    void tearDown() throws IOException {
        // 清理 SecurityContext，避免测试间状态泄漏
        SecurityContextHolder.clearContext();
        if (Files.exists(tempRoot)) {
            Files.walk(tempRoot)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                            // 测试清理时忽略删除失败
                        }
                    });
        }
    }

    /**
     * 场景 1：本人访问自己的媒体文件 → 成功返回 Resource。
     *
     * <p>前置：Authentication.principal = OWNER_USER_ID，authorities = [ROLE_USER]</p>
     * <p>预期：loadMedia 返回非 null MediaFile，Resource 可读取，Content-Type 为 image/jpeg</p>
     */
    @Test
    void loadMedia_ownerAccess_shouldReturnResource() {
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);

        MediaAccessService.MediaFile mediaFile =
                mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

        assertNotNull(mediaFile, "本人访问应返回非 null MediaFile");
        assertNotNull(mediaFile.getResource(), "Resource 不应为 null");
        assertTrue(mediaFile.getResource().exists(), "Resource 应存在");
        assertEquals("image/jpeg", mediaFile.getMediaType().toString(),
                "MIME 应为 image/jpeg");
    }

    /**
     * 场景 2：他人访问非自己的媒体文件 → 抛出 AccessDeniedException（403）。
     *
     * <p>前置：Authentication.principal = OTHER_USER_ID，authorities = [ROLE_USER]</p>
     * <p>预期：抛出 AccessDeniedException，message 包含"无权访问"</p>
     */
    @Test
    void loadMedia_otherUserAccess_shouldThrowAccessDenied() {
        Authentication authentication = buildUserAuthentication(OTHER_USER_ID, false);

        AccessDeniedException ex = assertThrows(
                AccessDeniedException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication));
        assertTrue(ex.getMessage().contains("无权访问") || ex.getMessage().contains("拒绝"),
                "异常信息应说明拒绝访问: " + ex.getMessage());
    }

    /**
     * 场景 3：管理员访问任意用户的媒体文件 → 成功返回 Resource。
     *
     * <p>前置：Authentication.principal = ADMIN_USER_ID，authorities = [ROLE_USER, ROLE_ADMIN]</p>
     * <p>预期：loadMedia 返回非 null MediaFile，可读取 OWNER_USER_ID 的文件</p>
     */
    @Test
    void loadMedia_adminAccess_shouldReturnResource() {
        Authentication authentication = buildUserAuthentication(ADMIN_USER_ID, true);

        MediaAccessService.MediaFile mediaFile =
                mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, authentication);

        assertNotNull(mediaFile, "管理员访问应返回非 null MediaFile");
        assertNotNull(mediaFile.getResource(), "Resource 不应为 null");
        assertTrue(mediaFile.getResource().exists(), "Resource 应存在");
    }

    /**
     * 场景 4：无 token（Authentication 为 null）→ 抛出 AccessDeniedException（403）。
     *
     * <p>前置：未携带 Authorization 头，JwtAuthenticationFilter 未设置 SecurityContext，
     *       Controller 传入 null Authentication</p>
     * <p>预期：抛出 AccessDeniedException，message 包含"未认证"</p>
     */
    @Test
    void loadMedia_noToken_shouldThrowAccessDenied() {
        AccessDeniedException ex = assertThrows(
                AccessDeniedException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, VALID_SUBPATH, null));
        assertTrue(ex.getMessage().contains("未认证") || ex.getMessage().contains("拒绝"),
                "异常信息应说明未认证: " + ex.getMessage());
    }

    /**
     * 场景 5：路径穿越攻击（subPath 含 {@code ..}）→ 抛出 ResponseStatusException（400）。
     *
     * <p>前置：Authentication.principal = OWNER_USER_ID，subPath 包含 {@code ../}</p>
     * <p>预期：抛出 ResponseStatusException，HTTP 状态码 400，message 包含"非法路径"</p>
     *
     * <p>注：subPath 为 {@code "../200/secret.jpg"} 时，Service 应在字符级校验阶段拦截，
     *       不会到达磁盘路径构造阶段。即使构造出越界路径，startsWith(root) 二次校验
     *       也会拒绝（抛 403）。本测试聚焦最常见的 {@code ..} 攻击向量。</p>
     */
    @Test
    void loadMedia_pathTraversal_shouldThrowBadRequest() {
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
        String maliciousSubPath = "../" + OTHER_USER_ID + "/secret.jpg";

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, maliciousSubPath, authentication));
        assertEquals(400, ex.getStatusCode().value(),
                "Path Traversal 应返回 400 Bad Request");
        assertTrue(ex.getReason() != null && ex.getReason().contains("非法路径"),
                "异常信息应说明路径非法: " + ex.getReason());
    }

    /**
     * 补充场景 5.1：路径穿越变种 —— 绝对路径（{@code /etc/passwd}）应被拒绝。
     *
     * <p>验证 subPath 以 {@code /} 开头时被字符级校验拦截。</p>
     */
    @Test
    void loadMedia_absolutePath_shouldThrowBadRequest() {
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
        String maliciousSubPath = "/etc/passwd";

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, maliciousSubPath, authentication));
        assertEquals(400, ex.getStatusCode().value(),
                "绝对路径应返回 400 Bad Request");
    }

    /**
     * 补充场景 5.2：路径穿越变种 —— 反斜杠（Windows 路径分隔符）应被拒绝。
     */
    @Test
    void loadMedia_backslashPath_shouldThrowBadRequest() {
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
        String maliciousSubPath = "..\\..\\secret.jpg";

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, maliciousSubPath, authentication));
        assertEquals(400, ex.getStatusCode().value(),
                "反斜杠路径应返回 400 Bad Request");
    }

    /**
     * 补充场景 6：文件不存在 → 抛出 ResponseStatusException（404）。
     *
     * <p>验证鉴权通过后，文件不存在时返回 404 而非 403，
           避免向攻击者泄露文件存在性信息。</p>
     */
    @Test
    void loadMedia_fileNotExists_shouldThrowNotFound() {
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
        String notExistingSubPath = MONTH_SEGMENT + "/non-existent.jpg";

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> mediaAccessService.loadMedia(OWNER_USER_ID, notExistingSubPath, authentication));
        assertEquals(404, ex.getStatusCode().value(),
                "文件不存在应返回 404 Not Found");
    }

    /**
     * 补充场景 7：Controller 层 extractSubPath 正常路径测试。
     *
     * <p>验证 MediaAccessController 能从 HttpServletRequest 提取子路径，
     * 并通过鉴权返回文件内容。</p>
     */
    @Test
    void controller_extractSubPathAndLoad_shouldReturnResource() {
        // 设置 SecurityContext（模拟 JwtAuthenticationFilter 已认证）
        Authentication authentication = buildUserAuthentication(OWNER_USER_ID, false);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 构造 MockHttpServletRequest，模拟 Spring MVC 注入的 pathWithin 属性
        MockHttpServletRequest request = new MockHttpServletRequest();
        String pathWithin = OWNER_USER_ID + "/" + VALID_SUBPATH;
        request.setAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE, pathWithin);
        request.setRequestURI("/api/v1/media/" + pathWithin);

        var response = mediaAccessController.getMedia(OWNER_USER_ID, request);

        assertNotNull(response, "Controller 应返回非 null ResponseEntity");
        assertEquals(200, response.getStatusCode().value(),
                "应返回 200 OK");
        assertNotNull(response.getBody(), "ResponseEntity body 不应为 null");
    }

    // ---------- 工具方法 ----------

    /**
     * 构造 Authentication 对象，模拟 JwtAuthenticationFilter 注入的认证主体。
     *
     * <p>与生产代码 {@link com.campuslove.api.config.JwtAuthenticationFilter} 注入的
     * {@link PreAuthenticatedAuthenticationToken} 结构一致：
     * principal=userId(Long), credentials=token, authorities=[ROLE_USER, (ROLE_ADMIN)]</p>
     *
     * @param userId  当前用户 ID
     * @param isAdmin 是否为管理员（true 时追加 ROLE_ADMIN）
     * @return 已认证的 Authentication 对象
     */
    private Authentication buildUserAuthentication(Long userId, boolean isAdmin) {
        List<SimpleGrantedAuthority> authorities;
        if (isAdmin) {
            authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_USER"),
                    new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        }
        PreAuthenticatedAuthenticationToken authentication =
                new PreAuthenticatedAuthenticationToken(userId, "test-token", authorities);
        authentication.setAuthenticated(true);
        return authentication;
    }
}
