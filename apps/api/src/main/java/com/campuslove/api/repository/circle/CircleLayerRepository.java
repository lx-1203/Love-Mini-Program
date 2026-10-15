package com.campuslove.api.repository.circle;

import com.campuslove.api.entity.circle.CircleLayer;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CircleLayerRepository extends JpaRepository<CircleLayer, Long> {

    /**
     * 按层级查圈层。
     *
     * <p>必须用实体图把父链一起取回：{@code CircleLayer.parent} 是 LAZY，而本应用未开启
     * open-in-view，Jackson 在会话关闭后序列化父节点代理会抛
     * "could not initialize proxy - no Session"（500）。只查单层时父节点必然不在持久化
     * 上下文里。注意实体图不是递归的——只写 {@code parent} 会让 L3 行的祖父节点
     * （L1 公司）仍是未初始化代理，报错只是从 #2 挪到 #1。本树按规格固定三级
     * （L1 公司 / L2 区域 / L3 学校），故取两层父链即可覆盖全部情形。</p>
     */
    @EntityGraph(attributePaths = { "parent", "parent.parent" })
    List<CircleLayer> findByLevelOrderBySortAsc(Integer level);

    List<CircleLayer> findByParentIdOrderBySortAsc(Long parentId);

    /**
     * 按「层级 + 圈层名」精确取一个节点 —— 校区名 → 圈层路径的唯一权威映射入口。
     *
     * <p>两处调用者共用（用户选定校区时回填 {@code users.circle_path}、后台建号带校区时同样回填），
     * 所以规则只此一份：未挂树的校区返回空，调用方按「未归属」处理，<b>不允许</b>猜一个大区兜底。</p>
     */
    java.util.Optional<CircleLayer> findFirstByLevelAndName(Integer level, String name);

    @EntityGraph(attributePaths = { "parent", "parent.parent" })
    List<CircleLayer> findByCirclePathStartingWithOrderBySortAsc(String prefix);

    @EntityGraph(attributePaths = { "parent", "parent.parent" })
    @Query("SELECT c FROM CircleLayer c WHERE c.circlePath LIKE CONCAT(:path, '%') ORDER BY c.sort ASC")
    List<CircleLayer> findAllDescendants(@Param("path") String path);

    @EntityGraph(attributePaths = { "parent", "parent.parent" })
    List<CircleLayer> findAllByOrderBySortAsc();
}
