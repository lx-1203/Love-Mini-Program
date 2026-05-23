package com.campuslove.api.discover;

import java.time.LocalDate;

/**
 * 每日一问问题视图。
 */
public record DailyQuestionView(
    Long id,
    LocalDate questionDate,
    String questionText,
    boolean hasAnswered,
    /** 问题分类 */
    String category,
    /** 回答数量 */
    int answerCount
) {}
