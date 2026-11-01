package com.campuslove.api.location;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.block.BlockService;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * F-W1b-1（第六轮修复车道 W1b）：{@code GET /api/v1/location/nearby} 的主体绑定与授权判定。
 *
 * <p><b>缺陷基线（改造前）</b>：{@code GeoService#findNearby(lat, lng, radiusKm, maxResults)}
 * 的签名里没有主体，查询只按 bounding box 过滤，投影直接铺
 * {@code userId + 昵称 + 头像 + 校区 + 距离}。任何登录账号传任意坐标就能读全平台有坐标的
 * 用户，再用 1km 粒度的距离文本二分收敛，可把任意一个人的位置压到约 1km。</p>
 *
 * <p><b>本测试钉死的口径</b>（每条都以「改坏⇒红」为设计目标）：</p>
 * <ol>
 *   <li>无主体 / 主体不存在 / 授权判定器缺席 ⇒ 空集，且<b>一次坐标查询都不发</b>；</li>
 *   <li>A 调 nearby <b>不得拿到未授权 B 的任何身份字段</b>（未授权候选整条不出现）；</li>
 *   <li>自我、被拉黑（双向）、状态非 active 的候选都被剔除；</li>
 *   <li>距离只在候选通过全部授权判定后才计算（未授权者连 haversine 都不跑）；</li>
 *   <li>投影是白名单：只有 {@code userId/nickname/avatarUrl/distanceText}，
 *       没有校区/手机号/实名/证件/原始经纬度。</li>
 * </ol>
 *
 * <p><b>诚实边界</b>：本库没有「同意被附近的人看到」这一列，所以生产实现
 * {@link DenyAllNearbyPolicy} 一律 deny ⇒ 该端点今天恒返回空集。
 * 正路径用例是通过注入「已授权」的替身策略来验证投影裁剪与顺序的，
 * <b>不代表线上已经放开</b>；补齐同意位是交付报告里的交接项。</p>
 */
@DisplayName("F-W1b-1 附近的人：主体绑定 + 授权判定 + 最小必要投影")
class GeoServiceNearbyAuthzTest {

    private static final BigDecimal LAT = new BigDecimal("39.908823");
    private static final BigDecimal LNG = new BigDecimal("116.397470");

    private static final Long A_ID = 1L;   // 请求主体
    private static final Long B_ID = 2L;   // 未授权的附近用户
    private static final Long C_ID = 3L;   // 已授权的附近用户

    private static final String B_NICKNAME = "未授权的小明";
    private static final String C_NICKNAME = "已授权的小红";

    private UserRepository userRepository;
    private BlockService blockService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        blockService = mock(BlockService.class);
        when(userRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            User u = user(id, "u" + id, "active");
            return id.equals(A_ID) ? Optional.of(user(id, "我自己", "active"))
                    : id.equals(B_ID) ? Optional.of(user(id, B_NICKNAME, "active"))
                    : Optional.of(u);
        });
        when(blockService.getBlockedRelationUserIds(anyLong())).thenReturn(List.of());
    }

    private static User user(Long id, String nickname, String status) {
        User u = new User();
        u.setId(id);
        u.setNickname(nickname);
        u.setAvatarUrl("/avatar/" + id + ".png");
        u.setCampusName("天大北洋园");
        u.setLatitude(LAT.add(new BigDecimal("0.005")));
        u.setLongitude(LNG.add(new BigDecimal("0.005")));
        u.setStatus(status);
        u.setPhone("13800138000");
        return u;
    }

    /** 让 bounding box 查询返回指定候选。 */
    private void stubCandidates(User... candidates) {
        when(userRepository.findByLatitudeBetweenAndLongitudeBetween(
                any(), any(), any(), any())).thenReturn(List.of(candidates));
    }

    /** 只有 authorizedIds 里的候选被认为「已同意被附近的人看到」。 */
    private static NearbyVisibilityPolicy policyFor(Long... authorizedIds) {
        List<Long> allowed = List.of(authorizedIds);
        return (candidate, requesterId) -> allowed.contains(candidate.getId());
    }

    private GeoService serviceWith(NearbyVisibilityPolicy policy) {
        return new GeoService(userRepository, blockService, policy);
    }

    // ---------- 1. 主体缺席即 fail-closed ----------

    @Test
    @DisplayName("主体为 null ⇒ 空集，且一次坐标查询都不发（不得退化成「按坐标读全平台」）")
    void findNearby_withoutRequester_readsNothingAtAll() {
        GeoService service = serviceWith(policyFor());
        List<GeoService.NearbyPerson> result = service.findNearby(null, LAT, LNG, 5, 50);

        assertTrue(result.isEmpty(), "无主体的附近查询必须返回空集");
        verify(userRepository, never()).findByLatitudeBetweenAndLongitudeBetween(any(), any(), any(), any());
    }

    @Test
    @DisplayName("主体在库里不存在 ⇒ 空集，且不发坐标查询")
    void findNearby_unknownRequester_readsNothingAtAll() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());
        GeoService service = serviceWith(policyFor());

        assertTrue(service.findNearby(999L, LAT, LNG, 5, 50).isEmpty());
        verify(userRepository, never()).findByLatitudeBetweenAndLongitudeBetween(any(), any(), any(), any());
    }

    @Test
    @DisplayName("授权判定器未装配 ⇒ 空集（不是「跳过授权」）")
    void findNearby_withoutPolicy_failsClosed() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"));
        GeoService service = new GeoService(userRepository, blockService, null);

        assertTrue(service.findNearby(A_ID, LAT, LNG, 5, 50).isEmpty(),
                "证明不了授权的判定器缺席时，绝不能把候选原样吐出去");
    }

    // ---------- 2. 核心判点：未授权主体不得出现 ----------

    @Test
    @DisplayName("A 调 nearby 不得拿到未授权 B 的任何身份字段（B 整条不出现）")
    void findNearby_unauthorizedCandidate_leaksNoIdentityFields() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"), user(C_ID, C_NICKNAME, "active"));
        GeoService service = serviceWith(policyFor(C_ID)); // 只有 C 同意被看到

        List<GeoService.NearbyPerson> result = service.findNearby(A_ID, LAT, LNG, 5, 50);

        assertEquals(List.of(C_ID), result.stream().map(GeoService.NearbyPerson::userId).toList(),
                "只有已授权的 C 能出现；B 未授权 ⇒ 连一条匿名占位都不该有");
        String dumped = result.toString();
        assertFalse(dumped.contains(String.valueOf(B_ID)), "响应里不得出现未授权主体 ID：" + dumped);
        assertFalse(dumped.contains(B_NICKNAME), "响应里不得出现未授权主体昵称：" + dumped);
        assertFalse(dumped.contains("天大北洋园"), "响应里不得出现未授权主体校区：" + dumped);
        assertFalse(dumped.contains("13800138000"), "响应里不得出现手机号：" + dumped);
        assertFalse(dumped.contains("张三丰"), "响应里不得出现实名：" + dumped);
    }

    @Test
    @DisplayName("生产实现（无同意位 ⇒ 一律 deny）下结果恒为空集，且不泄露人数")
    void findNearby_productionDenyPolicy_returnsEmpty() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"), user(C_ID, C_NICKNAME, "active"));
        GeoService service = new GeoService(userRepository, blockService, new DenyAllNearbyPolicy());

        assertTrue(service.findNearby(A_ID, LAT, LNG, 5, 50).isEmpty(),
                "库中不存在地理曝光同意位时，附近的人必须整体为空（未闭合边界，见交付报告交接项）");
    }

    @Test
    @DisplayName("未授权候选【不计算距离】——距离本身可被二分，必须在授权之后才算")
    void findNearby_doesNotComputeDistanceForUnauthorizedCandidates() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"), user(C_ID, C_NICKNAME, "active"));
        GeoService service = spy(serviceWith(policyFor(C_ID)));

        service.findNearby(A_ID, LAT, LNG, 5, 50);

        verify(service, times(1)).haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        verify(service, times(1)).formatDistance(anyDouble());
        // 上面两条合起来说明：2 个候选里只有 1 个（已授权的 C）走到了距离精算；
        // 若把授权过滤删掉，这里会变成 2 次 ⇒ 红。
        org.mockito.Mockito.reset(service);
        stubCandidates(user(B_ID, B_NICKNAME, "active"));
        GeoService denyAll = spy(serviceWith(policyFor()));
        denyAll.findNearby(A_ID, LAT, LNG, 5, 50);
        verify(denyAll, never()).haversineKm(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        verify(denyAll, never()).formatDistance(anyDouble());
    }

    // ---------- 3. 其它剔除项 ----------

    @Test
    @DisplayName("全平台授权替身下：自己不得出现在附近列表")
    void findNearby_excludesSelf() {
        stubCandidates(user(A_ID, "我自己", "active"), user(C_ID, C_NICKNAME, "active"));
        GeoService service = serviceWith((candidate, requesterId) -> true);

        List<GeoService.NearbyPerson> result = service.findNearby(A_ID, LAT, LNG, 5, 50);

        assertEquals(List.of(C_ID), result.stream().map(GeoService.NearbyPerson::userId).toList(),
                "自己不是「附近的人」");
    }

    @Test
    @DisplayName("任一方拉黑（双向并集）⇒ 该候选被剔除，即便它同意被看到")
    void findNearby_excludesBlockedRelations() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"), user(C_ID, C_NICKNAME, "active"));
        when(blockService.getBlockedRelationUserIds(A_ID)).thenReturn(List.of(C_ID));
        GeoService service = new GeoService(userRepository, blockService,
                (candidate, requesterId) -> true);

        List<GeoService.NearbyPerson> result = service.findNearby(A_ID, LAT, LNG, 5, 50);

        assertEquals(List.of(B_ID), result.stream().map(GeoService.NearbyPerson::userId).toList(),
                "C 已把 A 拉黑 ⇒ 不得再出现在 A 的附近列表");
    }

    @Test
    @DisplayName("状态非 active（注销墓碑/被禁用）的候选被剔除")
    void findNearby_excludesNonActiveUsers() {
        stubCandidates(user(B_ID, B_NICKNAME, "deactivated"),
                user(C_ID, C_NICKNAME, "disabled"),
                user(4L, "正常小四", "active"));
        GeoService service = new GeoService(userRepository, blockService,
                (candidate, requesterId) -> true);

        List<GeoService.NearbyPerson> result = service.findNearby(A_ID, LAT, LNG, 5, 50);

        assertEquals(List.of(4L), result.stream().map(GeoService.NearbyPerson::userId).toList());
    }

    @Test
    @DisplayName("拉黑关系读取失败 ⇒ 整条查询 fail-closed 返回空集")
    void findNearby_blockServiceFailure_failsClosed() {
        stubCandidates(user(C_ID, C_NICKNAME, "active"));
        when(blockService.getBlockedRelationUserIds(A_ID)).thenThrow(new IllegalStateException("redis down"));
        GeoService service = new GeoService(userRepository, blockService,
                (candidate, requesterId) -> true);

        assertTrue(service.findNearby(A_ID, LAT, LNG, 5, 50).isEmpty(),
                "否决位不可判定时不能假定「没人拉黑我」继续放行");
    }

    // ---------- 4. 投影白名单 ----------

    @Test
    @DisplayName("NearbyPerson 投影是白名单：只有 userId/nickname/avatarUrl/distanceText")
    void nearbyPerson_projectionIsMinimal() {
        List<String> components = Arrays.stream(GeoService.NearbyPerson.class.getRecordComponents())
                .map(RecordComponent::getName)
                .sorted()
                .collect(Collectors.toList());

        assertEquals(List.of("avatarUrl", "distanceText", "nickname", "userId"), components,
                "附近的人投影新增了字段 ⇒ 必须先过授权层并说明最小必要理由");
        for (String banned : List.of("campusName", "phone", "realName", "idCardNo", "latitude", "longitude")) {
            assertFalse(components.contains(banned), "投影不得包含 " + banned);
        }
    }

    @Test
    @DisplayName("距离仍按 ADR-16 模糊到 1km（<1km 不给精确值）")
    void distanceStaysCoarse() {
        stubCandidates(user(C_ID, C_NICKNAME, "active"));
        GeoService service = serviceWith(policyFor(C_ID));

        List<GeoService.NearbyPerson> result = service.findNearby(A_ID, LAT, LNG, 5, 50);

        assertEquals(1, result.size());
        assertTrue(result.get(0).distanceText().endsWith("km"),
                "距离必须是模糊化文本，实际: " + result.get(0).distanceText());
        assertFalse(result.get(0).distanceText().contains("."),
                "距离文本不得带小数（那等于给出可二分的精确值）：" + result.get(0).distanceText());
    }

    // ---------- 5. Controller 侧：必须把主体送进服务 ----------

    @Test
    @DisplayName("Controller 把 getCurrentUserId() 的结果作为主体传给 findNearby")
    void controller_passesSubjectToService() {
        GeoService geoService = mock(GeoService.class);
        LocationController controller = new LocationController(mock(com.campuslove.api.location.LocationService.class));
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "geoService", geoService);

        try (org.mockito.MockedStatic<com.campuslove.api.config.SecurityUtils> mocked
                     = org.mockito.Mockito.mockStatic(com.campuslove.api.config.SecurityUtils.class)) {
            mocked.when(com.campuslove.api.config.SecurityUtils::getCurrentUserId).thenReturn(A_ID);
            controller.getNearby(LAT, LNG, 5, mock(jakarta.servlet.http.HttpServletRequest.class));
        }

        verify(geoService).findNearby(A_ID, LAT, LNG, 5, 50);
    }

    @Test
    @DisplayName("未认证请求 ⇒ 401，且不读任何坐标集合")
    void controller_unauthenticated_doesNotReadCollection() {
        GeoService geoService = mock(GeoService.class);
        LocationController controller = new LocationController(mock(com.campuslove.api.location.LocationService.class));
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "geoService", geoService);

        try (org.mockito.MockedStatic<com.campuslove.api.config.SecurityUtils> mocked
                     = org.mockito.Mockito.mockStatic(com.campuslove.api.config.SecurityUtils.class)) {
            mocked.when(com.campuslove.api.config.SecurityUtils::getCurrentUserId)
                    .thenThrow(org.springframework.web.client.HttpClientErrorException.create(
                            org.springframework.http.HttpStatus.UNAUTHORIZED, "未认证的用户请求",
                            null, null, null));

            assertThrows(org.springframework.web.client.HttpClientErrorException.Unauthorized.class,
                    () -> controller.getNearby(LAT, LNG, 5,
                            mock(jakarta.servlet.http.HttpServletRequest.class)));
        }

        verify(geoService, never()).findNearby(any(), any(), any(), org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    @DisplayName("反向对照：主体为 null 时服务自己也拒绝读取（两层都 fail-closed）")
    void controller_passingNullSubjectStillFailsClosed() {
        stubCandidates(user(B_ID, B_NICKNAME, "active"));
        GeoService service = new GeoService(userRepository, blockService,
                (candidate, requesterId) -> true); // 即便策略全授权，无主体也不许读

        assertTrue(service.findNearby(null, LAT, LNG, 5, 50).isEmpty());
        verify(userRepository, never()).findByLatitudeBetweenAndLongitudeBetween(any(), any(), any(), any());
    }
}