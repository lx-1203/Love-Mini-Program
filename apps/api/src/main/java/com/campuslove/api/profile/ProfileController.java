package com.campuslove.api.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

  @PutMapping("/basic")
  public BasicProfileView saveBasicProfile(@Valid @RequestBody BasicProfileRequest request) {
    return profileService.saveBasicProfile(request);
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

record BasicProfileView(
    String nickname,
    String bio,
    String grade,
    String pronouns
) {
}

record BasicProfileRequest(
    @NotBlank String nickname,
    @NotBlank String bio,
    @NotBlank String grade,
    @NotBlank String pronouns
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

