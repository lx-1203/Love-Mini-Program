package com.campuslove.api.debug;

import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/_debug/errors")
@Profile("mock")
public class ErrorSimulationController {

  @PostMapping("/{status}")
  public ResponseEntity<Map<String, Object>> simulate(@PathVariable("status") int status) {
    HttpStatus httpStatus = switch (status) {
      case 400 -> HttpStatus.BAD_REQUEST;
      case 404 -> HttpStatus.NOT_FOUND;
      default -> HttpStatus.INTERNAL_SERVER_ERROR;
    };

    Map<String, Object> body = switch (httpStatus) {
      case BAD_REQUEST -> Map.of(
          "error", "bad_request",
          "message", "模拟校验错误"
      );
      case NOT_FOUND -> Map.of(
          "error", "not_found",
          "message", "模拟资源不存在"
      );
      default -> Map.of(
          "error", "server_error",
          "message", "模拟服务异常"
      );
    };

    return ResponseEntity.status(httpStatus).body(body);
  }
}
