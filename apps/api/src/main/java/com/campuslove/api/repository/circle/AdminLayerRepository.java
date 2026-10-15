package com.campuslove.api.repository.circle;

import com.campuslove.api.entity.circle.AdminLayer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface AdminLayerRepository extends JpaRepository<AdminLayer, Long> {

    List<AdminLayer> findByAdminId(Long adminId);

    List<AdminLayer> findByCircleLayerId(Long circleLayerId);

    /**
     * 一次取回某管理员绑定的全部圈层路径（circle_path）。
     *
     * <p>{@link AdminScopeService#currentPrefixes()} 需要「给定 admin 的全部可见前缀」，
     * 而既有 finder 只能按 admin 取回绑定行（再逐个解析 circleLayerId→path，N+1）或按
     * layer 取回。本查询用 JPQL 直接联 {@code CircleLayer} 把路径投影出来，一次拿全。</p>
     *
     * <p>注意：仅返回能解析到 circle_layer 行的路径；若绑定指向已删除的圈层节点，
     * 内连接天然丢弃该条（数据不一致时倾向少给权限，fail-closed）。</p>
     *
     * @param adminId 管理员用户 ID
     * @return 该管理员绑定的圈层路径列表（可能为空）
     */
    @Query("SELECT cl.circlePath FROM AdminLayer al, CircleLayer cl "
            + "WHERE al.circleLayerId = cl.id AND al.adminId = :adminId")
    List<String> findCirclePathsByAdminId(@Param("adminId") Long adminId);

    boolean existsByAdminIdAndCircleLayerId(Long adminId, Long circleLayerId);

    @Modifying
    @Transactional
    @Query("DELETE FROM AdminLayer a WHERE a.adminId = :adminId")
    void deleteAllByAdminId(@Param("adminId") Long adminId);

    @Modifying
    @Transactional
    @Query("DELETE FROM AdminLayer a WHERE a.circleLayerId = :layerId")
    void deleteAllByCircleLayerId(@Param("layerId") Long layerId);
}
