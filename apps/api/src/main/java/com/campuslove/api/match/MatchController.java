package com.campuslove.api.match;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

  private final MatchService matchService;

  public MatchController(MatchService matchService) {
    this.matchService = matchService;
  }

  @GetMapping("/form-config")
  public MatchFormConfigView getFormConfig() {
    return matchService.getFormConfig();
  }

  @PostMapping
  public MatchResultView createMatch(@Valid @RequestBody MatchRequest request) {
    return matchService.createMatch(request);
  }

  @PostMapping("/quick")
  public MatchResultView createQuickMatch(@Valid @RequestBody QuickMatchRequest request) {
    return matchService.createQuickMatch(request);
  }

  @GetMapping("/{id}")
  public MatchResultView getMatch(@PathVariable("id") String id) {
    return matchService.getMatch(id);
  }
}

record MatchFormConfigView(List<MatchFormSectionView> sections) {
}

record MatchFormSectionView(
    String id,
    String title,
    List<MatchFormFieldView> fields
) {
}

record MatchFormFieldView(
    String id,
    String kind,
    String label,
    List<MatchOptionView> options,
    Integer min,
    Integer max
) {
}

record MatchOptionView(String id, String label) {
}

record MatchRequest(
    @NotBlank String matchIntent,
    List<String> topicIds,
    @NotBlank String timeWindow,
    Integer durationMinutes
) {
}

record QuickMatchRequest(Integer durationMinutes) {
}

record MatchResultView(
    String id,
    String queueStatus,
    String topicLabel,
    String partnerHeadline,
    Integer countdownMinutes,
    String recommendedPrompt,
    String tempChatSessionId
) {
}
