package com.campuslove.api.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/temp-chat/sessions")
public class TempChatController {

  private final TempChatService tempChatService;

  public TempChatController(TempChatService tempChatService) {
    this.tempChatService = tempChatService;
  }

  @PostMapping
  @PreAuthorize("hasRole('USER')")
  public TempChatSessionView createSession(@Valid @RequestBody CreateTempChatSessionRequest request) {
    return tempChatService.createSession(request.recommendedPersonId(), request.matchId());
  }

  @GetMapping("/{id}")
  public TempChatSessionView getSession(@PathVariable("id") String id) {
    return tempChatService.getSession(id);
  }

  @PostMapping("/{id}/messages")
  @PreAuthorize("hasRole('USER')")
  public TempChatSessionView sendMessage(
      @PathVariable("id") String id,
      @Valid @RequestBody ChatMessageRequest request
  ) {
    return tempChatService.sendMessage(id, request);
  }

  @PostMapping("/{id}/contact-exchange/respond")
  @PreAuthorize("hasRole('USER')")
  public TempChatSessionView respondToContactExchange(
      @PathVariable("id") String id,
      @Valid @RequestBody ContactExchangeDecisionRequest request
  ) {
    return tempChatService.respondToContactExchange(id, request);
  }

  @PostMapping("/{id}/end")
  @PreAuthorize("hasRole('USER')")
  public TempChatSessionView endSession(@PathVariable("id") String id) {
    return tempChatService.endSession(id);
  }

  @PostMapping("/{id}/pin")
  @PreAuthorize("hasRole('USER')")
  public ChatSessionSummaryView pinSession(@PathVariable("id") String id) {
    return tempChatService.pinSession(id);
  }

  @PostMapping("/{id}/unpin")
  @PreAuthorize("hasRole('USER')")
  public ChatSessionSummaryView unpinSession(@PathVariable("id") String id) {
    return tempChatService.unpinSession(id);
  }

  @PostMapping("/{id}/read")
  @PreAuthorize("hasRole('USER')")
  public ChatSessionSummaryView markSessionRead(@PathVariable("id") String id) {
    return tempChatService.markSessionRead(id);
  }

  @PostMapping("/{id}/messages/{messageId}/recall")
  @PreAuthorize("hasRole('USER')")
  public TempChatSessionView recallMessage(
      @PathVariable("id") String id,
      @PathVariable("messageId") String messageId
  ) {
    return tempChatService.recallMessage(id, messageId);
  }
}

record CreateTempChatSessionRequest(
    @Size(max = 64) String recommendedPersonId,
    @Size(max = 64) String matchId
) {
  @AssertTrue(message = "recommendedPersonId or matchId is required")
  boolean hasEntryPoint() {
    return hasText(recommendedPersonId) || hasText(matchId);
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}

record TempChatSessionView(
    String id,
    String recommendedPersonId,
    String partnerName,
    String partnerHeadline,
    String availabilityHint,
    String phase,
    String closesAt,
    String closedReason,
    List<ChatMessageView> messages,
    ContactExchangeStateView contactExchange
) {
}

record ChatMessageView(
    String id,
    String sender,
    String kind,
    String body,
    String sentAt,
    Integer durationSeconds,
    boolean recalled,
    String deliveryStatus,
    String quoteRef,
    String quoteBody,
    String quoteSender
) {
  /** 兼容旧调用方式（无新增字段）的工厂方法 */
  public static ChatMessageView of(String id, String sender, String kind, String body,
                                    String sentAt, Integer durationSeconds) {
    return new ChatMessageView(id, sender, kind, body, sentAt, durationSeconds,
        false, "sent", null, null, null);
  }
}

record ChatMessageRequest(
    @NotBlank @Size(max = 16) String sender,
    @NotBlank @Pattern(regexp = "text|voice|emoji|system",
        message = "kind 必须为 text/voice/emoji/system") String kind,
    @NotBlank @Size(max = 5000) String body,
    @Min(0) @Max(3600) Integer durationSeconds,
    @Size(max = 64) String quoteRef
) {
  /** 兼容旧调用（无 quoteRef） */
  public ChatMessageRequest withoutQuote() {
    return new ChatMessageRequest(sender, kind, body, durationSeconds, null);
  }
}

record ContactExchangeStateView(String proposer, String status) {
}

record ContactExchangeDecisionRequest(
    @NotBlank @Size(max = 16) String actor,
    @NotBlank @Pattern(regexp = "accept|reject|revoke",
        message = "decision 必须为 accept/reject/revoke") String decision
) {
}
