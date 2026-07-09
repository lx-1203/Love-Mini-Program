package com.campuslove.api.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/temp-chat/sessions")
public class TempChatController {

  private final TempChatService tempChatService;

  public TempChatController(TempChatService tempChatService) {
    this.tempChatService = tempChatService;
  }

  @PostMapping
  public TempChatSessionView createSession(@Valid @RequestBody CreateTempChatSessionRequest request) {
    return tempChatService.createSession(request.recommendedPersonId(), request.matchId());
  }

  @GetMapping("/{id}")
  public TempChatSessionView getSession(@PathVariable("id") String id) {
    return tempChatService.getSession(id);
  }

  @PostMapping("/{id}/messages")
  public TempChatSessionView sendMessage(
      @PathVariable("id") String id,
      @Valid @RequestBody ChatMessageRequest request
  ) {
    return tempChatService.sendMessage(id, request);
  }

  @PostMapping("/{id}/contact-exchange/respond")
  public TempChatSessionView respondToContactExchange(
      @PathVariable("id") String id,
      @Valid @RequestBody ContactExchangeDecisionRequest request
  ) {
    return tempChatService.respondToContactExchange(id, request);
  }

  @PostMapping("/{id}/end")
  public TempChatSessionView endSession(@PathVariable("id") String id) {
    return tempChatService.endSession(id);
  }

  @PostMapping("/{id}/pin")
  public ChatSessionSummaryView pinSession(@PathVariable("id") String id) {
    return tempChatService.pinSession(id);
  }

  @PostMapping("/{id}/unpin")
  public ChatSessionSummaryView unpinSession(@PathVariable("id") String id) {
    return tempChatService.unpinSession(id);
  }

  @PostMapping("/{id}/read")
  public ChatSessionSummaryView markSessionRead(@PathVariable("id") String id) {
    return tempChatService.markSessionRead(id);
  }

  @PostMapping("/{id}/messages/{messageId}/recall")
  public TempChatSessionView recallMessage(
      @PathVariable("id") String id,
      @PathVariable("messageId") String messageId
  ) {
    return tempChatService.recallMessage(id, messageId);
  }
}

record CreateTempChatSessionRequest(
    String recommendedPersonId,
    String matchId
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
    @NotBlank String sender,
    @NotBlank String kind,
    @NotBlank String body,
    Integer durationSeconds,
    String quoteRef
) {
  /** 兼容旧调用（无 quoteRef） */
  public ChatMessageRequest withoutQuote() {
    return new ChatMessageRequest(sender, kind, body, durationSeconds, null);
  }
}

record ContactExchangeStateView(String proposer, String status) {
}

record ContactExchangeDecisionRequest(
    @NotBlank String actor,
    @NotBlank String decision
) {
}
