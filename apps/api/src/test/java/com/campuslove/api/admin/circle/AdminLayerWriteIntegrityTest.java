package com.campuslove.api.admin.circle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.circle.AdminLayer;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * 管理员-圈层绑定写接口完整性测试（P2：不再把 {@code @Entity AdminLayer} 当请求体，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code AdminLayerController} 的 POST 用
 * {@code @RequestBody AdminLayer} + {@code save(binding)}，PUT（替换式）用
 * {@code @RequestBody List<AdminLayer>} + {@code saveAll(bindings)}。二者对「id 非空的
 * 游离实体」都是 <b>MERGE</b>：body 里带上别人已有的绑定行 ID 就能覆盖那一行（把另一名
 * 管理员的绑定改指到别的圈层，等于换掉他的数据域），未写的字段按 null 落库，
 * {@code created_at} 由客户端 JSON 直接决定（审计轨迹可伪造）。</p>
 *
 * <p><b>修复后契约</b>：绑定行一律由服务端新建（id 恒 null、时间戳取服务端当前时间），
 * PUT 的 {@code adminId} 以路径变量为唯一权威；roleCode 一致性守卫（users.role 为权威）
 * 与响应字段集合保持不变。</p>
 */
@DisplayName("AdminLayerController - 绑定写接口不得 merge 覆盖他人绑定行")
class AdminLayerWriteIntegrityTest {

    private static final long TARGET_ADMIN = 500L;
    private static final long OTHER_ADMIN = 501L;
    private static final long EXISTING_BINDING_ID = 9L;
    private static final long PKU_LAYER = 3L;
    private static final long REGION_LAYER = 2L;

    private static final LocalDateTime ORIGINAL_CREATED_AT = LocalDateTime.of(2020, 1, 1, 8, 30, 0);

    private final AdminLayerRepository repository = mock(AdminLayerRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminLayerController controller = new AdminLayerController(repository, userRepository);

    /** saveAll 收到的批次（在替身里顺手记录，避免泛型 ArgumentCaptor 的可读性灾难） */
    private final List<List<AdminLayer>> savedBatches = new ArrayList<>();

    /** 另一名管理员已有的绑定行：本测试要证明它不会被这次请求顶替 */
    private AdminLayer foreignBinding;

    @BeforeEach
    void seed() {
        foreignBinding = binding(EXISTING_BINDING_ID, OTHER_ADMIN, REGION_LAYER, "ADMIN");

        when(userRepository.findById(TARGET_ADMIN)).thenReturn(Optional.of(admin(TARGET_ADMIN, "ADMIN")));
        when(userRepository.findById(OTHER_ADMIN)).thenReturn(Optional.of(admin(OTHER_ADMIN, "ADMIN")));
        when(repository.save(any(AdminLayer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.saveAll(anyList())).thenAnswer(inv -> {
            List<AdminLayer> batch = inv.getArgument(0);
            savedBatches.add(new ArrayList<>(batch));
            return batch;
        });
    }

    private static User admin(Long id, String role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        return user;
    }

    private static AdminLayer binding(Long id, Long adminId, Long layerId, String roleCode) {
        AdminLayer entity = new AdminLayer();
        entity.setId(id);
        entity.setAdminId(adminId);
        entity.setCircleLayerId(layerId);
        entity.setRoleCode(roleCode);
        entity.setCreatedAt(ORIGINAL_CREATED_AT);
        return entity;
    }

    /* ===================== 一、POST：恒插入，不得 merge 他人绑定行 ===================== */

    @Test
    @DisplayName("POST 带已存在的绑定行 ID：仓储收到的是新实体（id=null），他人绑定行原样保留")
    void bind_withExistingId_neverClobbersThatRow() throws Exception {
        AdminLayerBindRequest req = bodyOf("""
                {
                  "id": 9,
                  "adminId": 500,
                  "circleLayerId": 3,
                  "roleCode": "ADMIN",
                  "createdAt": "1999-01-01T00:00:00"
                }
                """);

        ApiResponse<AdminLayer> response = controller.bind(req);

        assertNotNull(response.data(), "绑定应返回结果行");
        AdminLayer persisted = captureSaved();
        assertNull(persisted.getId(),
                "POST 必须恒插入：交给仓储的实体 id 只能是 null，否则 save() 会 merge 覆盖既有绑定行");
        assertEquals(TARGET_ADMIN, persisted.getAdminId());
        assertEquals(PKU_LAYER, persisted.getCircleLayerId(), "应绑定请求指定的圈层，而不是顶掉别人那一行");

        // 另一名管理员的绑定行不得被波及
        assertEquals(OTHER_ADMIN, foreignBinding.getAdminId(), "他人绑定行的归属不得被改写");
        assertEquals(REGION_LAYER, foreignBinding.getCircleLayerId(), "他人绑定行的圈层不得被改写");
        assertEquals(ORIGINAL_CREATED_AT, foreignBinding.getCreatedAt(), "他人绑定行的创建时间不得被改写");
    }

    @Test
    @DisplayName("POST：createdAt 由服务端写，客户端伪造值进不了审计列")
    void bind_ignoresClientTimestamp() throws Exception {
        AdminLayerBindRequest req = bodyOf("""
                {
                  "adminId": 500,
                  "circleLayerId": 3,
                  "roleCode": "ADMIN",
                  "createdAt": "1999-01-01T00:00:00"
                }
                """);

        controller.bind(req);

        AdminLayer persisted = captureSaved();
        assertNotNull(persisted.getCreatedAt(), "createdAt 必须由服务端写入");
        assertNotEquals(1999, persisted.getCreatedAt().getYear(),
                "客户端伪造的 1999 年不得生效，实际: " + persisted.getCreatedAt());
        assertTrue(persisted.getCreatedAt().isAfter(ORIGINAL_CREATED_AT),
                "服务端应取当前业务时间，实际: " + persisted.getCreatedAt());
    }

    @Test
    @DisplayName("POST：roleCode 缺省时保持实体默认 ADMIN（防护不许把 NOT NULL 列写成 null）")
    void bind_blankRoleCodeKeepsEntityDefault() {
        controller.bind(new AdminLayerBindRequest(TARGET_ADMIN, PKU_LAYER, null));

        AdminLayer persisted = captureSaved();
        assertEquals("ADMIN", persisted.getRoleCode(), "省略 roleCode 时应保留实体默认值");
    }

    @Test
    @DisplayName("POST：roleCode 与实际 users.role 漂移仍然 400（既有守卫未被削弱）")
    void bind_roleCodeDriftStillRejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> controller.bind(new AdminLayerBindRequest(TARGET_ADMIN, PKU_LAYER, "SUPER_ADMIN")));
        assertTrue(ex.getMessage().contains("users.role"), "应指明角色权威来自 users.role，实际: " + ex.getMessage());
        verify(repository, never()).save(any(AdminLayer.class));
    }

    @Test
    @DisplayName("POST：缺少 circleLayerId 明确 400，不留给数据库 NOT NULL 抛 500")
    void bind_missingLayerIdRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.bind(new AdminLayerBindRequest(TARGET_ADMIN, null, "ADMIN")));
        verify(repository, never()).save(any(AdminLayer.class));
    }

    /* ===================== 二、PUT 替换式：每行都重建，adminId 以路径为权威 ===================== */

    @Test
    @DisplayName("PUT 替换式：仓储收到的每一行都是新实体且归属路径 adminId，别人那行不被顶掉")
    void replaceBindings_rebuildsEveryRowAsNew() throws Exception {
        List<AdminLayerBindRequest> reqs = bodiesOf("""
                [
                  {"id": 9, "adminId": 501, "circleLayerId": 2, "roleCode": "ADMIN",
                   "createdAt": "1999-01-01T00:00:00"},
                  {"adminId": 500, "circleLayerId": 3, "roleCode": "ADMIN"}
                ]
                """);

        ApiResponse<List<AdminLayer>> response = controller.replaceBindings(TARGET_ADMIN, reqs);

        assertEquals(1, savedBatches.size(), "替换式写入应只有一次 saveAll");
        List<AdminLayer> persisted = savedBatches.get(0);
        assertEquals(2, persisted.size());
        for (AdminLayer row : persisted) {
            assertNull(row.getId(), "替换式写入的每行都必须是新实体（id=null），否则是 merge 覆盖别人绑定行");
            assertEquals(TARGET_ADMIN, row.getAdminId(), "归属只能来自路径变量，不接受 body 里的 adminId");
            assertNotNull(row.getCreatedAt(), "createdAt 由服务端写入");
            assertNotEquals(1999, row.getCreatedAt().getYear(), "客户端伪造的时间戳不得生效");
        }
        assertEquals(OTHER_ADMIN, foreignBinding.getAdminId(), "他人绑定行的归属不得被改写");
        assertEquals(REGION_LAYER, foreignBinding.getCircleLayerId(), "他人绑定行的圈层不得被改写");
        verify(repository).deleteAllByAdminId(TARGET_ADMIN);
        assertNotNull(response.data(), "替换式写入应返回重建后的绑定行列表");
    }

    @Test
    @DisplayName("PUT 替换式：任一行 roleCode 漂移即整体 400，不做部分写入")
    void replaceBindings_roleCodeDriftRejectsWholeBatch() {
        List<AdminLayerBindRequest> reqs = List.of(
                new AdminLayerBindRequest(TARGET_ADMIN, PKU_LAYER, "ADMIN"),
                new AdminLayerBindRequest(TARGET_ADMIN, REGION_LAYER, "AUDITOR"));

        assertThrows(IllegalArgumentException.class,
                () -> controller.replaceBindings(TARGET_ADMIN, reqs));
        verify(repository, never()).saveAll(anyList());
        verify(repository, never()).deleteAllByAdminId(TARGET_ADMIN);
    }

    @Test
    @DisplayName("PUT 替换式：空列表 = 清空该管理员全部绑定（既有语义保持）")
    void replaceBindings_emptyListClearsAll() {
        controller.replaceBindings(TARGET_ADMIN, List.of());

        verify(repository).deleteAllByAdminId(TARGET_ADMIN);
        assertEquals(1, savedBatches.size(), "应只有一次 saveAll");
        assertTrue(savedBatches.get(0).isEmpty(), "空请求应插入零行");
    }

    /* ===================== 三、DTO 白名单本身 ===================== */

    @Test
    @DisplayName("白名单：DTO 只有 adminId / circleLayerId / roleCode，没有 id 与 createdAt 通道")
    void requestDto_isWhitelistOnly() {
        Set<String> components = Arrays.stream(AdminLayerBindRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        assertEquals(new LinkedHashSet<>(List.of("adminId", "circleLayerId", "roleCode")), components,
                "请求体字段集就是白名单，扩字段必须是有意识的决定");
        assertFalse(components.contains("id"), "不能有 id：那是 merge 覆盖他人绑定行的入口");
        assertFalse(components.contains("createdAt"), "不能有 createdAt：审计列归服务端");
    }

    /* ===================== 辅助 ===================== */

    /** 与 Spring MVC 同口径：Jackson 默认忽略未知字段（Spring Boot 关掉 FAIL_ON_UNKNOWN_PROPERTIES）。 */
    private static AdminLayerBindRequest bodyOf(String json) throws Exception {
        return mapper().readValue(json, AdminLayerBindRequest.class);
    }

    private static List<AdminLayerBindRequest> bodiesOf(String json) throws Exception {
        return mapper().readValue(json, new TypeReference<List<AdminLayerBindRequest>>() {
        });
    }

    private static ObjectMapper mapper() {
        return new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    private AdminLayer captureSaved() {
        ArgumentCaptor<AdminLayer> captor = ArgumentCaptor.forClass(AdminLayer.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }
}
