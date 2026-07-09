package com.campuslove.api.chat;

import com.campuslove.api.runtime.MockRuntimeState;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock 临时聊天服务实现。
 * 在 mock profile 下激活，使用 MockRuntimeState 和内存存储返回模拟数据。
 */
@Profile("mock")
@Service
public class MockTempChatService implements TempChatService {

  private final MockRuntimeState runtimeState;
  private final AtomicLong generatedSessionIds = new AtomicLong(1);
  private final Map<String, SessionState> sessionsById = new LinkedHashMap<>();
  private final Map<String, String> activeSessionIdsByPersonId = new LinkedHashMap<>();

  public MockTempChatService(MockRuntimeState runtimeState) {
    this.runtimeState = runtimeState;
  }

  @Override
  public ChatOverviewView getOverview() {
    return new ChatOverviewView(
        listSessions(),
        "还没有临时会话时，继续从推荐的人进入。",
        runtimeState.recommendedPeople().stream()
            .map(this::toRecommendedPersonCard)
            .toList()
    );
  }

  @Override
  public List<ChatSessionSummaryView> listSessions() {
    return sessionsById.values().stream()
        .sorted(Comparator.comparing(SessionState::pinned).reversed()
            .thenComparing(SessionState::updatedAt, Comparator.reverseOrder()))
        .map(this::toSummary)
        .toList();
  }

  @Override
  public TempChatSessionView createSession(String recommendedPersonId, String matchId) {
    MockRuntimeState.RecommendedPersonData person = resolvePerson(recommendedPersonId, matchId);
    String existingId = activeSessionIdsByPersonId.get(person.id());

    if (existingId != null) {
      SessionState existing = sessionsById.get(existingId);
      if (existing != null && !"closed".equals(existing.session().phase())) {
        return existing.session();
      }
    }

    String sessionId = hasText(matchId) ? "session-" + matchId : "session-" + generatedSessionIds.getAndIncrement();
    TempChatSessionView session = newSession(sessionId, person);
    SessionState state = new SessionState(person, session, Instant.now(), false, 0);
    sessionsById.put(sessionId, state);
    activeSessionIdsByPersonId.put(person.id(), sessionId);
    return session;
  }

  @Override
  public TempChatSessionView getSession(String id) {
    return sessionsById.computeIfAbsent(id, key -> {
      MockRuntimeState.RecommendedPersonData person = runtimeState.recommendedPeople().get(0);
      return new SessionState(person, newSession(key, person), Instant.now(), false, 0);
    }).session();
  }

  @Override
  public TempChatSessionView sendMessage(String id, ChatMessageRequest request) {
    SessionState current = getSessionState(id);

    if ("closed".equals(current.session().phase())) {
      return current.session();
    }

    List<ChatMessageView> messages = new ArrayList<>(current.session().messages());

    // 构建引用快照
    String qRef = request.quoteRef();
    String qBody = null;
    String qSender = null;
    if (hasText(qRef)) {
      for (ChatMessageView m : messages) {
        if (qRef.equals(m.id())) {
          qBody = m.body();
          qSender = m.sender();
          break;
        }
      }
    }

    messages.add(new ChatMessageView(
        "m-" + Instant.now().toEpochMilli(),
        request.sender(),
        request.kind(),
        request.body(),
        Instant.now().toString(),
        request.durationSeconds(),
        false,
        "sent",
        qRef,
        qBody,
        qSender
    ));

    TempChatSessionView updated = new TempChatSessionView(
        id,
        current.person().id(),
        current.person().name(),
        current.person().headline(),
        current.person().availability(),
        "active",
        current.session().closesAt(),
        null,
        List.copyOf(messages),
        current.session().contactExchange()
    );
    int unreadCount = "peer".equals(request.sender())
        ? current.unreadCount() + 1
        : current.unreadCount();
    saveState(id, current.person(), updated, current.pinned(), unreadCount);
    return updated;
  }

  @Override
  public TempChatSessionView respondToContactExchange(String id, ContactExchangeDecisionRequest request) {
    SessionState current = getSessionState(id);

    if ("closed".equals(current.session().phase())) {
      return current.session();
    }

    String status = resolveExchangeStatus(
        current.session().contactExchange().status(),
        request.actor(),
        request.decision()
    );
    String proposer = current.session().contactExchange().proposer() == null
        ? request.actor()
        : current.session().contactExchange().proposer();

    TempChatSessionView updated = new TempChatSessionView(
        id,
        current.person().id(),
        current.person().name(),
        current.person().headline(),
        current.person().availability(),
        current.session().phase(),
        current.session().closesAt(),
        current.session().closedReason(),
        current.session().messages(),
        new ContactExchangeStateView(proposer, status)
    );
    saveState(id, current.person(), updated, current.pinned(), current.unreadCount());
    return updated;
  }

  @Override
  public TempChatSessionView endSession(String id) {
    SessionState current = getSessionState(id);

    if ("closed".equals(current.session().phase())) {
      return current.session();
    }

    TempChatSessionView updated = new TempChatSessionView(
        id,
        current.person().id(),
        current.person().name(),
        current.person().headline(),
        current.person().availability(),
        "closed",
        Instant.now().toString(),
        "ended",
        current.session().messages(),
        current.session().contactExchange()
    );
    saveState(id, current.person(), updated, current.pinned(), current.unreadCount());
    return updated;
  }

  @Override
  public ChatSessionSummaryView pinSession(String id) {
    SessionState current = getSessionState(id);
    SessionState updated = new SessionState(
        current.person(),
        current.session(),
        current.updatedAt(),
        true,
        current.unreadCount()
    );
    sessionsById.put(id, updated);
    return toSummary(updated);
  }

  @Override
  public ChatSessionSummaryView unpinSession(String id) {
    SessionState current = getSessionState(id);
    SessionState updated = new SessionState(
        current.person(),
        current.session(),
        current.updatedAt(),
        false,
        current.unreadCount()
    );
    sessionsById.put(id, updated);
    return toSummary(updated);
  }

  @Override
  public ChatSessionSummaryView markSessionRead(String id) {
    SessionState current = getSessionState(id);
    // 同时将对方发送的消息 deliveryStatus 更新为 "read"
    List<ChatMessageView> updatedMessages = current.session().messages().stream()
        .map(m -> "peer".equals(m.sender()) && "delivered".equals(m.deliveryStatus())
            ? new ChatMessageView(m.id(), m.sender(), m.kind(), m.body(), m.sentAt(),
                m.durationSeconds(), m.recalled(), "read", m.quoteRef(), m.quoteBody(), m.quoteSender())
            : m)
        .toList();
    TempChatSessionView updatedSession = new TempChatSessionView(
        id, current.person().id(), current.person().name(), current.person().headline(),
        current.person().availability(), current.session().phase(), current.session().closesAt(),
        current.session().closedReason(), updatedMessages, current.session().contactExchange()
    );
    SessionState updated = new SessionState(current.person(), updatedSession, current.updatedAt(), current.pinned(), 0);
    sessionsById.put(id, updated);
    return toSummary(updated);
  }

  @Override
  public TempChatSessionView recallMessage(String sessionId, String messageId) {
    SessionState current = getSessionState(sessionId);

    List<ChatMessageView> messages = current.session().messages().stream()
        .map(m -> messageId.equals(m.id())
            ? new ChatMessageView(m.id(), m.sender(), m.kind(),
                "[已撤回]", m.sentAt(), m.durationSeconds(),
                true, m.deliveryStatus(), m.quoteRef(), m.quoteBody(), m.quoteSender())
            : m)
        .toList();

    TempChatSessionView updated = new TempChatSessionView(
        sessionId, current.person().id(), current.person().name(), current.person().headline(),
        current.person().availability(), current.session().phase(), current.session().closesAt(),
        current.session().closedReason(), messages, current.session().contactExchange()
    );
    saveState(sessionId, current.person(), updated, current.pinned(), current.unreadCount());
    return updated;
  }

  private SessionState getSessionState(String id) {
    getSession(id);
    return sessionsById.get(id);
  }

  private void saveState(
      String sessionId,
      MockRuntimeState.RecommendedPersonData person,
      TempChatSessionView session,
      boolean pinned,
      int unreadCount
  ) {
    sessionsById.put(sessionId, new SessionState(person, session, Instant.now(), pinned, unreadCount));
    if (!"closed".equals(session.phase())) {
      activeSessionIdsByPersonId.put(person.id(), sessionId);
    }
  }

  private TempChatSessionView newSession(
      String id,
      MockRuntimeState.RecommendedPersonData person
  ) {
    return new TempChatSessionView(
        id,
        person.id(),
        person.name(),
        person.headline(),
        person.availability(),
        "matching",
        Instant.now().plusSeconds(24 * 60 * 60).toString(),
        null,
        List.of(),
        new ContactExchangeStateView(null, "idle")
    );
  }

  private MockRuntimeState.RecommendedPersonData resolvePerson(String recommendedPersonId, String matchId) {
    if (hasText(recommendedPersonId)) {
      return runtimeState.recommendedPeople().stream()
          .filter(item -> item.id().equals(recommendedPersonId))
          .findFirst()
          .orElse(runtimeState.recommendedPeople().get(0));
    }

    if (!runtimeState.recommendedPeople().isEmpty()) {
      int index = Math.floorMod(matchId == null ? 0 : matchId.hashCode(), runtimeState.recommendedPeople().size());
      return runtimeState.recommendedPeople().get(index);
    }

    throw new IllegalStateException("No recommended people configured");
  }

  private RecommendedPersonCardView toRecommendedPersonCard(MockRuntimeState.RecommendedPersonData person) {
    return new RecommendedPersonCardView(
        person.id(),
        person.name(),
        person.initials(),
        person.headline(),
        person.commonGround(),
        person.availability()
    );
  }

  private ChatSessionSummaryView toSummary(SessionState state) {
    ChatMessageView lastMessage = state.session().messages().isEmpty()
        ? null
        : state.session().messages().get(state.session().messages().size() - 1);

    return new ChatSessionSummaryView(
        state.session().id(),
        state.person().id(),
        state.person().name(),
        state.person().headline(),
        state.person().availability(),
        state.session().phase(),
        state.session().closesAt(),
        state.session().closedReason(),
        lastMessage == null ? "刚建立临时会话，等你开场。" : toPreview(lastMessage),
        lastMessage == null ? null : lastMessage.sentAt(),
        state.session().contactExchange().status(),
        state.pinned(),
        state.unreadCount()
    );
  }

  private String toPreview(ChatMessageView message) {
    if (message.recalled()) {
      return "[已撤回]";
    }
    return switch (message.kind()) {
      case "voice" -> "语音消息";
      case "emoji" -> "表情消息";
      case "system" -> message.body();
      default -> message.body();
    };
  }

  private String resolveExchangeStatus(String currentStatus, String actor, String decision) {
    if ("rejected".equals(decision)) {
      return "rejected";
    }
    if ("self".equals(actor)) {
      return "accepted-by-peer".equals(currentStatus) ? "completed" : "accepted-by-self";
    }
    return "accepted-by-self".equals(currentStatus) ? "completed" : "accepted-by-peer";
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private record SessionState(
      MockRuntimeState.RecommendedPersonData person,
      TempChatSessionView session,
      Instant updatedAt,
      boolean pinned,
      int unreadCount
  ) {
  }
}
