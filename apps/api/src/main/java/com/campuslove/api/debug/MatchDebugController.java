package com.campuslove.api.debug;

import com.campuslove.api.match.MatchService;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 匹配调试控制器（仅 mock profile 启用）。
 *
 * <p>提供手动设置下一次匹配队列状态的端点，便于联调与端到端测试中模拟
 * 不同匹配结果（成功/排队/失败）。</p>
 */
@RestController
@RequestMapping("/api/v1/_debug/matches")
@Profile("mock")
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
