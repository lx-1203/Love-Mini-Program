package com.campuslove.api.profile;

import com.campuslove.api.runtime.MockRuntimeState;
import com.campuslove.api.runtime.MockRuntimeState.CourseBlockData;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

  private final MockRuntimeState runtimeState;

  public ProfileService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  public BasicProfileView getBasicProfile() {
    MockRuntimeState.BasicProfileData profile = runtimeState.basicProfile();
    return new BasicProfileView(
        profile.nickname(),
        profile.bio(),
        profile.grade(),
        profile.pronouns()
    );
  }

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

  public CampusProfileView getCampusProfile() {
    MockRuntimeState.CampusProfileData profile = runtimeState.campusProfile();
    return new CampusProfileView(
        profile.city(),
        profile.campusName(),
        profile.department(),
        profile.verificationStatus()
    );
  }

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

  public ScheduleProfileView getScheduleProfile() {
    MockRuntimeState.ScheduleProfileData profile = runtimeState.scheduleProfile();
    return new ScheduleProfileView(
        profile.preferredCampusArea(),
        profile.preferredTimeWindows(),
        toBlocks(profile.courseBlocks())
    );
  }

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

  // ---- CourseBlock CRUD (Day 3) ----

  /** 获取所有 CourseBlock (独立于旧 schedule 端点的新数据模型) */
  public List<CourseBlockView> listCourseBlocks() {
    return runtimeState.courseBlocks().stream()
        .map(this::toCourseBlockView)
        .toList();
  }

  /** 新增一个课程时间段 */
  public CourseBlockView addCourseBlock(CourseBlockRequest request) {
    CourseBlockData created = runtimeState.addCourseBlock(
        new CourseBlockData(null, request.dayOfWeek(), request.startPeriod(),
            request.endPeriod(), request.courseName(), request.location())
    );
    return toCourseBlockView(created);
  }

  /** 更新指定课程时间段 */
  public CourseBlockView updateCourseBlock(String blockId, CourseBlockRequest request) {
    CourseBlockData updated = runtimeState.updateCourseBlock(blockId,
        new CourseBlockData(blockId, request.dayOfWeek(), request.startPeriod(),
            request.endPeriod(), request.courseName(), request.location())
    );
    return toCourseBlockView(updated);
  }

  /** 删除指定课程时间段 */
  public void deleteCourseBlock(String blockId) {
    runtimeState.deleteCourseBlock(blockId);
  }

  private CourseBlockView toCourseBlockView(CourseBlockData data) {
    return new CourseBlockView(
        data.id(),
        data.dayOfWeek(),
        data.startPeriod(),
        data.endPeriod(),
        data.courseName(),
        data.location()
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