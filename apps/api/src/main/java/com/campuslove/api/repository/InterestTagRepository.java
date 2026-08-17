package com.campuslove.api.repository;

import com.campuslove.api.entity.InterestTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterestTagRepository extends JpaRepository<InterestTag, Long> {
    List<InterestTag> findByEnabledTrueOrderByIdAsc();
}
