package com.campuslove.api.admin.circle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.circle.CircleLayer;
import com.campuslove.api.repository.circle.CircleLayerRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * 圈层写接口完整性测试（P2：不再把 {@code @Entity} 当请求体，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code CircleLayerController} 用
 * {@code @RequestBody CircleLayer} 接 body 后 {@code layer.setId(id); save(layer)}。
 * 因 {@code save()} 对「id 非空的游离实体」执行 <b>MERGE</b>，后果有三：</p>
 * <ol>
 *   <li>POST 带 {@code {"id": 已存在ID}} 覆盖那一行，而不是插入新行；</li>
 *   <li>body 未写的字段按 null 落库——省略 {@code parent} 就把 {@code parent_id} 抹掉，
 *       子树脱离父节点，按 {@code circle_path} 前缀授权的管理员数据域被静默改写；</li>
 *   <li>客户端 JSON 直接拥有 {@code createdAt/updatedAt}，审计轨迹可伪造。</li>
 * </ol>
 *
 * <p><b>本测试钉住的修复后契约</b>：POST 恒插入（交给仓储的实体 id 必为 null，且既有行
 * 一个字段都不动）；PUT 是「先载入再逐字段改」，省略 {@code parentId} 不清空既有父节点；
 * 时间戳只由服务端写；状态只能在白名单内切换。DTO 白名单本身也用反射钉一次——
 * 后来人扩字段时必须显式改这条断言。</p>
 *
 * <p>仓储用 Mockito 替身；圈层树是内存里的三行样例（L1 公司 / L2 区域 / L3 学校），
 * 与生产树形态一致（{@code findAllByOrderBySortAsc()} 的返回项父链已初始化）。</p>
 */
@DisplayName("CircleLayerController - 写接口白名单与 merge 覆盖防护")
class CircleLayerWriteIntegrityTest {

    private static final long ROOT_ID = 1L;
    private static final long REGION_ID = 2L;
    private static final long CAMPUS_ID = 3L;

    /** 库里既有的 createdAt（审计轨迹基线） */
    private static final LocalDateTime ORIGINAL_CREATED_AT = LocalDateTime.of(2020, 1, 1, 8, 30, 0);

    private final CircleLayerRepository repository = mock(CircleLayerRepository.class);
    private final CircleLayerController controller = new CircleLayerController(repository);

    private CircleLayer root;
    private CircleLayer region;
    private CircleLayer campus;

    @BeforeEach
    void seedTree() {
        root = layer(ROOT_ID, "公司", 1, "C1", null);
        region = layer(REGION_ID, "华东大区", 2, "C1/R1", root);
        campus = layer(CAMPUS_ID, "北大", 3, "C1/R1/S1", region);

        when(repository.findAllByOrderBySortAsc()).thenReturn(List.of(root, region, campus));
        // save() 语义原样透传：id 为空 -> 插入；id 非空 -> merge（本测试正是靠「id 必为 null」
        // 断言写路径永远走不到 merge 分支）
        when(repository.save(any(CircleLayer.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private static CircleLayer layer(Long id, String name, int level, String path, CircleLayer parent) {
        CircleLayer node = new CircleLayer();
        node.setId(id);
        node.setName(name);
        node.setLevel(level);
        node.setCirclePath(path);
        node.setParent(parent);
        node.setStatus("active");
        node.setColor("#0064e0");
        node.setSort(level);
        node.setCreatedAt(ORIGINAL_CREATED_AT);
        node.setUpdatedAt(ORIGINAL_CREATED_AT);
        return node;
    }

    /* ===================== 一、POST 恒插入：带已有 ID 也不得覆盖 ===================== */

    @Test
    @DisplayName("POST 带已存在 ID：交给仓储的实体 id 恒为 null，既有行一个字段都没动")
    void create_withExistingIdInBody_neverClobbersThatRow() throws Exception {
        // 攻击面：body 里带上库里 L3「北大」节点的 ID，试图把那一行顶替掉
        CircleLayerUpsertRequest req = bodyOf("""
                {
                  "id": 3,
                  "name": "被顶替的节点",
                  "level": 3,
                  "circlePath": "C1/R1/S9",
                  "createdAt": "1999-01-01T00:00:00",
                  "updatedAt": "1999-01-01T00:00:00"
                }
                """);

        ApiResponse<CircleLayer> response = controller.create(req);

        assertNotNull(response.data(), "创建应返回圈层视图");
        CircleLayer persisted = captureSaved();
        assertNull(persisted.getId(),
                "POST 必须恒插入：交给仓储的实体 id 只能是 null，否则 save() 会 merge 覆盖既有行");

        // 既有 L3 行必须原样保留——这正是「带已有 ID 的 POST 顶掉那一行」被拦住的证据
        assertEquals("北大", campus.getName(), "既有节点的名称不得被 POST 改写");
        assertEquals(REGION_ID, campus.getParent().getId(), "既有节点的父节点不得被 POST 改写");
        assertEquals(ORIGINAL_CREATED_AT, campus.getCreatedAt(), "既有节点的创建时间不得被 POST 改写");
        assertEquals("C1/R1/S1", campus.getCirclePath(), "既有节点的路径不得被 POST 改写");
    }

    @Test
    @DisplayName("POST：时间戳由服务端掌管，客户端 JSON 里的 createdAt/updatedAt 落不进去")
    void create_ignoresClientTimestamps() throws Exception {
        CircleLayerUpsertRequest req = bodyOf("""
                {
                  "id": 3,
                  "name": "清华",
                  "level": 3,
                  "circlePath": "C1/R1/S2",
                  "createdAt": "1999-01-01T00:00:00",
                  "updatedAt": "1999-01-01T00:00:00"
                }
                """);

        controller.create(req);

        CircleLayer persisted = captureSaved();
        assertNotNull(persisted.getCreatedAt(), "createdAt 必须由服务端写入");
        assertNotNull(persisted.getUpdatedAt(), "updatedAt 必须由服务端写入");
        assertNotEquals(1999, persisted.getCreatedAt().getYear(),
                "客户端伪造的 1999 年不得进入审计列，实际: " + persisted.getCreatedAt());
        assertNotEquals(1999, persisted.getUpdatedAt().getYear(),
                "客户端伪造的 1999 年不得进入审计列，实际: " + persisted.getUpdatedAt());
        assertTrue(persisted.getCreatedAt().isAfter(ORIGINAL_CREATED_AT),
                "新建节点的 createdAt 应取服务端当前业务时间，实际: " + persisted.getCreatedAt());
    }

    @Test
    @DisplayName("POST：状态缺省 active，白名单外的取值 400（状态切换由服务端裁定）")
    void create_statusIsServerOwnedWhitelist() {
        controller.create(new CircleLayerUpsertRequest(
                "新校区", 3, REGION_ID, null, "C1/R1/S3", null, null, null));
        assertEquals("active", captureSaved().getStatus(), "省略状态应缺省 active");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> controller.create(new CircleLayerUpsertRequest(
                        "删库校区", 3, REGION_ID, null, "C1/R1/S4", "deleted", null, null)),
                "白名单外的状态值必须被拒绝");
        assertTrue(ex.getMessage().contains("状态"), "应说明是状态取值问题，实际: " + ex.getMessage());
    }

    /* ===================== 二、PUT：先载入再改，省略字段不得清空 ===================== */

    @Test
    @DisplayName("PUT 省略 parentId：既有父节点保持不变（不会被抹成 null）")
    void update_omittedParent_keepsExistingParent() {
        ApiResponse<CircleLayer> response = controller.update(CAMPUS_ID,
                new CircleLayerUpsertRequest("北京大学", null, null, null, null, null, null, null));

        CircleLayer persisted = captureSaved();
        assertNotNull(persisted.getParent(), "省略 parentId 不等于解除挂载：父节点必须仍在");
        assertEquals(REGION_ID, persisted.getParent().getId(), "父节点应仍是原华东大区");
        assertEquals("北京大学", persisted.getName(), "请求里给出的字段应被改写");
        assertEquals("C1/R1/S1", persisted.getCirclePath(), "省略 circlePath 应保持原值");
        assertNotNull(response.data(), "更新应返回圈层视图");
    }

    @Test
    @DisplayName("PUT 只改一个字段：其余列（父节点/路径/色阶/名称）一律保持原值")
    void update_partialBody_doesNotNullOutUntouchedColumns() {
        controller.update(CAMPUS_ID,
                new CircleLayerUpsertRequest(null, null, null, null, null, null, null, 12));

        CircleLayer persisted = captureSaved();
        assertEquals(Integer.valueOf(12), persisted.getSort(), "给出的字段应生效");
        assertEquals("北大", persisted.getName(), "未给出的字段应保持原值");
        assertNotNull(persisted.getParent(), "未给出的父节点不得变 null");
        assertEquals("C1/R1/S1", persisted.getCirclePath(), "未给出的路径不得变 null");
        assertEquals("#0064e0", persisted.getColor(), "未给出的色阶不得变 null");
    }

    @Test
    @DisplayName("PUT：客户端时间戳被忽略——createdAt 保持库中原值，updatedAt 由服务端刷新")
    void update_clientTimestampsIgnored() throws Exception {
        CircleLayerUpsertRequest req = bodyOf("""
                {
                  "name": "改名了",
                  "level": 3,
                  "circlePath": "C1/R1/S1",
                  "parentId": 2,
                  "createdAt": "1999-01-01T00:00:00",
                  "updatedAt": "1999-01-01T00:00:00",
                  "parent": {"id": 9, "name": "伪造父节点", "circlePath": "EVIL"}
                }
                """);

        controller.update(CAMPUS_ID, req);

        CircleLayer persisted = captureSaved();
        assertEquals(ORIGINAL_CREATED_AT, persisted.getCreatedAt(),
                "createdAt 必须保持库中原值（请求体没有该字段通道）");
        assertNotEquals(1999, persisted.getUpdatedAt().getYear(), "客户端伪造的 updatedAt 不得生效");
        assertTrue(persisted.getUpdatedAt().isAfter(ORIGINAL_CREATED_AT),
                "updatedAt 应由服务端刷新，实际: " + persisted.getUpdatedAt());
        assertEquals(REGION_ID, persisted.getParent().getId(),
                "父节点按 parentId 由服务端解析，body 里的嵌套 parent 对象没有写入通道");
        assertEquals("华东大区", persisted.getParent().getName(),
                "父节点必须是库里真实取回的节点，而不是客户端伪造的实例");
    }

    @Test
    @DisplayName("PUT 不存在的 ID：404 语义，绝不落库（旧实现把 body 实例 merge 上去，行为不可预期）")
    void update_unknownId_isNotFound() {
        assertThrows(jakarta.persistence.EntityNotFoundException.class,
                () -> controller.update(404404L,
                        new CircleLayerUpsertRequest("幽灵节点", null, null, null, null, null, null, null)));
        verify(repository, never()).save(any(CircleLayer.class));
    }

    @Test
    @DisplayName("PUT：写入目标只来自路径变量，body 里的 id 不能把写入重定向到别的行")
    void update_pathVariableIsTheOnlyIdSource() throws Exception {
        controller.update(CAMPUS_ID, bodyOf("""
                {
                  "id": 2,
                  "name": "越界改名",
                  "circlePath": "C1/R1/S1"
                }
                """));

        CircleLayer persisted = captureSaved();
        assertEquals(CAMPUS_ID, persisted.getId(), "写入目标只能是路径里的 id");
        assertNotEquals(REGION_ID, persisted.getId(), "body 里的 id 不可能把写入重定向到别的行");
        assertEquals("华东大区", region.getName(), "另一行（大区节点）不得被这次 PUT 波及");
    }

    @Test
    @DisplayName("PUT 改挂父节点必须同时给出新路径，否则 400 且不落库")
    void update_reparentWithoutPath_rejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> controller.update(CAMPUS_ID,
                        new CircleLayerUpsertRequest(null, null, ROOT_ID, null, null, null, null, null)));
        assertTrue(ex.getMessage().contains("circlePath") || ex.getMessage().contains("路径"),
                "应说明改挂必须同步给路径，实际: " + ex.getMessage());
        verify(repository, never()).save(any(CircleLayer.class));
    }

    @Test
    @DisplayName("PUT 显式 unlinkParent + 新路径才允许解除挂载（叶子节点）")
    void update_explicitUnlinkIsHonoured() {
        controller.update(CAMPUS_ID,
                new CircleLayerUpsertRequest(null, null, null, true, "S1", null, null, null));

        CircleLayer persisted = captureSaved();
        assertNull(persisted.getParent(), "显式 unlinkParent 才允许把 parent_id 置空");
        assertEquals("S1", persisted.getCirclePath(), "解除挂载时同步给出的新路径应生效");
    }

    @Test
    @DisplayName("PUT 改路径会孤立子树时被拒绝（与删除端点同一判据）")
    void update_pathChangeWithChildren_rejected() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> controller.update(REGION_ID,
                        new CircleLayerUpsertRequest(null, null, null, null, "C1/R9", null, null, null)));
        assertTrue(ex.getMessage().contains("子圈层"), "应说明子树风险，实际: " + ex.getMessage());
        verify(repository, never()).save(any(CircleLayer.class));
    }

    @Test
    @DisplayName("PUT 不能把节点挂到自身或自身子孙下面（防成环）")
    void update_rejectSelfAndDescendantParent() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.update(CAMPUS_ID, new CircleLayerUpsertRequest(
                        null, null, CAMPUS_ID, null, "C1/R1/S1", null, null, null)),
                "父节点不能是自身");

        // 把 L2 挂到它的子节点 L3 下面 => 成环
        assertThrows(IllegalArgumentException.class,
                () -> controller.update(REGION_ID, new CircleLayerUpsertRequest(
                        null, null, CAMPUS_ID, null, "C1/R1/S1/C1/R1", null, null, null)),
                "不能挂到自己的子孙下");
        verify(repository, never()).save(any(CircleLayer.class));
    }

    @Test
    @DisplayName("PUT 挂到不存在的父节点：400，绝不落库（父节点必须由服务端按 ID 解析）")
    void update_unknownParent_rejected() {
        assertThrows(IllegalArgumentException.class,
                () -> controller.update(CAMPUS_ID, new CircleLayerUpsertRequest(
                        null, null, 999999L, null, "C1/R1/S1", null, null, null)));
        verify(repository, never()).save(any(CircleLayer.class));
    }

    /* ===================== 三、DTO 白名单本身 ===================== */

    @Test
    @DisplayName("白名单：DTO 只有 8 个字段，没有 id / createdAt / updatedAt / parent 通道")
    void requestDto_isWhitelistOnly() {
        Set<String> components = Arrays.stream(CircleLayerUpsertRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        assertEquals(new LinkedHashSet<>(List.of(
                        "name", "level", "parentId", "unlinkParent",
                        "circlePath", "status", "color", "sort")),
                components, "请求体字段集就是白名单，扩字段必须是有意识的决定");
        assertFalse(components.contains("id"), "不能有 id：那是 POST 覆盖既有行的入口");
        assertFalse(components.contains("createdAt"), "不能有 createdAt：审计列归服务端");
        assertFalse(components.contains("updatedAt"), "不能有 updatedAt：审计列归服务端");
        assertFalse(components.contains("parent"), "不能有嵌套 parent 实例：游离实体不得进写路径");
    }

    /* ===================== 辅助 ===================== */

    /**
     * 按 Spring MVC 的口径反序列化请求体：Jackson 默认忽略未知字段
     * （Spring Boot 关掉 FAIL_ON_UNKNOWN_PROPERTIES），因此 body 里多出来的
     * id / createdAt / parent 只会落在「无对应字段」上被丢弃。
     */
    private static CircleLayerUpsertRequest bodyOf(String json) throws Exception {
        ObjectMapper mapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper.readValue(json, CircleLayerUpsertRequest.class);
    }

    /** 取本次写入交给仓储的实体（并断言只有一次写入）。 */
    private CircleLayer captureSaved() {
        ArgumentCaptor<CircleLayer> captor = ArgumentCaptor.forClass(CircleLayer.class);
        verify(repository, times(1)).save(captor.capture());
        return captor.getValue();
    }
}
