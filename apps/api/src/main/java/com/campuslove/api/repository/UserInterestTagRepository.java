package com.campuslove.api.repository;

import com.campuslove.api.entity.UserInterestTag;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInterestTagRepository extends JpaRepository<UserInterestTag, Long> {
    List<UserInterestTag> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
