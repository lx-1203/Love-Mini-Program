package com.campuslove.api.repository;

import com.campuslove.api.entity.TempChatMediaHold;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** 临时媒体举报保留仓库（2026-10-28）。 */
@Repository
public interface TempChatMediaHoldRepository extends JpaRepository<TempChatMediaHold, Long> {

    Optional<TempChatMediaHold> findByMediaAssetId(Long mediaAssetId);
}
