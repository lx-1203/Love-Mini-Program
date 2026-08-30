package com.campuslove.api.repository.circle;

import com.campuslove.api.entity.circle.CircleLayer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CircleLayerRepository extends JpaRepository<CircleLayer, Long> {

    List<CircleLayer> findByLevelOrderBySortAsc(Integer level);

    List<CircleLayer> findByParentIdOrderBySortAsc(Long parentId);

    List<CircleLayer> findByCirclePathStartingWithOrderBySortAsc(String prefix);

    @Query("SELECT c FROM CircleLayer c WHERE c.circlePath LIKE CONCAT(:path, '%') ORDER BY c.sort ASC")
    List<CircleLayer> findAllDescendants(@Param("path") String path);

    List<CircleLayer> findAllByOrderBySortAsc();
}
