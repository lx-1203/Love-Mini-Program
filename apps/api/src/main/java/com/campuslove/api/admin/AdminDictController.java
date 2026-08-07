package com.campuslove.api.admin;

import com.campuslove.api.admin.audit.AuditOperation;
import com.campuslove.api.admin.audit.Auditable;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.Dict;
import com.campuslove.api.entity.DictItem;
import com.campuslove.api.repository.DictItemRepository;
import com.campuslove.api.repository.DictRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 数据字典控制器（eladmin 风格）。
 *
 * <p>核心能力：</p>
 * <ul>
 *   <li>字典 CRUD（编码唯一）</li>
 *   <li>字典条目 CRUD + {@code GET /api/v1/admin/dicts/{code}/items} 按字典码取条目
 *       （前端下拉、活动类型等枚举从此加载）</li>
 * </ul>
 *
 * <p>字典条目未接入校区隔离（全局配置性质，校区管理员只读或按角色授权）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/dicts")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminDictController {

    private final DictRepository dictRepository;
    private final DictItemRepository dictItemRepository;

    public AdminDictController(DictRepository dictRepository,
                               DictItemRepository dictItemRepository) {
        this.dictRepository = dictRepository;
        this.dictItemRepository = dictItemRepository;
    }

    /**
     * 查询字典列表（含条目数）。
     *
     * @return 字典列表
     */
    @GetMapping
    public List<AdminDictView> listDicts() {
        SecurityUtils.getCurrentUserId();
        return dictRepository.findAll().stream()
                .map(this::toDictView)
                .collect(Collectors.toList());
    }

    /**
     * 查询字典详情（含条目）。
     *
     * @param id 字典 ID
     * @return 字典详情；不存在返回 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminDictDetailView> getDict(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();
        Optional<Dict> dictOpt = dictRepository.findById(id);
        if (dictOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Dict dict = dictOpt.get();
        List<AdminDictItemView> items = dictItemRepository.findByDictIdOrderBySortAsc(id).stream()
                .map(this::toDictItemView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(new AdminDictDetailView(
                dict.getId(), dict.getName(), dict.getCode(), dict.getDescription(), items));
    }

    /**
     * 按字典编码查询条目（前端枚举下拉用，如 GET /dicts/ACTIVITY_TYPE/items）。
     *
     * @param code 字典编码
     * @return 启用条目列表；字典不存在返回 404
     */
    @GetMapping("/{code}/items")
    public ResponseEntity<List<AdminDictItemView>> listDictItemsByCode(@PathVariable("code") String code) {
        SecurityUtils.getCurrentUserId();
        Optional<Dict> dictOpt = dictRepository.findByCode(code.trim().toUpperCase());
        if (dictOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<AdminDictItemView> items = dictItemRepository.findByDictIdOrderBySortAsc(dictOpt.get().getId()).stream()
                .filter(item -> Boolean.TRUE.equals(item.getEnabled()))
                .map(this::toDictItemView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(items);
    }

    /**
     * 新增字典（仅超级管理员，编码唯一）。
     *
     * @param req 新增请求体
     * @return 创建后的字典
     */
    @PostMapping
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_DICT, targetType = "DICT",
            description = "新增字典")
    public ResponseEntity<AdminDictView> createDict(@Valid @RequestBody AdminDictRequest req) {
        SecurityUtils.getCurrentUserId();

        String code = req.code().trim().toUpperCase();
        if (dictRepository.existsByCode(code)) {
            return ResponseEntity.badRequest().build();
        }

        Dict dict = new Dict();
        dict.setName(req.name().trim());
        dict.setCode(code);
        dict.setDescription(req.description() != null ? req.description().trim() : "");
        LocalDateTime now = LocalDateTime.now();
        dict.setCreatedAt(now);
        dict.setUpdatedAt(now);
        Dict saved = dictRepository.save(dict);
        return ResponseEntity.ok(toDictView(saved));
    }

    /**
     * 编辑字典（仅超级管理员）。
     *
     * @param id  字典 ID
     * @param req 编辑请求体
     * @return 更新后的字典；不存在返回 404
     */
    @PutMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_DICT, targetType = "DICT",
            description = "编辑字典")
    public ResponseEntity<AdminDictView> updateDict(
            @PathVariable("id") @Min(1) Long id,
            @Valid @RequestBody AdminDictRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Dict> dictOpt = dictRepository.findById(id);
        if (dictOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Dict dict = dictOpt.get();

        // 编码唯一性校验（排除自身）
        if (req.code() != null) {
            String code = req.code().trim().toUpperCase();
            Optional<Dict> codeExists = dictRepository.findByCode(code);
            if (codeExists.isPresent() && !codeExists.get().getId().equals(id)) {
                return ResponseEntity.badRequest().build();
            }
            dict.setCode(code);
        }
        if (req.name() != null) {
            dict.setName(req.name().trim());
        }
        if (req.description() != null) {
            dict.setDescription(req.description().trim());
        }
        dict.setUpdatedAt(LocalDateTime.now());
        Dict saved = dictRepository.save(dict);
        return ResponseEntity.ok(toDictView(saved));
    }

    /**
     * 删除字典（仅超级管理员，级联删除条目）。
     *
     * @param id 字典 ID
     * @return 204 删除成功；404 不存在
     */
    @DeleteMapping("/{id}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.DELETE_DICT, targetType = "DICT",
            description = "删除字典")
    public ResponseEntity<Void> deleteDict(@PathVariable("id") @Min(1) Long id) {
        SecurityUtils.getCurrentUserId();

        Optional<Dict> dictOpt = dictRepository.findById(id);
        if (dictOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dictItemRepository.deleteByDictId(id);
        dictRepository.delete(dictOpt.get());
        return ResponseEntity.noContent().build();
    }

    /**
     * 新增字典条目（仅超级管理员）。
     *
     * @param dictId 字典 ID
     * @param req    条目请求体
     * @return 创建后的条目；字典不存在返回 404
     */
    @PostMapping("/{dictId}/items")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.CREATE_DICT_ITEM, targetType = "DICT_ITEM",
            description = "新增字典条目")
    public ResponseEntity<AdminDictItemView> createDictItem(
            @PathVariable("dictId") @Min(1) Long dictId,
            @Valid @RequestBody AdminDictItemRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<Dict> dictOpt = dictRepository.findById(dictId);
        if (dictOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DictItem item = new DictItem();
        item.setDict(dictOpt.get());
        item.setLabel(req.label().trim());
        item.setValue(req.value().trim());
        item.setSort(req.sort() != null ? req.sort() : 0);
        item.setEnabled(req.enabled() != null ? req.enabled() : true);
        LocalDateTime now = LocalDateTime.now();
        item.setCreatedAt(now);
        item.setUpdatedAt(now);
        DictItem saved = dictItemRepository.save(item);
        return ResponseEntity.ok(toDictItemView(saved));
    }

    /**
     * 编辑字典条目（仅超级管理员）。
     *
     * @param itemId 条目 ID
     * @param req    条目请求体
     * @return 更新后的条目；不存在返回 404
     */
    @PutMapping("/items/{itemId}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.UPDATE_DICT_ITEM, targetType = "DICT_ITEM",
            description = "编辑字典条目")
    public ResponseEntity<AdminDictItemView> updateDictItem(
            @PathVariable("itemId") @Min(1) Long itemId,
            @Valid @RequestBody AdminDictItemRequest req) {
        SecurityUtils.getCurrentUserId();

        Optional<DictItem> itemOpt = dictItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        DictItem item = itemOpt.get();
        if (req.label() != null) {
            item.setLabel(req.label().trim());
        }
        if (req.value() != null) {
            item.setValue(req.value().trim());
        }
        if (req.sort() != null) {
            item.setSort(req.sort());
        }
        if (req.enabled() != null) {
            item.setEnabled(req.enabled());
        }
        item.setUpdatedAt(LocalDateTime.now());
        DictItem saved = dictItemRepository.save(item);
        return ResponseEntity.ok(toDictItemView(saved));
    }

    /**
     * 删除字典条目（仅超级管理员）。
     *
     * @param itemId 条目 ID
     * @return 204 删除成功；404 不存在
     */
    @DeleteMapping("/items/{itemId}")
    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Auditable(value = AuditOperation.DELETE_DICT_ITEM, targetType = "DICT_ITEM",
            description = "删除字典条目")
    public ResponseEntity<Void> deleteDictItem(@PathVariable("itemId") @Min(1) Long itemId) {
        SecurityUtils.getCurrentUserId();

        Optional<DictItem> itemOpt = dictItemRepository.findById(itemId);
        if (itemOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        dictItemRepository.delete(itemOpt.get());
        return ResponseEntity.noContent().build();
    }

    private AdminDictView toDictView(Dict dict) {
        long itemCount = dictItemRepository.findByDictIdOrderBySortAsc(dict.getId()).size();
        return new AdminDictView(
                dict.getId(), dict.getName(), dict.getCode(), dict.getDescription(), itemCount);
    }

    private AdminDictItemView toDictItemView(DictItem item) {
        return new AdminDictItemView(
                item.getId(), item.getLabel(), item.getValue(), item.getSort(), item.getEnabled());
    }
}

/**
 * 新增/编辑字典请求体。
 *
 * @param name        字典名称（必填）
 * @param code        字典编码（必填，唯一）
 * @param description 字典描述
 */
record AdminDictRequest(
        @NotBlank(message = "字典名称不能为空")
        @Size(min = 1, max = 64, message = "字典名称长度须为 1-64 字") String name,
        @NotBlank(message = "字典编码不能为空")
        @Size(min = 1, max = 64, message = "字典编码长度须为 1-64 字") String code,
        String description) {
}

/**
 * 字典条目请求体。
 *
 * @param label   条目显示名（必填）
 * @param value   条目值（必填）
 * @param sort    排序权重
 * @param enabled 是否启用
 */
record AdminDictItemRequest(
        @NotBlank(message = "条目显示名不能为空")
        @Size(min = 1, max = 64, message = "条目显示名长度须为 1-64 字") String label,
        @NotBlank(message = "条目值不能为空")
        @Size(min = 1, max = 64, message = "条目值长度须为 1-64 字") String value,
        Integer sort,
        Boolean enabled) {
}

/**
 * 字典视图。
 */
record AdminDictView(
        Long id,
        String name,
        String code,
        String description,
        long itemCount) {
}

/**
 * 字典条目视图。
 */
record AdminDictItemView(
        Long id,
        String label,
        String value,
        Integer sort,
        Boolean enabled) {
}

/**
 * 字典详情视图（含条目）。
 */
record AdminDictDetailView(
        Long id,
        String name,
        String code,
        String description,
        List<AdminDictItemView> items) {
}
