package com.campuslove.api.auth;

import com.campuslove.api.runtime.MockRuntimeState;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final MockRuntimeState runtimeState;

  public AuthService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  public UserSessionView getCurrentSession() {
    return toView(runtimeState.currentSession());
  }

  public UserSessionView loginWithWechat(String code) {
    return toView(runtimeState.loginWithWechat());
  }

  private UserSessionView toView(MockRuntimeState.SessionSnapshot snapshot) {
    return new UserSessionView(
        snapshot.userId(),
        snapshot.loggedIn(),
        snapshot.loginMethod(),
        snapshot.displayName(),
        snapshot.phoneBound(),
        snapshot.profileCompleted(),
        snapshot.campusVerified(),
        snapshot.scheduleCompleted(),
        snapshot.campusName(),
        Map.of("chat_ai_enabled", false)
    );
  }
}
