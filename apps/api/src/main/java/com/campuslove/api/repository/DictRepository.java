package com.campuslove.api.repository;

import com.campuslove.api.entity.Dict;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 数据字典 Repository。
 */
public interface DictRepository extends JpaRepository<Dict, Long> {

    Optional<Dict> findByCode(String code);

    boolean existsByCode(String code);
}
