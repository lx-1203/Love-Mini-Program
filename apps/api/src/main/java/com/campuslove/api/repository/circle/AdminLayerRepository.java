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
