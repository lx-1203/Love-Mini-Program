package com.campuslove.api.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

  private final ProfileService profileService;

  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
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

  // ---- CourseBlock CRUD (Day 3) ----

  @GetMapping("/schedule/blocks")
  public List<CourseBlockView> listCourseBlocks() {
    return profileService.listCourseBlocks();
  }

  @PostMapping("/schedule/blocks")
  @ResponseStatus(HttpStatus.CREATED)
  public CourseBlockView addCourseBlock(@Valid @RequestBody CourseBlockRequest request) {
    return profileService.addCourseBlock(request);
  }

  @PutMapping("/schedule/blocks/{blockId}")
  public CourseBlockView updateCourseBlock(@PathVariable("blockId") String blockId,
                                           @Valid @RequestBody CourseBlockRequest request) {
    return profileService.updateCourseBlock(blockId, request);
  }

  @DeleteMapping("/schedule/blocks/{blockId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCourseBlock(@PathVariable("blockId") String blockId) {
    profileService.deleteCourseBlock(blockId);
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

// ---- CourseBlock DTOs (Day 3) ----

/** 新增/更新课程时间段请求 */
record CourseBlockRequest(
    @NotBlank @Pattern(regexp = "周一|周二|周三|周四|周五")
    String dayOfWeek,
    @Min(1) @Max(12) int startPeriod,
    @Min(1) @Max(12) int endPeriod,
    @NotBlank String courseName,
    @NotBlank String location
) {
}

/** 课程时间段视图 */
record CourseBlockView(
    String id,
    String dayOfWeek,
    int startPeriod,
    int endPeriod,
    String courseName,
    String location
) {
}