package com.campuslove.api.discover;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.wallet.InsufficientBalanceException;
import com.campuslove.api.wallet.WalletService;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import com.campuslove.api.growth.AppConfigService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 推荐控制器。
 * 提供讨论推荐、活动推荐、推荐偏好、人物推荐等 API。
 * 活动详情和报名功能已迁移至 ActivityController。
 * 用户ID从JWT认证上下文中获取，不再从请求参数获取。
 */
@RestController
@RequestMapping("/api/v1")
public class RecommendationController {

  /** 身高筛选下限（厘米） */
  private static final int MIN_HEIGHT_CM = 100;

  /** 身高筛选上限（厘米） */
  private static final int MAX_HEIGHT_CM = 250;

  /** 年龄筛选下限（岁） */
  private static final int MIN_AGE = 18;

  /** 年龄筛选上限（岁） */
  private static final int MAX_AGE = 60;

  /** educationLevel 合法取值 */
  private static final Set<String> VALID_EDUCATION_LEVELS =
      Set.of("high_school", "bachelor", "master", "phd");

  /** relationshipStatus 合法取值 */
  private static final Set<String> VALID_RELATIONSHIP_STATUS =
      Set.of("never", "married_before", "divorced", "widowed");

  private final RecommendationService recommendationService;

  /** 推荐配额服务（P0-24/P0-31 修复：配额查询端点）。real profile 注入；mock 为 null。 */
  @org.springframework.beans.factory.annotation.Autowired(required = false)
  private com.campuslove.api.growth.RecommendQuotaService recommendQuotaService;

  /** 应用配置服务（B6：后台开关执行点）。real profile 注入；mock 为 null。 */
  @Autowired(required = false)
  private AppConfigService appConfigService;

  /**
   * 推荐排序器（R4-00314：悄悄话文案解析）。real profile 注入；mock 为 null。
   * 仅解锁接口（GET /recommendations/{userId}/whisper）使用。
   */
  @Autowired(required = false)
  private RecommendationRanker recommendationRanker;

  /** 钱包服务（R4-00314：悄悄话解锁扣费）。real profile 注入；mock 为 null。 */
  @Autowired(required = false)
  private WalletService walletService;

  /** 钱包流水 Repository（R4-00314：悄悄话/私信解锁状态查询）。real profile 注入；mock 为 null。 */
  @Autowired(required = false)
  private WalletTransactionLogRepository walletTransactionLogRepository;

  /** 用户 Repository（2026-08-09 他人主页详情接口：目标用户存在性校验与当前用户上下文）。 */
  @Autowired(required = false)
  private com.campuslove.api.repository.UserRepository userRepository;

  /** 校区资料 Repository（2026-08-09 他人主页详情接口：当前用户校区/院系上下文）。 */
  @Autowired(required = false)
  private com.campuslove.api.repository.UserCampusProfileRepository userCampusProfileRepository;

  /** 圈子成员 Repository（2026-08-09 他人主页详情接口：当前用户圈子上下文）。 */
  @Autowired(required = false)
  private com.campuslove.api.repository.CircleMembershipRepository circleMembershipRepository;

  /**
   * 悄悄话解锁单价（分）（R4-00314，配置 app.unlock-price.whisper，默认 200 分 = 2 元，
   * 与客户端定价镜像 UNLOCK_COST_YUAN.WHISPER 对齐）。服务端定价，客户端仅展示提示。
   */
  @Value("${app.unlock-price.whisper:200}")
  private int whisperPriceCents;

  public RecommendationController(RecommendationService recommendationService) {
    this.recommendationService = recommendationService;
  }

  /**
   * 查询当前用户今日推荐配额使用情况。
   * GET /api/recommendations/quota
   *
   * <p>返回 {dailyLimit, used, remaining}，供前端在推荐列表为空时区分
   * 「今日次数已用完」与「暂无推荐」，避免配额耗尽后页面空白且无提示。</p>
   */
  @GetMapping("/recommendations/quota")
  public java.util.Map<String, Object> getRecommendationQuota() {
    Long userId = SecurityUtils.getCurrentUserId();
    if (recommendQuotaService == null) {
      // mock / 服务未注入：返回无限制语义
      return java.util.Map.of("dailyLimit", -1, "used", 0, "remaining", -1);
    }
    int dailyLimit = recommendQuotaService.getDailyQuota(userId);
    int used = recommendQuotaService.getUsedCount(userId);
    return java.util.Map.of(
        "dailyLimit", dailyLimit,
        "used", used,
        "remaining", Math.max(0, dailyLimit - used));
  }

  /**
   * 获取讨论推荐列表。
   * GET /api/recommendations/discussions
   *
   * <p>返回基于热度与兴趣匹配的讨论推荐，供首页"讨论"模块展示。</p>
   *
   * @return 讨论推荐视图列表
   */
  @GetMapping("/recommendations/discussions")
  public List<DiscussionRecommendationView> getDiscussions() {
    return recommendationService.getDiscussions();
  }

  /**
   * 获取活动推荐列表。
   * GET /api/recommendations/activities
   *
   * <p>返回基于用户偏好与报名热度的活动推荐，供首页"活动"模块展示。</p>
   *
   * @return 活动推荐视图列表
   */
  @GetMapping("/recommendations/activities")
  public List<ActivityRecommendationView> getActivities() {
    return recommendationService.getActivities();
  }

  /**
   * 获取当前用户的推荐偏好设置。
   * GET /api/recommendations/preferences
   *
   * <p>返回用户已保存的推荐偏好（如推荐时间、范围、校园优先级）。
   * 未设置过偏好的用户返回默认值。</p>
   *
   * @return 推荐偏好视图
   */
  @GetMapping("/recommendations/preferences")
  public RecommendationPreferencesView getPreferences() {
    // infra R2-00202: 原实现返回固定默认值（与 /preferences/me 不一致），改为按当前用户返回真实偏好
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.getPreferences(userId);
  }

  /**
   * 更新当前用户的推荐偏好设置。
   * PUT /api/recommendations/preferences
   *
   * <p>仅 USER 角色可调用。更新成功后立即生效，后续推荐结果按新偏好计算。</p>
   *
   * @param prefs 推荐偏好视图（含 dailyNotifyTime / scope / campusPriority）
   * @return 更新后的推荐偏好视图
   */
  @PutMapping("/recommendations/preferences")
  @PreAuthorize("hasRole('USER')")
  public RecommendationPreferencesView updatePreferences(@Valid @RequestBody RecommendationPreferencesView prefs) {
    // infra R2-00203: 原实现调用 deprecated updatePreferences（恒抛 UnsupportedOperationException，端点 100% 500），
    // 改为调用带 userId 的真实保存逻辑
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.savePreferences(
        userId, prefs.dailyNotifyTime(), prefs.scope(), prefs.campusPriority());
  }

  // ---- Phase 2 新增：人物推荐端点 ----

  /**
   * 获取推荐人物列表。
   * GET /api/recommendations/people （别名：GET /api/recommendations）
   *
   * <p>缺陷修复：前端 real 模式实际调用 {@code GET /api/v1/recommendations}，
   * 原后端仅提供 {@code /recommendations/people}，此处为同一方法增加别名路由，
   * 两个路径共享相同逻辑（含全部可选筛选参数）。</p>
   *
   * <p>Phase B - Task B2 扩展：支持以下查询参数（均为可选）：</p>
   * <ul>
   *   <li>{@code heightMin} / {@code heightMax} —— 身高范围（闭区间）</li>
   *   <li>{@code educationLevel} —— 学历多选（逗号分隔，如 bachelor,master）</li>
   *   <li>{@code relationshipStatus} —— 感情状态多选（逗号分隔）</li>
   *   <li>{@code hometownProvince} / {@code hometownCity} —— 籍贯省/市</li>
   *   <li>{@code futureCity} —— 未来定居城市</li>
   *   <li>{@code keyword} —— 模糊匹配 nickname/bio/interestTags</li>
   * </ul>
   * <p>无参数时返回全部推荐（向后兼容）。</p>
   */
  @GetMapping({"/recommendations/people", "/recommendations"})
  public List<RecommendedPersonView> getRecommendations(
          @RequestParam(value = "heightMin", required = false) Integer heightMin,
          @RequestParam(value = "heightMax", required = false) Integer heightMax,
          @RequestParam(value = "educationLevel", required = false) String educationLevel,
          @RequestParam(value = "relationshipStatus", required = false) String relationshipStatus,
          @RequestParam(value = "hometownProvince", required = false) String hometownProvince,
          @RequestParam(value = "hometownCity", required = false) String hometownCity,
          @RequestParam(value = "futureCity", required = false) String futureCity,
          @RequestParam(value = "keyword", required = false) String keyword,
          @RequestParam(value = "ageMin", required = false) Integer ageMin,
          @RequestParam(value = "ageMax", required = false) Integer ageMax) {
    // B6：后台关闭匹配/推荐功能（app_switch.match_open / recommend_open=false）→ 返回空列表，
    // 客户端按 app-config 开关显示「匹配暂时关闭」空态，前后端行为一致
    if (appConfigService != null && !appConfigService.isSwitchEnabled(AppConfigService.SWITCH_MATCH_OPEN)) {
      return java.util.Collections.emptyList();
    }
    if (appConfigService != null && !appConfigService.isSwitchEnabled(AppConfigService.SWITCH_RECOMMEND_OPEN)) {
      return java.util.Collections.emptyList();
    }
    // infra R2-00204: 身高范围校验，拒绝负数/倒挂区间
    if (heightMin != null && (heightMin < MIN_HEIGHT_CM || heightMin > MAX_HEIGHT_CM)) {
      throw new IllegalArgumentException(
          "heightMin 必须在 " + MIN_HEIGHT_CM + "-" + MAX_HEIGHT_CM + " 厘米之间");
    }
    if (heightMax != null && (heightMax < MIN_HEIGHT_CM || heightMax > MAX_HEIGHT_CM)) {
      throw new IllegalArgumentException(
          "heightMax 必须在 " + MIN_HEIGHT_CM + "-" + MAX_HEIGHT_CM + " 厘米之间");
    }
    if (heightMin != null && heightMax != null && heightMin > heightMax) {
      throw new IllegalArgumentException(ErrorMessages.HEIGHT_MIN_GT_MAX);
    }
    // V2026.08.08.0015: 年龄范围校验（18-60，拒绝倒挂），接通前端年龄筛选
    if (ageMin != null && (ageMin < MIN_AGE || ageMin > MAX_AGE)) {
      throw new IllegalArgumentException(ErrorMessages.AGE_MIN_RANGE_PREFIX + MIN_AGE + "-" + MAX_AGE + " 岁之间");
    }
    if (ageMax != null && (ageMax < MIN_AGE || ageMax > MAX_AGE)) {
      throw new IllegalArgumentException(ErrorMessages.AGE_MAX_RANGE_PREFIX + MIN_AGE + "-" + MAX_AGE + " 岁之间");
    }
    if (ageMin != null && ageMax != null && ageMin > ageMax) {
      throw new IllegalArgumentException(ErrorMessages.AGE_MIN_GT_MAX);
    }
    // infra R2-00205: 教育/感情状态枚举白名单校验，非法值直接 400 而非被静默过滤
    validateEnumFilter("educationLevel", educationLevel, VALID_EDUCATION_LEVELS);
    validateEnumFilter("relationshipStatus", relationshipStatus, VALID_RELATIONSHIP_STATUS);

    RecommendationFilter filter = new RecommendationFilter(
            heightMin,
            heightMax,
            parseCsvToSet(educationLevel),
            parseCsvToSet(relationshipStatus),
            hometownProvince,
            hometownCity,
            futureCity,
            keyword,
            ageMin,
            ageMax
    );
    // 2026-08-09 免登录可逛：匿名用户返回中性排序的通用推荐（无个性化上下文），
    // 不调用 SecurityUtils.getCurrentUserId（匿名会抛 401）
    if (!SecurityUtils.isAuthenticated()) {
      return PrivacyFieldFilter.sanitize(recommendationService.getRecommendationsForGuest(filter));
    }
    Long userId = SecurityUtils.getCurrentUserId();
    // Task 15.2：隐私字段过滤白名单校验，确保推荐列表不返回手机号/身份证/真实姓名
    // RecommendedPersonView 为 record，字段在编译期固定，本调用为防御性校验：
    // 若未来有人向 record 误添加敏感字段，sanitize 会抛 IllegalStateException，
    // 由 GlobalExceptionHandler 转 500，强制运维修复
    return PrivacyFieldFilter.sanitize(recommendationService.getRecommendations(userId, filter));
  }

  /**
   * 将逗号分隔的字符串解析为去重、去空白的 Set。
   * null 或空字符串返回空 Set。
   */
  private Set<String> parseCsvToSet(String csv) {
    if (csv == null || csv.isBlank()) {
      return java.util.Collections.emptySet();
    }
    return Arrays.stream(csv.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  /**
   * 校验逗号分隔的枚举筛选参数是否全部在合法取值内。
   *
   * @param paramName   参数名（用于错误消息）
   * @param csv         逗号分隔的原始参数值（可空）
   * @param validValues 合法取值集合
   */
  private void validateEnumFilter(String paramName, String csv, Set<String> validValues) {
    if (csv == null || csv.isBlank()) {
      return;
    }
    for (String v : csv.split(",")) {
      String trimmed = v.trim();
      if (!validValues.contains(trimmed)) {
        throw new IllegalArgumentException(
            paramName + " 取值非法: " + trimmed + ", 仅支持 " + String.join("/", validValues));
      }
    }
  }

  /**
   * 获取推荐偏好设置。
   * GET /api/recommendations/preferences/me
   */
  @GetMapping("/recommendations/preferences/me")
  public RecommendationPreferencesView getPreferencesByUserId() {
    Long userId = SecurityUtils.getCurrentUserId();
    return recommendationService.getPreferences(userId);
  }

  /**
   * 保存推荐偏好设置。
   * PUT /api/recommendations/preferences/me
   *
   * <p>A-40 修复：允许部分字段更新（PATCH 语义兼容）——请求中缺失的字段
   * 读取现有偏好保持原值后整体保存，仅对传入字段做非空/合法值校验；
   * 从未保存过偏好的用户按默认值合并（12:00 / campus_first / true）。</p>
   */
  @PutMapping("/recommendations/preferences/me")
  @PreAuthorize("hasRole('USER')")
  public RecommendationPreferencesView savePreferences(
          @Valid @RequestBody SavePreferencesRequest request) {
    Long userId = SecurityUtils.getCurrentUserId();
    // 先读现有偏好（未保存时返回默认值），再合并传入字段，保持缺失字段原值
    RecommendationPreferencesView existing = recommendationService.getPreferences(userId);
    String preferredTime = request.preferredTime() != null
            ? request.preferredTime() : existing.dailyNotifyTime();
    String scope = request.scope() != null
            ? request.scope() : existing.scope();
    if (!UserPreferenceCalculator.VALID_SCOPES.contains(scope)) {
      throw new IllegalArgumentException(
          "推荐范围(scope)无效，有效值: campus_first, city, unlimited，当前值: " + scope);
    }
    Boolean campusPriority = request.campusPriority() != null
            ? request.campusPriority() : existing.campusPriority();
    return recommendationService.savePreferences(userId, preferredTime, scope, campusPriority);
  }

  /**
   * 获取推荐历史。
   * GET /api/recommendations/history
   */
  @GetMapping("/recommendations/history")
  public List<RecommendedPersonView> getHistory() {
    Long userId = SecurityUtils.getCurrentUserId();
    // Task 15.2：与 getRecommendations 一致，对历史列表应用隐私字段过滤校验
    return PrivacyFieldFilter.sanitize(recommendationService.getHistory(userId));
  }

  // ---- R4-00314：悄悄话解锁链路（付费可见内容服务端保护） ----

  /**
   * 获取他人主页详情。
   * GET /api/v1/recommendations/{userId}/profile
   *
   * <p>2026-08-09 喜欢/访客闭环完善：前端从通知/喜欢/访客列表点击进入他人主页时，
   * 需要展示对方完整公开资料（昵称/头像/学校/年龄/身高/职业/兴趣标签/MBTI/
   * 性格标签/期待画像/动态预览等）。本接口复用 {@link RecommendedPersonView}
   * 与 {@link RecommendationRanker#toRecommendedPersonView} 的单用户组装逻辑，
   * 并以当前登录用户为上下文计算「同校/同专业/共同圈子」，返回前经
   * {@link PrivacyFieldFilter#sanitize} 敏感字段白名单过滤。</p>
   *
   * <p>访客记录由前端查看主页时显式调用 {@code POST /api/matches/visit} 写入，
   * 本接口只读不写，避免 GET 产生副作用。</p>
   *
   * @param targetUserId 目标用户 ID
   * @return 他人主页公开资料视图
   */
  @GetMapping("/recommendations/{userId}/profile")
  @PreAuthorize("hasRole('USER')")
  public RecommendedPersonView getOtherUserProfile(@PathVariable("userId") Long targetUserId) {
    if (targetUserId == null || targetUserId <= 0) {
      throw new IllegalArgumentException(ErrorMessages.TARGET_USER_ID_POSITIVE);
    }
    if (userRepository == null || recommendationRanker == null) {
      // mock profile：推荐排序器不可用，他人主页接口无数据可组装
      throw new UnsupportedOperationException("他人主页详情接口仅在 real 模式可用");
    }
    // 目标用户存在性校验
    com.campuslove.api.entity.User target = userRepository.findById(targetUserId)
        .orElseThrow(() -> new IllegalArgumentException("用户不存在: " + targetUserId));

    // 当前用户上下文（用于同校/同专业/共同圈子计算）
    Long currentUserId = SecurityUtils.getCurrentUserId();
    String myCampus = "";
    String myDepartment = "";
    Set<Long> myCircleIds = Set.of();
    if (currentUserId != null) {
      com.campuslove.api.entity.UserCampusProfile meCampus =
          userCampusProfileRepository != null
              ? userCampusProfileRepository.findByUserId(currentUserId).orElse(null)
              : null;
      if (meCampus != null) {
        myCampus = meCampus.getCampusName() != null ? meCampus.getCampusName() : "";
        myDepartment = meCampus.getDepartmentName() != null ? meCampus.getDepartmentName() : "";
      }
      if (circleMembershipRepository != null) {
        myCircleIds = circleMembershipRepository.findByUserId(currentUserId).stream()
            .map(m -> m.getCircle().getId())
            .collect(Collectors.toSet());
      }
    }

    RecommendedPersonView view = recommendationRanker.toRecommendedPersonView(
        target, myCampus, myDepartment, myCircleIds);
    // sanitize 仅接受列表：单对象包装为单元素列表复用敏感字段白名单校验（与列表路径语义一致）
    return PrivacyFieldFilter.sanitize(List.of(view)).get(0);
  }

  /**
   * 查询悄悄话内容（付费解锁后可见）。
   * GET /api/v1/recommendations/{userId}/whisper
   *
   * <p>R4-00314：悄悄话文案不再随推荐列表下发，本端点按解锁状态返回：
   * 当前用户已为该目标付费解锁（wallet_transaction_log 存在
   * MESSAGE_UNLOCK / WHISPER_UNLOCK 流水）时返回完整文案；未解锁返回
   * {@code {unlocked:false, whisper:null}}，不泄露付费内容。</p>
   *
   * @param targetUserId 目标用户 ID
   * @return 悄悄话视图（unlocked / whisper / balanceCents）
   */
  @GetMapping("/recommendations/{userId}/whisper")
  @PreAuthorize("hasRole('USER')")
  public WhisperUnlockView getWhisper(@PathVariable("userId") Long targetUserId) {
    if (targetUserId == null || targetUserId <= 0) {
      throw new IllegalArgumentException(ErrorMessages.TARGET_USER_ID_POSITIVE);
    }
    Long currentUserId = SecurityUtils.getCurrentUserId();
    if (isMessageOrWhisperUnlocked(currentUserId, targetUserId)) {
      String whisper = recommendationRanker != null
              ? recommendationRanker.resolveWhisper(targetUserId) : null;
      return new WhisperUnlockView(true, whisper, balanceCents(currentUserId));
    }
    return new WhisperUnlockView(false, null, balanceCents(currentUserId));
  }

  /**
   * 付费解锁悄悄话并返回内容（幂等）。
   * POST /api/v1/recommendations/{userId}/whisper/unlock
   *
   * <p>R4-00314：悄悄话扣费链路消费方——按服务端定价
   * （{@code app.unlock-price.whisper}，默认 200 分 = 2 元）扣减钱包并写入
   * WHISPER_UNLOCK 流水（orderId={@code UNLOCK-WHISPER-{targetUserId}}，
   * order_id 唯一索引保证同一目标只扣一次费），随后返回悄悄话内容。</p>
   *
   * @param targetUserId 目标用户 ID
   * @return 悄悄话视图（解锁成功后 unlocked=true 且含完整文案）
   * @throws InsufficientBalanceException 余额不足时抛出（HTTP 409）
   */
  @PostMapping("/recommendations/{userId}/whisper/unlock")
  @PreAuthorize("hasRole('USER')")
  public WhisperUnlockView unlockWhisper(@PathVariable("userId") Long targetUserId) {
    if (targetUserId == null || targetUserId <= 0) {
      throw new IllegalArgumentException(ErrorMessages.TARGET_USER_ID_POSITIVE);
    }
    Long currentUserId = SecurityUtils.getCurrentUserId();
    if (currentUserId.equals(targetUserId)) {
      throw new IllegalArgumentException("不能对本人解锁悄悄话");
    }
    // 已解锁直接放行（不重复扣费，幂等）
    if (isMessageOrWhisperUnlocked(currentUserId, targetUserId)) {
      String whisper = recommendationRanker != null
              ? recommendationRanker.resolveWhisper(targetUserId) : null;
      return new WhisperUnlockView(true, whisper, balanceCents(currentUserId));
    }
    if (walletService == null) {
      // mock profile：钱包服务不可用，返回解锁成功但不含扣费（本地演示语义）
      String whisper = recommendationRanker != null
              ? recommendationRanker.resolveWhisper(targetUserId) : null;
      return new WhisperUnlockView(true, whisper, null);
    }
    // 服务端定价扣费（幂等：order_id 唯一索引兜底）
    Long balanceAfter = walletService.deduct(
            currentUserId,
            (long) whisperPriceCents,
            "UNLOCK-WHISPER-" + targetUserId,
            WalletTransactionLog.RELATED_TYPE_WHISPER_UNLOCK,
            String.valueOf(targetUserId));
    String whisper = recommendationRanker != null
            ? recommendationRanker.resolveWhisper(targetUserId) : null;
    return new WhisperUnlockView(true, whisper, balanceAfter);
  }

  /**
   * 查询当前用户是否已对目标用户解锁私信/悄悄话
   * （wallet_transaction_log 存在 MESSAGE_UNLOCK / WHISPER_UNLOCK 流水）。
   */
  private boolean isMessageOrWhisperUnlocked(Long currentUserId, Long targetUserId) {
    if (walletTransactionLogRepository == null) {
      return false;
    }
    try {
      return !walletTransactionLogRepository
              .findByUserIdAndRelatedTypeInAndRelatedIdIn(
                      currentUserId,
                      List.of(WalletTransactionLog.RELATED_TYPE_MESSAGE_UNLOCK,
                              WalletTransactionLog.RELATED_TYPE_WHISPER_UNLOCK),
                      List.of(String.valueOf(targetUserId)))
              .isEmpty();
    } catch (RuntimeException e) {
      // 解锁状态查询失败降级为未解锁（不影响主流程）
      return false;
    }
  }

  /** 查询当前用户钱包余额（分）；钱包服务不可用时返回 null。 */
  private Long balanceCents(Long userId) {
    if (walletService == null) {
      return null;
    }
    try {
      return walletService.getBalance(userId);
    } catch (RuntimeException e) {
      return null;
    }
  }
}

/**
 * 悄悄话视图（R4-00314 解锁接口返回体）。
 *
 * @param unlocked     当前用户是否已解锁该悄悄话
 * @param whisper      悄悄话文案（未解锁时为 null，不泄露付费内容）
 * @param balanceCents 当前用户钱包余额（分，查询失败或服务不可用时为 null）
 */
record WhisperUnlockView(
        boolean unlocked,
        String whisper,
        Long balanceCents
) {
}

// ---- Views ----

record DiscussionRecommendationView(
    String id,
    String title,
    String summary,
    String heatLabel
) {
}

record ActivityRecommendationView(
    String id,
    String title,
    String location,
    String scheduleText,
    String description,
    int enrollmentCount,
    List<String> participantAvatars
) {
}

record RecommendationPreferencesView(
    @NotBlank(message = ErrorMessages.DAILY_NOTIFY_TIME_REQUIRED) @Size(max = 16) String dailyNotifyTime,
    @NotBlank(message = ErrorMessages.SCOPE_REQUIRED) @Size(max = 32) String scope,
    /** 校园优先：同校用户排序靠前 */
    Boolean campusPriority
) {
}

/**
 * 报名请求体
 */
record EnrollRequest(
    boolean enrolled
) {
}

/**
 * 报名操作响应
 */
record ActivityEnrollmentView(
    String activityId,
    boolean enrolled,
    int enrollmentCount
) {
}

/**
 * 保存偏好请求体（A-40：支持部分字段更新）。
 *
 * <p>字段均为可空：仅传入的字段参与更新，缺失字段由服务端读取现有偏好
 * 保持原值（见 {@code savePreferences} 的合并逻辑），避免 @NotBlank
 * 强制全量提交导致客户端部分更新被 400 拒绝。</p>
 */
record SavePreferencesRequest(
    @Size(max = 16) String preferredTime,
    @Size(max = 32) String scope,
    /** 校园优先：同校用户推荐权重+30% */
    Boolean campusPriority
) {}
