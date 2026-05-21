package com.campuslove.api.chat;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

  private final TempChatService tempChatService;

  public ChatController(TempChatService tempChatService) {
    this.tempChatService = tempChatService;
  }

  @GetMapping("/overview")
  public ChatOverviewView getOverview() {
    return tempChatService.getOverview();
  }
}

record ChatOverviewView(
    List<ChatSessionSummaryView> sessions,
    String emptyStateLead,
    List<RecommendedPersonCardView> recommendedPeople
) {
}

record ChatSessionSummaryView(
    String id,
    String recommendedPersonId,
    String partnerName,
    String partnerHeadline,
    String availabilityHint,
    String phase,
    String closesAt,
    String closedReason,
    String lastMessagePreview,
    String lastMessageSentAt,
    String contactExchangeStatus,
    boolean pinned,
    int unreadCount
) {
}

record RecommendedPersonCardView(
    String id,
    String name,
    String initials,
    String headline,
    String commonGround,
    String availability
) {
}
