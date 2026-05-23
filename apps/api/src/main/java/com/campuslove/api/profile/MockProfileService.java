package com.campuslove.api.profile;

import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.user.FollowUserView;
import com.campuslove.api.user.FollowView;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 个人资料服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 返回固定的模拟数据。
 */
@Profile("mock")
@Service
public class MockProfileService implements ProfileService {

  private final MockRuntimeState runtimeState;

  public MockProfileService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  @Override
  public BasicProfileView getBasicProfile() {
    MockRuntimeState.BasicProfileData profile = runtimeState.basicProfile();
    return new BasicProfileView(
        profile.nickname(),
        profile.bio(),
        profile.grade(),
        profile.pronouns()
    );
  }

  @Override
  public BasicProfileView saveBasicProfile(BasicProfileRequest request) {
    MockRuntimeState.BasicProfileData profile = runtimeState.saveBasicProfile(
        new MockRuntimeState.BasicProfileData(
            request.nickname(),
            request.bio(),
            request.grade(),
            request.pronouns()
        )
    );
    return new BasicProfileView(
        profile.nickname(),
        profile.bio(),
        profile.grade(),
        profile.pronouns()
    );
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
    // Mock 实现：直接返回成功结果
    return new FollowView(true, userId, targetUserId, 1, 1);
  }

  @Override
  public FollowView unfollowUser(Long userId, Long targetUserId) {
    // Mock 实现：直接返回成功结果
    return new FollowView(false, userId, targetUserId, 0, 0);
  }

  @Override
  public List<FollowUserView> getFollowers(Long userId) {
    // Mock 实现：返回空列表
    return List.of();
  }

  @Override
  public List<FollowUserView> getFollowing(Long userId) {
    // Mock 实现：返回空列表
    return List.of();
  }

  @Override
  public boolean isFollowing(Long userId, Long targetUserId) {
    // Mock 实现：默认返回 false
    return false;
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
