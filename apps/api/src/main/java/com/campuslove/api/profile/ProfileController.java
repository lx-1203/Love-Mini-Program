package com.campuslove.api.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
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
 */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  @GetMapping("/stats")
  public ProfileStatsView getProfileStats() {
    return profileService.getProfileStats();
  }

  @GetMapping("/basic")
  public BasicProfileView getBasicProfile() {
    return profileService.getBasicProfile();
  }

  /**
   * 保存基本资料。
   * 接收 {@link BasicProfileRequest}（含 Phase B 扩展字段），
   * 校验字段范围后更新 UserBasicProfile，并重新计算 profileCompletion。
   */
  @PutMapping("/basic")
  public BasicProfileView saveBasicProfile(@Valid @RequestBody BasicProfileRequest request) {
    return profileService.saveBasicProfile(request);
  }

  /**
   * 上传个人主页背景图。
   * POST /api/profile/background
   */
  @PostMapping("/background")
  public BasicProfileView uploadBackground(@RequestParam("file") MultipartFile file) {
    return profileService.uploadBackground(file);
  }

  /**
   * 上传照片墙图片到指定索引（0-5）。
   * POST /api/profile/photos?index=0
   */
  @PostMapping("/photos")
  public BasicProfileView uploadPhoto(@RequestParam("file") MultipartFile file,
                                      @RequestParam("index") int index) {
    return profileService.uploadPhoto(file, index);
  }

  /**
   * 删除指定索引的照片墙图片。
   * DELETE /api/profile/photos/{index}
   */
  @DeleteMapping("/photos/{index}")
  public BasicProfileView deletePhoto(@PathVariable("index") int index) {
    return profileService.deletePhoto(index);
  }

  /**
   * 上传个人视频。
   * POST /api/profile/video
   */
  @PostMapping("/video")
  public BasicProfileView uploadVideo(@RequestParam("file") MultipartFile file) {
    return profileService.uploadVideo(file);
  }

  /**
   * 上传半身照。
   * POST /api/profile/half-body
   */
  @PostMapping("/half-body")
  public BasicProfileView uploadHalfBody(@RequestParam("file") MultipartFile file) {
    return profileService.uploadHalfBody(file);
  }

  @GetMapping("/campus")
  public CampusProfileView getCampusProfile() {
    return profileService.getCampusProfile();
  }

  @PutMapping("/campus")
  public CampusProfileView saveCampusProfile(@Valid @RequestBody CampusProfileRequest request) {
    return profileService.saveCampusProfile(request);
  }

  @GetMapping("/schedule")
  public ScheduleProfileView getScheduleProfile() {
    return profileService.getScheduleProfile();
  }

  @PutMapping("/schedule")
  public ScheduleProfileView saveScheduleProfile(@Valid @RequestBody ScheduleProfileRequest request) {
    return profileService.saveScheduleProfile(request);
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
    String verificationBadgeLevel
) {
}

/**
 * 基本资料请求（含 Phase B 扩展字段）。
 *
 * <p>原有 4 字段（nickname/bio/grade/pronouns）保持必填以保证向后兼容；
 * 新增字段全部可选，未传时保留既有值（不清空）。</p>
 */
record BasicProfileRequest(
    @NotBlank String nickname,
    @NotBlank String bio,
    @NotBlank String grade,
    @NotBlank String pronouns,
    /** 身高（120-250 cm），可空 */
    @Min(120) @Max(250) Integer height,
    /** 学历层级：high_school/bachelor/master/phd，可空 */
    String educationLevel,
    /** 感情状态：never/married_before/divorced/widowed，可空 */
    String relationshipStatus,
    /** 籍贯省份，可空 */
    String hometownProvince,
    /** 籍贯城市，可空 */
    String hometownCity,
    /** 未来计划定居城市，可空 */
    String futureCity,
    /** 未来规划标签列表，可空 */
    List<String> futurePlanTags
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
    @NotBlank String city,
    @NotBlank String campusName,
    @NotBlank String department
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
    @NotBlank String preferredCampusArea,
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
