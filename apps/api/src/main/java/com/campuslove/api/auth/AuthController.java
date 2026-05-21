package com.campuslove.api.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping("/me")
  public UserSessionView getCurrentSession() {
    return authService.getCurrentSession();
  }

  @PostMapping("/wechat-login")
  public UserSessionView loginWithWechat(@Valid @RequestBody WechatLoginRequest request) {
    return authService.loginWithWechat(request.code());
  }
}

record WechatLoginRequest(@NotBlank String code) {
}
