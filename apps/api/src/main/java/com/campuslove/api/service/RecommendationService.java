package com.campuslove.api.service;

import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.runtime.MockRuntimeState.CourseBlockData;
import com.campuslove.api.runtime.MockRuntimeState.RecommendationPoolUser;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * 规则驱动的推荐引擎（Day 3）。
 * 替代了原先的 AI stub，基于用户画像与课表空闲时间匹配。
 */
@Service("userRecommendationService")
public class RecommendationService {

  private final MockRuntimeState runtimeState;

  public RecommendationService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  /**
   * 获取今日推荐用户列表，按评分降序排列，返回前10名。
   * 当前用户默认使用 "南校区"、"广州"、"大三"、"电影" 作为基准画像。
   */
  public List<RecommendationResult> getTodayRecommendations(String userId) {
    // 当前用户的模拟画像（后续可从数据库/会话中读取）
    String mySchool = runtimeState.campusProfile().campusName();
    String myCity = runtimeState.campusProfile().city();
    String myGrade = runtimeState.basicProfile().grade();
    List<String> myTopics = List.of("电影", "音乐"); // 默认偏好话题
    List<CourseBlockData> mySchedule = runtimeState.courseBlocks();

    List<RecommendationPoolUser> pool = runtimeState.recommendationPool();

    List<RecommendationResult> results = new ArrayList<>();
    for (RecommendationPoolUser candidate : pool) {
      int score = computeScore(candidate, mySchool, myCity, myGrade, myTopics, mySchedule);
      results.add(new RecommendationResult(
          candidate.id(),
          candidate.nickname(),
          candidate.initials(),
          candidate.school(),
          candidate.city(),
          candidate.grade(),
          candidate.topics(),
          candidate.campusVerified(),
          score,
          buildReason(candidate, mySchool, myCity, myGrade, myTopics, mySchedule)
      ));
    }

    results.sort(Comparator.comparingInt(RecommendationResult::score).reversed());
    return results.subList(0, Math.min(10, results.size()));
  }

  /**
   * 评分规则（按优先级顺序）:
   * 1. 同一校区 +30
   * 2. 空闲时间重叠 +20
   * 3. 同城 +15
   * 4. 共享话题偏好 +10/个
   * 5. 不同年级（多样性加分） +5
   * 6. 已认证校园身份 +10
   */
  int computeScore(RecommendationPoolUser candidate,
                   String mySchool, String myCity, String myGrade,
                   List<String> myTopics, List<CourseBlockData> mySchedule) {
    int score = 0;

    // Rule 1: Same school → +30
    if (mySchool != null && mySchool.equals(candidate.school())) {
      score += 30;
    }

    // Rule 2: Overlapping free time → +20
    if (hasFreeTimeOverlap(mySchedule, candidate.scheduleBlocks())) {
      score += 20;
    }

    // Rule 3: Same city → +15
    if (myCity != null && myCity.equals(candidate.city())) {
      score += 15;
    }

    // Rule 4: Shared topic preferences → +10 per matched topic
    Set<String> candidateTopics = Set.copyOf(candidate.topics());
    for (String topic : myTopics) {
      if (candidateTopics.contains(topic)) {
        score += 10;
      }
    }

    // Rule 5: Different grade (variety bonus) → +5
    if (myGrade != null && !myGrade.equals(candidate.grade())) {
      score += 5;
    }

    // Rule 6: Verified campus status → +10
    if (candidate.campusVerified()) {
      score += 10;
    }

    return score;
  }

  /**
   * 判断两个用户在任意一天是否有重叠的空闲时段。
   * 空闲时段 = 全天12节课中未被课程占用的连续时间段。
   */
  private boolean hasFreeTimeOverlap(List<CourseBlockData> mySchedule,
                                     List<CourseBlockData> theirSchedule) {
    String[] days = {"周一", "周二", "周三", "周四", "周五"};
    for (String day : days) {
      boolean[] myBusy = new boolean[13];  // index 1-12
      boolean[] theirBusy = new boolean[13];
      for (CourseBlockData b : mySchedule) {
        if (b.dayOfWeek().equals(day)) {
          for (int p = b.startPeriod(); p <= b.endPeriod(); p++) {
            if (p >= 1 && p <= 12) myBusy[p] = true;
          }
        }
      }
      for (CourseBlockData b : theirSchedule) {
        if (b.dayOfWeek().equals(day)) {
          for (int p = b.startPeriod(); p <= b.endPeriod(); p++) {
            if (p >= 1 && p <= 12) theirBusy[p] = true;
          }
        }
      }
      // 只要在同一天有至少一节课双方都空闲，即视为重叠
      for (int p = 1; p <= 12; p++) {
        if (!myBusy[p] && !theirBusy[p]) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 生成可读的推荐理由，用于前端展示。
   */
  private String buildReason(RecommendationPoolUser candidate,
                             String mySchool, String myCity, String myGrade,
                             List<String> myTopics, List<CourseBlockData> mySchedule) {
    List<String> reasons = new ArrayList<>();

    if (mySchool != null && mySchool.equals(candidate.school())) {
      reasons.add("同校区");
    }
    if (hasFreeTimeOverlap(mySchedule, candidate.scheduleBlocks())) {
      reasons.add("空闲时间匹配");
    }
    if (myCity != null && myCity.equals(candidate.city())) {
      reasons.add("同城");
    }

    Set<String> candidateTopics = Set.copyOf(candidate.topics());
    List<String> shared = myTopics.stream()
        .filter(candidateTopics::contains)
        .toList();
    if (!shared.isEmpty()) {
      reasons.add("共同兴趣：" + String.join("、", shared));
    }

    if (candidate.campusVerified()) {
      reasons.add("已认证");
    }

    return reasons.isEmpty() ? "系统推荐" : String.join("，", reasons);
  }

  /**
   * 单条推荐结果。
   */
  public record RecommendationResult(
      String id,
      String nickname,
      String initials,
      String school,
      String city,
      String grade,
      List<String> topics,
      boolean campusVerified,
      int score,
      String reason
  ) {}
}