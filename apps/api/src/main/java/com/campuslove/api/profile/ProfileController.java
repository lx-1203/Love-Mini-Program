package com.campuslove.api.profile;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.dto.DtoMapper;
import com.campuslove.api.dto.UserDto;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 个人资料控制器。
 *
 * <p>Phase B 扩展：在既有基本资料/校园资料/课表资料端点之上，
 * 新增媒体绑定端点（背景图、照片墙、个人视频、半身照）。</p>
 *
 * <p>向后兼容：原有 PUT /api/profile/basic 端点保留 4 个必填字段，
 * 新增字段为可选，未传时不会清空已有值。</p>
 *
 * <p>DTO 层接入：新增 GET /api/profile/dto 端点返回 {@link UserDto}，
 * 通过 {@link DtoMapper} 将 User 实体转换为脱敏后的 DTO，
 * 与既有返回 {@code *View} 的端点并存，保持方法签名兼容。</p>
 */
@Tag(name = "Profile", description = "个人资料接口：基本资料、校园资料、课表、照片墙、背景图、个人视频、访客记录")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/profile")
@org.springframework.validation.annotation.Validated
// mock profile 排除了 JPA(无 Repository bean),本控制器为 real 专属;
// mock 模式前端走本地 mockFixtures,不调用本端点
@org.springframework.context.annotation.Profile("real")
public class ProfileController {

  private final ProfileService profileService;
  private final UserRepository userRepository;

  public ProfileController(ProfileService profileService, UserRepository userRepository) {
    this.profileService = profileService;
    this.userRepository = userRepository;
  }

  @GetMapping("/stats")
  @Operation(summary = "获取个人资料统计", description = "返回资料完成度、照片数量、视频数量等统计指标，用于个人主页头部展示。", operationId = "getProfileStats")
  @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "统计信息",
          content = @Content(schema = @Schema(implementation = ApiResponse.class)))
  public ApiResponse<ProfileStatsView> getProfileStats() {
    return ApiResponse.ok(profileService.getProfileStats());
  }

  @GetMapping("/basic")
  @Operation(summary = "获取基本资料", description = "返回当前用户的基本资料（昵称、性别、生日、签名、照片墙、背景图等）。", operationId = "getBasicProfile")
  @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "基本资料",
          content = @Content(schema = @Schema(implementation = ApiResponse.class)))
  public ApiResponse<BasicProfileView> getBasicProfile() {
    return ApiResponse.ok(profileService.getBasicProfile());
  }

  /**
   * 保存基本资料。
   * 接收 {@link BasicProfileRequest}（含 Phase B 扩展字段），
   * 校验字段范围后更新 UserBasicProfile，并重新计算 profileCompletion。
   */
  @PutMapping("/basic")
  @PreAuthorize("hasRole('USER')")
  @Operation(summary = "保存基本资料", description = "更新昵称、性别、生日、签名等字段，重新计算资料完成度（加权平均：displayName 10% + campus 10% + schedule 10% + profileCompleted 70%）。", operationId = "saveBasicProfile")
  @io.swagger.v3.oas.annotations.responses.ApiResponses({
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "保存成功",
                  content = @Content(schema = @Schema(implementation = BasicProfileView.class))),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "字段校验失败", content = @Content),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "乐观锁冲突", content = @Content)
  })
  public BasicProfileView saveBasicProfile(
          @Parameter(description = "基本资料请求体", required = true)
          @Valid @RequestBody BasicProfileRequest request) {
    return profileService.saveBasicProfile(request);
  }

  /**
   * 上传头像（2026-08-07 新增）。
   * POST /api/profile/avatar
   *
   * 头像存储在 users.avatar_url（而非 user_basic_profile），
   * 由推荐卡片（DiscoverCard.avatar）、个人主页共用。
   */
  @PostMapping("/avatar")
  @PreAuthorize("hasRole('USER')")
  @Operation(summary = "上传头像", description = "上传用户头像，校验 MIME 与 magic bytes，更新 users.avatar_url。", operationId = "uploadAvatar")
  @io.swagger.v3.oas.annotations.responses.ApiResponses({
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "上传成功，返回更新后的资料",
                  content = @Content(schema = @Schema(implementation = BasicProfileView.class))),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "格式不支持", content = @Content),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "413", description = "文件过大", content = @Content)
  })
  public BasicProfileView uploadAvatar(
          @Parameter(in = ParameterIn.QUERY, description = "头像文件", required = true,
                  content = @Content(mediaType = "multipart/form-data"))
          @RequestParam("file") MultipartFile file) {
    return profileService.uploadAvatar(file);
  }

  /**
   * 上传个人主页背景图。
   * POST /api/profile/background
   */
  @PostMapping("/background")
  @PreAuthorize("hasRole('USER')")
  @Operation(summary = "上传主页背景图", description = "上传个人主页顶部的背景图，自动调用媒体存储服务，校验 MIME 与 magic bytes。", operationId = "uploadProfileBackground")
  @io.swagger.v3.oas.annotations.responses.ApiResponses({
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "上传成功，返回更新后的资料",
                  content = @Content(schema = @Schema(implementation = BasicProfileView.class))),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "格式不支持", content = @Content),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "413", description = "文件过大", content = @Content)
  })
  public BasicProfileView uploadBackground(
          @Parameter(in = ParameterIn.QUERY, description = "背景图文件", required = true,
                  content = @Content(mediaType = "multipart/form-data"))
          @RequestParam("file") MultipartFile file) {
    return profileService.uploadBackground(file);
  }

  /**
   * 上传照片墙图片到指定索引（0-5）。
   * POST /api/profile/photos?index=0
   */
  @PostMapping("/photos")
  @PreAuthorize("hasRole('USER')")
  @Operation(summary = "上传照片墙图片", description = "上传照片墙指定索引（0-5）的图片。索引超范围返回 400。", operationId = "uploadProfilePhoto")
  @io.swagger.v3.oas.annotations.responses.ApiResponses({
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "上传成功",
                  content = @Content(schema = @Schema(implementation = BasicProfileView.class))),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "index 超出 0-5 范围或文件格式不支持", content = @Content)
  })
  public BasicProfileView uploadPhoto(
          @Parameter(in = ParameterIn.QUERY, description = "照片文件", required = true,
                  content = @Content(mediaType = "multipart/form-data"))
          @RequestParam("file") MultipartFile file,
          @Parameter(in = ParameterIn.QUERY, description = "照片墙索引（0-5）", required = true, example = "0")
          // infra R2-00208: 索引范围校验（0-5），与 Service 层校验保持一致
          @RequestParam("index") @Min(0) @Max(5) int index) {
    return profileService.uploadPhoto(file, index);
  }

  /**
   * 删除指定索引的照片墙图片。
   * DELETE /api/profile/photos/{index}
   */
  @DeleteMapping("/photos/{index}")
  @PreAuthorize("hasRole('USER')")
  @Operation(summary = "删除照片墙图片", description = "删除指定索引（0-5）的照片墙图片。", operationId = "deleteProfilePhoto")
  @io.swagger.v3.oas.annotations.responses.ApiResponses({
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "删除成功",
                  content = @Content(schema = @Schema(implementation = BasicProfileView.class))),
          @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "索引无照片", content = @Content)
  })
  public BasicProfileView deletePhoto(
          @Parameter(description = "照片墙索引（0-5）", required = true, example = "0")
          @PathVariable("index") @Min(0) @Max(5) int index) {
    return profileService.deletePhoto(index);
  }

  /**
   * 上传个人视频。
   * POST /api/profile/video
   */
  @PostMapping("/video")
  @PreAuthorize("hasRole('USER')")
  public BasicProfileView uploadVideo(@RequestParam("file") MultipartFile file) {
    return profileService.uploadVideo(file);
  }

  /**
   * 上传半身照。
   * POST /api/profile/half-body
   */
  @PostMapping("/half-body")
  @PreAuthorize("hasRole('USER')")
  public BasicProfileView uploadHalfBody(@RequestParam("file") MultipartFile file) {
    return profileService.uploadHalfBody(file);
  }

  @GetMapping("/campus")
  public CampusProfileView getCampusProfile() {
    return profileService.getCampusProfile();
  }

  @PutMapping("/campus")
  @PreAuthorize("hasRole('USER')")
  public CampusProfileView saveCampusProfile(@Valid @RequestBody CampusProfileRequest request) {
    return profileService.saveCampusProfile(request);
  }

  @GetMapping("/schedule")
  public ScheduleProfileView getScheduleProfile() {
    return profileService.getScheduleProfile();
  }

  @PutMapping("/schedule")
  @PreAuthorize("hasRole('USER')")
  public ScheduleProfileView saveScheduleProfile(@Valid @RequestBody ScheduleProfileRequest request) {
    return profileService.saveScheduleProfile(request);
  }

  // ---- DTO 层接入 ----

  /**
   * 获取当前登录用户的 UserDto（DTO 层示例端点）。
   *
   * <p>与 {@link #getBasicProfile()} 等返回 {@code *View} 的端点并存，
   * 用于演示 Entity -&gt; DTO 的隔离转换：
   * <ol>
   *   <li>从认证上下文获取当前用户 ID；</li>
   *   <li>通过 UserRepository 加载 User 实体；</li>
   *   <li>经 {@link DtoMapper#toUserDto(User)} 转换为 {@link UserDto}，
   *       自动对 openid 进行脱敏处理。</li>
   * </ol>
   * 该端点不暴露任何敏感字段（phone、password 等）。</p>
   *
   * @return 脱敏后的 UserDto；用户不存在时返回 404
   */
  @GetMapping("/dto")
  public ResponseEntity<UserDto> getCurrentUserDto() {
    Long userId = SecurityUtils.getCurrentUserId();
    return userRepository.findById(userId)
        .map(DtoMapper::toUserDto)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
  }
}

/**
 * 基本资料视图（含 Phase B 扩展字段）。
 *
 * <p>扩展字段：
 * <ul>
 *   <li>身高、学历、感情状态、籍贯（省/市）、未来城市、未来规划标签</li>
 *   <li>照片墙、半身照 URL、个人视频 URL、个人主页背景图 URL</li>
 *   <li>资料完善度（0-100）、认证徽章级别（none/school/email/idcard）</li>
 * </ul>
 * </p>
 */
record BasicProfileView(
    String nickname,
    String bio,
    String grade,
    String pronouns,
    Integer height,
    String educationLevel,
    String relationshipStatus,
    String hometownProvince,
    String hometownCity,
    String futureCity,
    List<String> futurePlanTags,
    List<String> photoGallery,
    String halfBodyPhotoUrl,
    String personalVideoUrl,
    String profileBackgroundUrl,
    int profileCompletion,
    String verificationBadgeLevel,
    String avatarUrl
) {
}

/**
 * 基本资料请求（含 Phase B 扩展字段）。
 *
 * <p>原有 4 字段（nickname/bio/grade/pronouns）保持必填以保证向后兼容；
 * 新增字段全部可选，未传时保留既有值（不清空）。</p>
 */
record BasicProfileRequest(
    @NotBlank @Size(max = 64) String nickname,
    @NotBlank @Size(max = 500) String bio,
    @NotBlank @Size(max = 32) String grade,
    @NotBlank @Size(max = 32) String pronouns,
    /** 身高（120-250 cm），可空 */
    @Min(120) @Max(250) Integer height,
    /** 学历层级：high_school/bachelor/master/phd，可空 */
    @Pattern(regexp = "high_school|bachelor|master|phd",
        message = ErrorMessages.EDUCATION_LEVEL_INVALID) String educationLevel,
    /** 感情状态：never/married_before/divorced/widowed，可空 */
    @Pattern(regexp = "never|married_before|divorced|widowed",
        message = ErrorMessages.RELATIONSHIP_STATUS_INVALID) String relationshipStatus,
    /** 籍贯省份，可空 */
    @Size(max = 32) String hometownProvince,
    /** 籍贯城市，可空 */
    @Size(max = 32) String hometownCity,
    /** 未来计划定居城市，可空 */
    @Size(max = 32) String futureCity,
    /** 未来规划标签列表，可空 */
    List<String> futurePlanTags,
    /** 兴趣标签列表（P0-34 修复：此前 BasicProfileRequest 缺该字段，
     *  前端提交的 interestTags 被 Jackson 静默丢弃 → 资料完善度永远差 20 分
     *  → profileCompleted 恒 false → 新账号无法解锁全部功能） */
    List<String> interestTags,
    /** 头像 URL（2026-08-07 新增，可空；非空时更新 users.avatar_url） */
    @Size(max = 512) String avatarUrl
) {
}

record CampusProfileView(
    String city,
    String campusName,
    String department,
    String verificationStatus
) {
}

record CampusProfileRequest(
    @NotBlank @Size(max = 32) String city,
    @NotBlank @Size(max = 100) String campusName,
    @NotBlank @Size(max = 100) String department
) {
}

record ScheduleBlockView(
    String id,
    String weekday,
    String start,
    String end,
    String label
) {
}

record ScheduleProfileView(
    String preferredCampusArea,
    List<String> preferredTimeWindows,
    List<ScheduleBlockView> courseBlocks
) {
}

record ScheduleProfileRequest(
    @NotBlank @Size(max = 64) String preferredCampusArea,
    List<String> preferredTimeWindows,
    List<ScheduleBlockView> courseBlocks
) {
}

record ProfileStatsView(
    int followingCount,
    int followersCount,
    int likesCount
) {
}
