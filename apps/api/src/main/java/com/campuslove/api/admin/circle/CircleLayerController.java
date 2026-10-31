package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.circle.CircleLayer;
import com.campuslove.api.repository.circle.CircleLayerRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 三级圈层管理 Controller（Frame 01/04/05/08/09 对应端点）。
 * 仅 real profile 激活。
 *
 * <p><b>写接口契约（P2 修复，2026-10-31）</b>：POST/PUT 不再用 {@code @Entity CircleLayer}
 * 接请求体，改用白名单 DTO {@link CircleLayerUpsertRequest}。原因：
 * {@code JpaRepository#save} 对「id 非空的游离实体」执行 <b>MERGE</b>，于是旧实现下
 * 一个 {@code {"id": 已存在ID}} 的 POST 会<b>覆盖那一行而不是插入</b>；body 未写的字段
 * 按 null 落库（{@code parent_id} 可被静默抹掉 → 子树脱离父节点，按 {@code circle_path}
 * 前缀授权的管理员数据域被悄悄改写）；{@code createdAt/updatedAt} 由客户端 JSON 直接决定
 * （审计轨迹可伪造）。可达者仅 SUPER_ADMIN，故这是完整性问题而非提权。</p>
 *
 * <p>现在的规则：</p>
 * <ul>
 *   <li>POST：id 恒为 null（新插入），时间戳由服务端取业务时区当前时间；</li>
 *   <li>PUT：<b>先载入再逐字段改</b>，永不 merge 客户端实例；DTO 传 null 表示「不改」，
 *       因此省略 {@code parentId} 不会清空既有父节点；解除挂载必须显式
 *       {@code unlinkParent=true}；{@code createdAt} 不写、{@code updatedAt} 由服务端刷新；</li>
 *   <li>{@code status} 只接受服务端白名单 {@code active}/{@code disabled}，其它取值 400；</li>
 *   <li>父节点以 {@code parentId} 表达，服务端按 ID 取回真实节点后挂接，并在挂接后校验
 *       「层级 = 父层级 + 1」「路径落在父路径子树内」——改挂必须同时给出新的
 *       {@code circlePath}（该列不自动生成）。</li>
 * </ul>
 *
 * <p>响应体仍是 {@code CircleLayer} 实体本身，字段集合与修复前一致。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/circle-layers")
// 圈层结构（名称/层级/路径）对全体后台角色可读：校区管理员与审核员要在列表页按圈层
// 下钻筛选，读不到树就等于该功能对他们不存在。真正的写操作逐个方法收紧到 SUPER_ADMIN。
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class CircleLayerController {

    /** 圈层树固定三级：L1 公司 / L2 区域 / L3 学校 */
    private static final int MIN_LEVEL = 1;
    private static final int MAX_LEVEL = 3;

    /** 色阶缺省值（与实体字段初始值同口径） */
    private static final String DEFAULT_COLOR = "#0064e0";

    /** 新建节点的缺省状态 */
    private static final String DEFAULT_STATUS = CircleLayerUpsertRequest.STATUS_ACTIVE;

    private final CircleLayerRepository circleLayerRepository;

    public CircleLayerController(CircleLayerRepository circleLayerRepository) {
        this.circleLayerRepository = circleLayerRepository;
    }

    /** 获取全部圈层树（Frame 01 圈层结构图） */
    @GetMapping
    public ApiResponse<List<CircleLayer>> listAll() {
        return ApiResponse.ok(circleLayerRepository.findAllByOrderBySortAsc());
    }

    /** 获取指定层级的圈层 */
    @GetMapping("/by-level/{level}")
    public ApiResponse<List<CircleLayer>> listByLevel(@PathVariable Integer level) {
        return ApiResponse.ok(circleLayerRepository.findByLevelOrderBySortAsc(level));
    }

    /** 获取某圈层的所有子孙圈层（Frame 04/05 圈层下钻） */
    @GetMapping("/{id}/descendants")
    public ApiResponse<List<CircleLayer>> getDescendants(@PathVariable Long id) {
        var layer = circleLayerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("圈层不存在: id=" + id));
        return ApiResponse.ok(circleLayerRepository.findAllDescendants(layer.getCirclePath()));
    }

    /**
     * 创建新圈层（仅超级管理员：改树形结构等于改所有人的数据域）。
     *
     * <p>id 与时间戳由服务端掌管：本方法<b>恒插入新行</b>，不存在「带已有 ID 的 POST 覆盖
     * 既有节点」这条路。{@code circle_path} 仍不会自动生成，必须由调用方给出
     * （列 NOT NULL 且唯一），形如 {@code C1/R1/S1}；父节点用 {@code parentId} 表达
     * （旧写法 {@code {"parent":{"id":n}}} 属于实体直绑的产物，已随白名单 DTO 一并取消）。</p>
     *
     * @param req 白名单请求体
     * @return 新建后的圈层（服务端回读，父链已初始化）
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CircleLayer> create(@Valid @RequestBody CircleLayerUpsertRequest req) {
        if (isBlank(req.name())) {
            throw new IllegalArgumentException("创建圈层失败：名称（name）不能为空");
        }
        if (req.level() == null) {
            throw new IllegalArgumentException("创建圈层失败：层级（level）不能为空");
        }
        if (isBlank(req.circlePath())) {
            throw new IllegalArgumentException(
                    "创建圈层失败：路径（circlePath）不能为空，该列不自动生成，形如 C1/R1/S1");
        }
        assertLevelInRange(req.level());

        Map<Long, CircleLayer> tree = loadTreeById();
        String path = normalizePath(req.circlePath());
        assertPathUnused(tree, path, null);

        CircleLayer layer = new CircleLayer();
        // 关键：POST 恒为新插入——客户端没有 id 通道，这里再把 id 钉死为 null
        layer.setId(null);
        layer.setName(req.name().trim());
        layer.setLevel(req.level());
        layer.setCirclePath(path);
        layer.setColor(isBlank(req.color()) ? DEFAULT_COLOR : req.color().trim());
        layer.setSort(req.sort() != null ? req.sort() : 0);
        layer.setStatus(resolveStatusForCreate(req.status()));
        layer.setParent(req.parentId() == null ? null : requireExisting(tree, req.parentId()));
        assertConsistentWithParent(layer);

        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        layer.setCreatedAt(now);
        layer.setUpdatedAt(now);

        CircleLayer saved = circleLayerRepository.save(layer);
        return ApiResponse.ok(reloadForResponse(saved.getId(), saved));
    }

    /**
     * 更新圈层（仅超级管理员）。
     *
     * <p><b>先载入再改</b>：以库里的行为基线，只把请求体里出现的白名单字段盖上去；
     * 未出现的字段保持原值（尤其 {@code parent_id}——省略 {@code parentId} 不等于解除挂载）。
     * 时间戳由服务端掌管：{@code createdAt} 不动，{@code updatedAt} 刷新为业务时区当前时间。</p>
     *
     * @param id  目标圈层 ID（路径变量是唯一权威，请求体里没有 id）
     * @param req 白名单请求体
     * @return 更新后的圈层（服务端回读，父链已初始化）
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CircleLayer> update(@PathVariable Long id,
                                          @Valid @RequestBody CircleLayerUpsertRequest req) {
        if (req.wantsUnlink() && req.parentId() != null) {
            throw new IllegalArgumentException("更新圈层失败：unlinkParent 与 parentId 互斥，二者只能给一个");
        }
        if (req.level() != null) {
            assertLevelInRange(req.level());
        }

        Map<Long, CircleLayer> tree = loadTreeById();
        CircleLayer current = tree.get(id);
        if (current == null) {
            // 旧实现在这里会把 body 实例 setId(id) 后 save()：库里没有该行时 merge 的行为
            // 不可预期（可能插入），现在统一按 404 处理
            throw new EntityNotFoundException("圈层不存在: id=" + id);
        }

        if (!isBlank(req.name())) {
            current.setName(req.name().trim());
        }
        if (req.level() != null) {
            current.setLevel(req.level());
        }
        if (!isBlank(req.color())) {
            current.setColor(req.color().trim());
        }
        if (req.sort() != null) {
            current.setSort(req.sort());
        }
        if (req.status() != null) {
            current.setStatus(checkedStatus(req.status()));
        }

        Long existingParentId = current.getParent() == null ? null : current.getParent().getId();
        boolean reparented = false;
        if (req.wantsUnlink()) {
            if (existingParentId != null) {
                current.setParent(null);
                reparented = true;
            }
        } else if (req.parentId() != null) {
            if (req.parentId().equals(id)) {
                throw new IllegalArgumentException("更新圈层失败：父圈层不能是自身（id=" + id + "）");
            }
            CircleLayer candidate = requireExisting(tree, req.parentId());
            assertNotOwnDescendant(candidate, id);
            if (!req.parentId().equals(existingParentId)) {
                current.setParent(candidate);
                reparented = true;
            }
        }

        if (!isBlank(req.circlePath())) {
            String path = normalizePath(req.circlePath());
            assertPathUnused(tree, path, id);
            if (!path.equals(current.getCirclePath())) {
                if (hasChildren(tree, current)) {
                    throw new IllegalArgumentException("更新圈层失败：该圈层下仍有子圈层，改 circlePath 会"
                            + "让整棵子树脱离原路径（按路径前缀的授权口径随之失效），请先逐个迁移子节点");
                }
                current.setCirclePath(path);
            }
        } else if (reparented) {
            throw new IllegalArgumentException("更新圈层失败：改挂父节点必须同时给出新的 circlePath——"
                    + "该列不自动生成，只换父不换路径会让子树继续挂在旧路径下，管理员数据域随之漂移");
        }
        assertConsistentWithParent(current);

        // 服务端掌管审计列：createdAt 保持库中原值，updatedAt 由服务端刷新
        current.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        CircleLayer saved = circleLayerRepository.save(current);
        return ApiResponse.ok(reloadForResponse(saved.getId() != null ? saved.getId() : id, saved));
    }

    /** 删除圈层（有子节点时拒绝；仅超级管理员） */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        var layer = circleLayerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("圈层不存在: id=" + id));
        var descendants = circleLayerRepository.findByCirclePathStartingWithOrderBySortAsc(layer.getCirclePath());
        if (descendants.size() > 1) {
            throw new IllegalArgumentException("该圈层下有子圈层，无法删除");
        }
        circleLayerRepository.deleteById(id);
        return ApiResponse.ok(null);
    }

    /* ========== 白名单写入的内部约束 ========== */

    /**
     * 一次取回整棵树并按 ID 索引。
     *
     * <p>用 {@link CircleLayerRepository#findAllByOrderBySortAsc()} 而不是
     * {@code findById}：前者带 {@code parent, parent.parent} 实体图（见仓储注释），
     * 返回的节点父链已初始化——既能安全读 {@code getParent().getId()}，也能在写完后
     * 直接进响应体（open-in-view 关闭，未初始化的 LAZY 代理会在会话关闭后序列化时抛
     * LazyInitializationException）。本树按规格固定三级、共 25 个节点，整树读取是
     * 既有读端点的常规口径，不构成额外负担。</p>
     */
    private Map<Long, CircleLayer> loadTreeById() {
        Map<Long, CircleLayer> byId = new HashMap<>();
        for (CircleLayer node : circleLayerRepository.findAllByOrderBySortAsc()) {
            if (node.getId() != null) {
                byId.put(node.getId(), node);
            }
        }
        return byId;
    }

    /** 取节点；不存在即 400（父圈层必须由服务端解析，不接受客户端塞进来的实例）。 */
    private CircleLayer requireExisting(Map<Long, CircleLayer> tree, Long id) {
        CircleLayer node = tree.get(id);
        if (node == null) {
            throw new IllegalArgumentException("父圈层不存在: id=" + id);
        }
        return node;
    }

    /** 写完后按 ID 回读响应视图（拿不到就退回刚保存的实例）。 */
    private CircleLayer reloadForResponse(Long id, CircleLayer fallback) {
        if (id == null) {
            return fallback;
        }
        return circleLayerRepository.findAllByOrderBySortAsc().stream()
                .filter(node -> id.equals(node.getId()))
                .findFirst()
                .orElse(fallback);
    }

    /** 层级取值范围（DTO 注解之外的纵深防御，直接调用控制器时同样生效）。 */
    private void assertLevelInRange(Integer level) {
        if (level < MIN_LEVEL || level > MAX_LEVEL) {
            throw new IllegalArgumentException("圈层层级只能是 " + MIN_LEVEL + "/" + MAX_LEVEL
                    + " 之间的整数（1 公司 / 2 区域 / 3 学校），实际: " + level);
        }
    }

    /** 状态由服务端白名单裁定：只有 active / disabled 两种，其它取值 400。 */
    private String checkedStatus(String status) {
        String normalized = status == null ? "" : status.trim().toLowerCase();
        if (!CircleLayerUpsertRequest.STATUS_ACTIVE.equals(normalized)
                && !CircleLayerUpsertRequest.STATUS_DISABLED.equals(normalized)) {
            throw new IllegalArgumentException("圈层状态只能由服务端在白名单内切换（active / disabled），实际: "
                    + status);
        }
        return normalized;
    }

    /** 新建时的状态：省略即缺省 active，给了必须落在白名单内。 */
    private String resolveStatusForCreate(String status) {
        return isBlank(status) ? DEFAULT_STATUS : checkedStatus(status);
    }

    /** 挂接后校验：层级必须是父层级 +1，路径必须落在父路径子树内。 */
    private void assertConsistentWithParent(CircleLayer node) {
        CircleLayer parent = node.getParent();
        if (parent == null) {
            return;
        }
        if (node.getLevel() != null && parent.getLevel() != null
                && node.getLevel() != parent.getLevel() + 1) {
            throw new IllegalArgumentException("圈层层级与父节点不匹配：父节点 level=" + parent.getLevel()
                    + "，子节点必须是 level=" + (parent.getLevel() + 1) + "，实际: " + node.getLevel());
        }
        if (parent.getCirclePath() != null && node.getCirclePath() != null
                && !node.getCirclePath().startsWith(parent.getCirclePath() + "/")) {
            throw new IllegalArgumentException("圈层路径必须位于父节点子树内：期望前缀 "
                    + parent.getCirclePath() + "/，实际: " + node.getCirclePath());
        }
    }

    /** 防成环：不能把节点挂到它自己的子孙下面（否则后代查询与前缀授权会自指）。 */
    private void assertNotOwnDescendant(CircleLayer candidate, Long movingId) {
        CircleLayer cursor = candidate;
        // 固定轮数上限：本树最深三级，再多一层也只可能是脏数据，防御性收口避免死循环
        for (int depth = 0; cursor != null && depth < MAX_LEVEL + 1; depth++) {
            if (movingId.equals(cursor.getId())) {
                throw new IllegalArgumentException("更新圈层失败：不能把圈层挂到自己的子孙节点下（id="
                        + movingId + "）");
            }
            cursor = cursor.getParent();
        }
    }

    /** circle_path 列唯一：重复路径在这里就 400，不留给数据库约束抛 500。 */
    private void assertPathUnused(Map<Long, CircleLayer> tree, String path, Long selfId) {
        for (CircleLayer node : tree.values()) {
            if (path.equals(node.getCirclePath()) && !node.getId().equals(selfId)) {
                throw new IllegalArgumentException("圈层路径已存在: " + path + "（id=" + node.getId() + "）");
            }
        }
    }

    /** 是否有子节点（与删除端点同一判据：改路径同样会牵动子树，故一并拒绝）。 */
    private boolean hasChildren(Map<Long, CircleLayer> tree, CircleLayer node) {
        for (CircleLayer candidate : tree.values()) {
            if (candidate.getParent() != null && node.getId().equals(candidate.getParent().getId())) {
                return true;
            }
        }
        return false;
    }

    /** 路径归一：去首尾空白与多余斜杠（形如 C1/R1/S1）。 */
    private String normalizePath(String value) {
        String trimmed = value.trim();
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
