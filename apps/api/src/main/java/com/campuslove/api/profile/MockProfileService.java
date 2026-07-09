package com.campuslove.api.profile;

import com.campuslove.api.campus.CampusCertificationService;
import com.campuslove.api.campus.CampusCertificationView;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import java.util.ArrayList;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Mock 个人资料服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 *
 * <p>Phase B 扩展：实现媒体绑定方法（背景图/照片墙/视频/半身照），
 * 通过注入的 {@link MediaStorageService} 真实上传文件并写回 mock 状态，
 * 以便前端在 mock 模式下也能完成上传联调。</p>
 */
@Profile("mock")
@Service
public class MockProfileService implements ProfileService {

  private static final int PHOTO_GALLERY_MAX = 6;

  private final MockRuntimeState runtimeState;
  private final MediaStorageService mediaStorageService;
  private final CampusCertificationService campusCertificationService;

  public MockProfileService(MockRuntimeState runtimeState,
                             MediaStorageService mediaStorageService,
                             CampusCertificationService campusCertificationService) {
    this.runtimeState = runtimeState;
    this.mediaStorageService = mediaStorageService;
    this.campusCertificationService = campusCertificationService;
  }

  @Override
  public BasicProfileView getBasicProfile() {
    MockRuntimeState.BasicProfileData profile = runtimeState.basicProfile();
    return toView(profile, computeProfileCompletion(profile));
  }

  @Override
  public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
    validateExtendedFields(request);
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    // 保留既有媒体字段：未传新值时沿用旧值，避免被清空
    List<String> futurePlanTags = request.futurePlanTags() != null
        ? request.futurePlanTags() : current.futurePlanTags();
    MockRuntimeState.BasicProfileData saved = runtimeState.saveBasicProfile(
        new MockRuntimeState.BasicProfileData(
            request.nickname(),
            request.bio(),
            request.grade(),
            request.pronouns(),
            request.height() != null ? request.height() : current.height(),
            request.educationLevel() != null ? request.educationLevel() : current.educationLevel(),
            request.relationshipStatus() != null
                ? request.relationshipStatus() : current.relationshipStatus(),
            request.hometownProvince() != null
                ? request.hometownProvince() : current.hometownProvince(),
            request.hometownCity() != null
                ? request.hometownCity() : current.hometownCity(),
            request.futureCity() != null ? request.futureCity() : current.futureCity(),
            futurePlanTags,
            current.photoGallery(),
            current.halfBodyPhotoUrl(),
            current.personalVideoUrl(),
            current.profileBackgroundUrl()
        )
    );
    return toView(saved, computeProfileCompletion(saved));
  }

  @Override
  public BasicProfileView uploadBackground(MultipartFile file) {
    String url = doUpload(file, "background");
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    MockRuntimeState.BasicProfileData updated = withBackground(current, url);
    runtimeState.saveBasicProfile(updated);
    return toView(updated, computeProfileCompletion(updated));
  }

  @Override
  public BasicProfileView uploadPhoto(MultipartFile file, int index) {
    if (index < 0 || index >= PHOTO_GALLERY_MAX) {
      throw new IllegalArgumentException(
          "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
    }
    String url = doUpload(file, "image");
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    List<String> gallery = new ArrayList<>(current.photoGallery());
    // 扩容到 index+1，中间空位用 "" 占位以便保持索引一致
    while (gallery.size() <= index) {
      gallery.add("");
    }
    gallery.set(index, url);
    MockRuntimeState.BasicProfileData updated = withPhotoGallery(current, gallery);
    runtimeState.saveBasicProfile(updated);
    return toView(updated, computeProfileCompletion(updated));
  }

  @Override
  public BasicProfileView deletePhoto(int index) {
    if (index < 0 || index >= PHOTO_GALLERY_MAX) {
      throw new IllegalArgumentException(
          "照片墙索引越界，仅支持 0-" + (PHOTO_GALLERY_MAX - 1) + "，当前: " + index);
    }
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    List<String> gallery = new ArrayList<>(current.photoGallery());
    if (index >= gallery.size()) {
      throw new IllegalArgumentException("指定索引无照片可删除: " + index);
    }
    String removed = gallery.remove(index);
    if (removed != null && !removed.isBlank()) {
      // 尽力删除底层文件，失败时忽略（mock 模式下文件可能由 LocalMediaStorageService 管理）
      try {
        mediaStorageService.delete(removed);
      } catch (Exception ignored) {
        // 删除失败不影响 mock 状态更新
      }
    }
    MockRuntimeState.BasicProfileData updated = withPhotoGallery(current, gallery);
    runtimeState.saveBasicProfile(updated);
    return toView(updated, computeProfileCompletion(updated));
  }

  @Override
  public BasicProfileView uploadVideo(MultipartFile file) {
    String url = doUpload(file, "video");
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    MockRuntimeState.BasicProfileData updated = withVideo(current, url);
    runtimeState.saveBasicProfile(updated);
    return toView(updated, computeProfileCompletion(updated));
  }

  @Override
  public BasicProfileView uploadHalfBody(MultipartFile file) {
    String url = doUpload(file, "image");
    MockRuntimeState.BasicProfileData current = runtimeState.basicProfile();
    MockRuntimeState.BasicProfileData updated = withHalfBody(current, url);
    runtimeState.saveBasicProfile(updated);
    return toView(updated, computeProfileCompletion(updated));
  }

  @Override
  public CampusProfileView getCampusProfile() {
    MockRuntimeState.CampusProfileData profile = runtimeState.campusProfile();
    return new CampusProfileView(
        profile.city(),
        profile.campusName(),
        profile.department(),
        profile.verificationStatus()
    );
  }

  @Override
  public CampusProfileView saveCampusProfile(CampusProfileRequest request) {
    MockRuntimeState.CampusProfileData profile = runtimeState.saveCampusProfile(
        new MockRuntimeState.CampusProfileData(
            request.city(),
            request.campusName(),
            request.department(),
            "pending"
        )
    );
    return new CampusProfileView(
        profile.city(),
        profile.campusName(),
        profile.department(),
        profile.verificationStatus()
    );
  }

  @Override
  public ScheduleProfileView getScheduleProfile() {
    MockRuntimeState.ScheduleProfileData profile = runtimeState.scheduleProfile();
    return new ScheduleProfileView(
        profile.preferredCampusArea(),
        profile.preferredTimeWindows(),
        toBlocks(profile.courseBlocks())
    );
  }

  @Override
  public ScheduleProfileView saveScheduleProfile(ScheduleProfileRequest request) {
    MockRuntimeState.ScheduleProfileData profile = runtimeState.saveScheduleProfile(
        new MockRuntimeState.ScheduleProfileData(
            request.preferredCampusArea(),
            request.preferredTimeWindows(),
            request.courseBlocks().stream()
                .map(block -> new MockRuntimeState.ScheduleBlockData(
                    block.id(),
                    block.weekday(),
                    block.start(),
                    block.end(),
                    block.label()
                ))
                .toList()
        )
    );

    return new ScheduleProfileView(
        profile.preferredCampusArea(),
        profile.preferredTimeWindows(),
        toBlocks(profile.courseBlocks())
    );
  }

  @Override
  public ProfileStatsView getProfileStats() {
    MockRuntimeState.ProfileStatsData stats = runtimeState.profileStats();
    return new ProfileStatsView(
        stats.followingCount(),
        stats.followersCount(),
        stats.likesCount()
    );
  }

  // ---- 关注关系管理（Mock 简化实现） ----

  @Override
  public FollowView followUser(Long userId, Long targetUserId) {
    return new FollowView(true, userId, targetUserId, 1, 1);
  }

  @Override
  public FollowView unfollowUser(Long userId, Long targetUserId) {
    return new FollowView(false, userId, targetUserId, 0, 0);
  }

  @Override
  public List<FollowUserView> getFollowers(Long userId) {
    return List.of();
  }

  @Override
  public List<FollowUserView> getFollowing(Long userId) {
    return List.of();
  }

  @Override
  public boolean isFollowing(Long userId, Long targetUserId) {
    return false;
  }

  // ---- 私有辅助方法 ----

  /**
   * 调用 MediaStorageService 完成实际上传，返回访问 URL。
   * mock 模式下使用 userId=1（与 MockSecurityConfig 默认 principal 一致）。
   */
  private String doUpload(MultipartFile file, String type) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("上传文件不能为空");
    }
    MediaStorageService.UploadResult result = mediaStorageService.store(1L, file, type);
    return result.getUrl();
  }

  private MockRuntimeState.BasicProfileData withBackground(
      MockRuntimeState.BasicProfileData p, String url) {
    return new MockRuntimeState.BasicProfileData(
        p.nickname(), p.bio(), p.grade(), p.pronouns(),
        p.height(), p.educationLevel(), p.relationshipStatus(),
        p.hometownProvince(), p.hometownCity(), p.futureCity(),
        p.futurePlanTags(), p.photoGallery(), p.halfBodyPhotoUrl(),
        p.personalVideoUrl(), url);
  }

  private MockRuntimeState.BasicProfileData withPhotoGallery(
      MockRuntimeState.BasicProfileData p, List<String> gallery) {
    return new MockRuntimeState.BasicProfileData(
        p.nickname(), p.bio(), p.grade(), p.pronouns(),
        p.height(), p.educationLevel(), p.relationshipStatus(),
        p.hometownProvince(), p.hometownCity(), p.futureCity(),
        p.futurePlanTags(), gallery, p.halfBodyPhotoUrl(),
        p.personalVideoUrl(), p.profileBackgroundUrl());
  }

  private MockRuntimeState.BasicProfileData withVideo(
      MockRuntimeState.BasicProfileData p, String url) {
    return new MockRuntimeState.BasicProfileData(
        p.nickname(), p.bio(), p.grade(), p.pronouns(),
        p.height(), p.educationLevel(), p.relationshipStatus(),
        p.hometownProvince(), p.hometownCity(), p.futureCity(),
        p.futurePlanTags(), p.photoGallery(), p.halfBodyPhotoUrl(),
        url, p.profileBackgroundUrl());
  }

  private MockRuntimeState.BasicProfileData withHalfBody(
      MockRuntimeState.BasicProfileData p, String url) {
    return new MockRuntimeState.BasicProfileData(
        p.nickname(), p.bio(), p.grade(), p.pronouns(),
        p.height(), p.educationLevel(), p.relationshipStatus(),
        p.hometownProvince(), p.hometownCity(), p.futureCity(),
        p.futurePlanTags(), p.photoGallery(), url,
        p.personalVideoUrl(), p.profileBackgroundUrl());
  }

  /**
   * 校验 Phase B 扩展字段范围。
   * 校验规则与 Real 实现保持一致：
   * <ul>
   *   <li>height ∈ [120, 250]</li>
   *   <li>educationLevel ∈ {high_school, bachelor, master, phd}</li>
   *   <li>relationshipStatus ∈ {never, married_before, divorced, widowed}</li>
   * </ul>
   * 字段为 null 时跳过校验（可选字段）。
   */
  private void validateExtendedFields(BasicProfileRequest request) {
    if (request.height() != null) {
      int h = request.height();
      if (h < 120 || h > 250) {
        throw new IllegalArgumentException(
            "height 越界，仅支持 120-250，当前: " + h);
      }
    }
    if (request.educationLevel() != null && !request.educationLevel().isBlank()) {
      if (!List.of("high_school", "bachelor", "master", "phd")
          .contains(request.educationLevel())) {
        throw new IllegalArgumentException(
            "educationLevel 取值非法，仅支持 high_school/bachelor/master/phd，当前: "
                + request.educationLevel());
      }
    }
    if (request.relationshipStatus() != null && !request.relationshipStatus().isBlank()) {
      if (!List.of("never", "married_before", "divorced", "widowed")
          .contains(request.relationshipStatus())) {
        throw new IllegalArgumentException(
            "relationshipStatus 取值非法，仅支持 never/married_before/divorced/widowed，当前: "
                + request.relationshipStatus());
      }
    }
  }

  /**
   * 计算 mock 模式下的资料完善度。
   * 简化规则：
   * <ul>
   *   <li>有 nickname → +30</li>
   *   <li>有 bio → +20</li>
   *   <li>有 height + educationLevel → +20</li>
   *   <li>有 hometownProvince + hometownCity → +15</li>
   *   <li>有 photoGallery 非空 → +15</li>
   * </ul>
   */
  private int computeProfileCompletion(MockRuntimeState.BasicProfileData p) {
    int completion = 0;
    if (p.nickname() != null && !p.nickname().isBlank()) completion += 30;
    if (p.bio() != null && !p.bio().isBlank()) completion += 20;
    if (p.height() != null && p.educationLevel() != null) completion += 20;
    if (p.hometownProvince() != null && !p.hometownProvince().isBlank()
        && p.hometownCity() != null && !p.hometownCity().isBlank()) completion += 15;
    if (p.photoGallery() != null && !p.photoGallery().isEmpty()) completion += 15;
    return Math.min(100, completion);
  }

  /**
   * 查询当前用户的认证徽章级别。
   * 委托 CampusCertificationService 计算，未认证返回 "none"。
   */
  private String resolveBadgeLevel() {
    try {
      CampusCertificationView cert = campusCertificationService.getCertificationStatus(1L);
      if (cert != null && "APPROVED".equals(cert.getStatus())) {
        return "school";
      }
    } catch (Exception ignored) {
      // 查询失败降级为 none
    }
    return "none";
  }

  private BasicProfileView toView(MockRuntimeState.BasicProfileData p, int completion) {
    return new BasicProfileView(
        p.nickname(),
        p.bio(),
        p.grade(),
        p.pronouns(),
        p.height(),
        p.educationLevel(),
        p.relationshipStatus(),
        p.hometownProvince(),
        p.hometownCity(),
        p.futureCity(),
        p.futurePlanTags(),
        p.photoGallery(),
        p.halfBodyPhotoUrl(),
        p.personalVideoUrl(),
        p.profileBackgroundUrl(),
        completion,
        resolveBadgeLevel()
    );
  }

  private List<ScheduleBlockView> toBlocks(List<MockRuntimeState.ScheduleBlockData> blocks) {
    return blocks.stream()
        .map(block -> new ScheduleBlockView(
            block.id(),
            block.weekday(),
            block.start(),
            block.end(),
            block.label()
        ))
        .toList();
  }
}
