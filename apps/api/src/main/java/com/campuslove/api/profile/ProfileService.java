package com.campuslove.api.profile;

import com.campuslove.api.runtime.MockRuntimeState;
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
