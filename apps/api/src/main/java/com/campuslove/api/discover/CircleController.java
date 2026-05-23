package com.campuslove.api.discover;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 话题圈 / 兴趣圈控制器。
 * 提供圈子列表、加入/退出、话题浏览与发布、回复浏览与发布等接口。
 */
@RestController
@RequestMapping("/api/circles")
public class CircleController {

  private final CircleService circleService;

  public CircleController(CircleService circleService) {
    this.circleService = circleService;
  }

  // ---------- 圈子 ----------

  /**
   * 获取所有兴趣圈列表。
   * GET /api/circles
   */
  @GetMapping
  public List<CircleView> getCircles(
      @RequestParam(name = "userId", required = false) Long userId) {
    return circleService.getCircles(userId);
  }

  /**
   * 加入圈子。
   * POST /api/circles/{id}/join
   */
  @PostMapping("/{id}/join")
  public CircleMembershipView joinCircle(
      @PathVariable("id") Long circleId,
      @RequestBody JoinCircleRequest request) {
    return circleService.joinCircle(request.userId(), circleId);
  }

  /**
   * 退出圈子。
   * DELETE /api/circles/{id}/join
   */
  @DeleteMapping("/{id}/join")
  public CircleMembershipView leaveCircle(
      @PathVariable("id") Long circleId,
      @RequestBody JoinCircleRequest request) {
    return circleService.leaveCircle(request.userId(), circleId);
  }

  // ---------- 话题 ----------

  /**
   * 获取指定圈子的话题列表。
   * GET /api/circles/{id}/topics
   */
  @GetMapping("/{id}/topics")
  public Page<CircleTopicView> getTopics(
      @PathVariable("id") Long circleId,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size);
    return circleService.getTopics(circleId, pageable);
  }

  /**
   * 在指定圈子发布新话题。
   * POST /api/circles/{id}/topics
   */
  @PostMapping("/{id}/topics")
  public CircleTopicView createTopic(
      @PathVariable("id") Long circleId,
      @Valid @RequestBody CreateTopicRequest request) {
    return circleService.createTopic(circleId, request.authorId(), request.title(),
        request.content(), request.images());
  }

  /**
   * 获取话题详情。
   * GET /api/circles/topics/{id}
   */
  @GetMapping("/topics/{id}")
  public CircleTopicView getTopicDetail(@PathVariable("id") Long topicId) {
    return circleService.getTopicDetail(topicId);
  }

  // ---------- 回复 ----------

  /**
   * 获取指定话题的回复列表。
   * GET /api/circles/topics/{id}/replies
   */
  @GetMapping("/topics/{id}/replies")
  public Page<CircleReplyView> getReplies(
      @PathVariable("id") Long topicId,
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size);
    return circleService.getReplies(topicId, pageable);
  }

  /**
   * 对指定话题发表回复。
   * POST /api/circles/topics/{id}/replies
   */
  @PostMapping("/topics/{id}/replies")
  public CircleReplyView createReply(
      @PathVariable("id") Long topicId,
      @Valid @RequestBody CreateReplyRequest request) {
    return circleService.replyToTopic(topicId, request.authorId(), request.content());
  }

  // ---------- 精选话题 ----------

  /**
   * 获取所有圈子的精选话题（用于村口"兴趣"分类）。
   * GET /api/circles/featured
   */
  @GetMapping("/featured")
  public Page<CircleTopicView> getFeaturedTopics(
      @RequestParam(name = "page", required = false, defaultValue = "0") int page,
      @RequestParam(name = "size", required = false, defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, size);
    return circleService.getFeaturedTopics(pageable);
  }
}

// ---------- 视图 / 请求模型 ----------

/**
 * 兴趣圈列表项视图。
 */
record CircleView(
    Long id,
    String name,
    String icon,
    String description,
    int memberCount,
    boolean isJoined
) {
}

/**
 * 圈子加入/退出结果视图。
 */
record CircleMembershipView(
    Long circleId,
    boolean joined,
    int memberCount
) {
}

/**
 * 圈子话题视图。
 */
record CircleTopicView(
    Long id,
    Long circleId,
    String circleName,
    Long authorId,
    String authorName,
    String title,
    String contentPreview,
    List<String> images,
    int replyCount,
    boolean isPinned,
    LocalDateTime createdAt
) {
}

/**
 * 圈子回复视图。
 */
record CircleReplyView(
    Long id,
    Long topicId,
    Long authorId,
    String authorName,
    String content,
    LocalDateTime createdAt
) {
}

/**
 * 加入/退出圈子请求体。
 */
record JoinCircleRequest(
    Long userId
) {
}

/**
 * 发布话题请求体。
 */
record CreateTopicRequest(
    Long authorId,
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 5000) String content,
    List<String> images
) {
}

/**
 * 发表回复请求体。
 */
record CreateReplyRequest(
    Long authorId,
    @NotBlank @Size(max = 1000) String content
) {
}
