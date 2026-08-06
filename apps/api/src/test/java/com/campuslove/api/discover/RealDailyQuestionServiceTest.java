package com.campuslove.api.discover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.repository.DailyAnswerRepository;
import com.campuslove.api.repository.DailyQuestionRepository;
import com.campuslove.api.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/**
 * RealDailyQuestionService 单元测试（缺陷修复：每日一问无数据时 500 → 404）。
 */
class RealDailyQuestionServiceTest {

    private DailyQuestionRepository dailyQuestionRepository;
    private DailyAnswerRepository dailyAnswerRepository;
    private UserRepository userRepository;
    private RealDailyQuestionService service;

    @BeforeEach
    void setUp() {
        dailyQuestionRepository = mock(DailyQuestionRepository.class);
        dailyAnswerRepository = mock(DailyAnswerRepository.class);
        userRepository = mock(UserRepository.class);
        service = new RealDailyQuestionService(dailyQuestionRepository, dailyAnswerRepository, userRepository);
    }

    /**
     * 缺陷修复：当日与历史均无每日一问记录时，
     * 应抛 ResourceNotFoundException（404 友好提示），而非 RuntimeException（兜底 500）。
     */
    @Test
    void getTodayQuestion_noQuestionAnywhere_throwsResourceNotFound() {
        when(dailyQuestionRepository.findByQuestionDate(any(LocalDate.class))).thenReturn(Optional.empty());
        Page<com.campuslove.api.entity.DailyQuestion> emptyPage =
                new PageImpl<>(List.<com.campuslove.api.entity.DailyQuestion>of());
        when(dailyQuestionRepository.findAll(any(Pageable.class))).thenReturn(emptyPage);

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> service.getTodayQuestion(1L));

        assertEquals("暂无每日一问记录，请稍后再试", ex.getMessage());
    }
}
