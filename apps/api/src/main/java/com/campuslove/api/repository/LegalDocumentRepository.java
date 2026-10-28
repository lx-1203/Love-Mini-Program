package com.campuslove.api.repository;

import com.campuslove.api.entity.LegalDocument;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 法律文本 Repository。
 */
public interface LegalDocumentRepository extends JpaRepository<LegalDocument, Long> {

    Optional<LegalDocument> findFirstByDocTypeAndStatusOrderByEffectiveAtDescIdDesc(String docType, String status);

    List<LegalDocument> findByStatusOrderByDocTypeAsc(String status);

    List<LegalDocument> findAllByOrderByDocTypeAscIdAsc();
}
