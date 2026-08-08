package com.campuslove.api.debug;

import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 错误模拟控制器（仅 mock profile 启用）。
 *
 * <p>提供按 HTTP 状态码模拟后端错误的端点，
 * 供前端异常分支与全局错误处理链路联调使用。
 * R4-00433：支持常用状态码全集（400/401/403/404/429/500/502/503），
 * 前端异常分支（未授权/无权限/限流/网关错误等）均可联调覆盖。</p>
 */
@RestController
@RequestMapping("/api/v1/_debug/errors")
@Profile("mock")
public class ErrorSimulationController {

  @PostMapping("/{status}")
  public ResponseEntity<Map<String, Object>> simulate(@PathVariable("status") int status) {
    HttpStatus httpStatus = switch (status) {
      case 400 -> HttpStatus.BAD_REQUEST;
      case 401 -> HttpStatus.UNAUTHORIZED;
      case 403 -> HttpStatus.FORBIDDEN;
      case 404 -> HttpStatus.NOT_FOUND;
      case 409 -> HttpStatus.CONFLICT;
      case 429 -> HttpStatus.TOO_MANY_REQUESTS;
      case 502 -> HttpStatus.BAD_GATEWAY;
      case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
      default -> HttpStatus.INTERNAL_SERVER_ERROR;
    };

    Map<String, Object> body = switch (httpStatus) {
      case BAD_REQUEST -> Map.of(
          "error", "bad_request",
          "message", "模拟校验错误"
      );
      case UNAUTHORIZED -> Map.of(
          "error", "unauthorized",
          "message", "模拟未认证错误"
      );
      case FORBIDDEN -> Map.of(
          "error", "forbidden",
          "message", "模拟无权限错误"
      );
      case NOT_FOUND -> Map.of(
          "error", "not_found",
          "message", "模拟资源不存在"
      );
      case CONFLICT -> Map.of(
          "error", "conflict",
          "message", "模拟资源冲突"
      );
      case TOO_MANY_REQUESTS -> Map.of(
          "error", "too_many_requests",
          "message", "模拟触发限流"
      );
      case BAD_GATEWAY -> Map.of(
          "error", "bad_gateway",
          "message", "模拟网关错误"
      );
      case SERVICE_UNAVAILABLE -> Map.of(
          "error", "service_unavailable",
          "message", "模拟服务不可用"
      );
      default -> Map.of(
          "error", "server_error",
          "message", "模拟服务异常"
      );
    };

    return ResponseEntity.status(httpStatus).body(body);
  }
}
