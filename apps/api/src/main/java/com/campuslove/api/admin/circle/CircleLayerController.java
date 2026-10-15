package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.circle.CircleLayer;
import com.campuslove.api.repository.circle.CircleLayerRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 三级圈层管理 Controller（Frame 01/04/05/08/09 对应端点）。
 * 仅 real profile 激活。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/circle-layers")
// 圈层结构（名称/层级/路径）对全体后台角色可读：校区管理员与审核员要在列表页按圈层
// 下钻筛选，读不到树就等于该功能对他们不存在。真正的写操作逐个方法收紧到 SUPER_ADMIN。
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'AUDITOR')")
public class CircleLayerController {

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
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("圈层不存在: id=" + id));
        return ApiResponse.ok(circleLayerRepository.findAllDescendants(layer.getCirclePath()));
    }

    /** 创建新圈层（仅超级管理员：改树形结构等于改所有人的数据域） */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CircleLayer> create(@RequestBody CircleLayer layer) {
        // 注意：circle_path 不会自动生成，必须由调用方给出（列 NOT NULL 且唯一），
        // 形如 C1/R1/S1；parent 需以嵌套对象 {"parent":{"id":n}} 传入，实体没有 parentId 字段。
        CircleLayer saved = circleLayerRepository.save(layer);
        return ApiResponse.ok(saved);
    }

    /** 更新圈层（仅超级管理员） */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<CircleLayer> update(@PathVariable Long id, @RequestBody CircleLayer layer) {
        layer.setId(id);
        return ApiResponse.ok(circleLayerRepository.save(layer));
    }

    /** 删除圈层（有子节点时拒绝；仅超级管理员） */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        var layer = circleLayerRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("圈层不存在: id=" + id));
        var descendants = circleLayerRepository.findByCirclePathStartingWithOrderBySortAsc(layer.getCirclePath());
        if (descendants.size() > 1) {
            throw new IllegalArgumentException("该圈层下有子圈层，无法删除");
        }
        circleLayerRepository.deleteById(id);
        return ApiResponse.ok(null);
    }
}
