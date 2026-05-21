package com.campuslove.api.debug;

import com.campuslove.api.match.MatchService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/_debug/matches")
public class MatchDebugController {

  private final MatchService matchService;

  public MatchDebugController(MatchService matchService) {
    this.matchService = matchService;
  }

  @PostMapping("/next-status/{queueStatus}")
  public Map<String, String> setNextQueueStatus(@PathVariable("queueStatus") String queueStatus) {
    try {
      matchService.setNextQueueStatus(queueStatus);
    } catch (IllegalArgumentException error) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, error.getMessage(), error);
    }

    return Map.of("nextQueueStatus", queueStatus);
  }
}
