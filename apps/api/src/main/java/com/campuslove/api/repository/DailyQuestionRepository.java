package com.campuslove.api.repository;

import com.campuslove.api.entity.DailyQuestion;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 每日一问问题 Repository。
 * 提供基于日期的查询方法。
 */
public interface DailyQuestionRepository extends JpaRepository<DailyQuestion, Long> {

    /**
     * 根据问题日期查询问题。
     *
     * @param questionDate 问题日期
     * @return 匹配的问题（可能为空）
     */
    Optional<DailyQuestion> findByQuestionDate(LocalDate questionDate);
}
