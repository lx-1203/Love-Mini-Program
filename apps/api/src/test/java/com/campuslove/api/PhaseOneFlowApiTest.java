package com.campuslove.api;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-phase-one-flow-tests-32-chars-min")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PhaseOneFlowApiTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Test
  void profileSavesAdvanceSessionCompletionState() throws Exception {
    mockMvc.perform(post("/api/auth/wechat-login")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "wechat-code"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.loggedIn").value(true));

    mockMvc.perform(put("/api/profile/basic")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "nickname": "若星",
                  "bio": "安静而明确",
                  "grade": "大三",
                  "pronouns": "她/她"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nickname").value("若星"));

    mockMvc.perform(put("/api/profile/campus")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "city": "广州",
                  "campusName": "北校区",
                  "department": "设计系"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.verificationStatus").value("pending"));

    mockMvc.perform(put("/api/profile/schedule")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "preferredCampusArea": "图书馆",
                  "preferredTimeWindows": ["今晚"],
                  "courseBlocks": []
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.preferredCampusArea").value("图书馆"));

    mockMvc.perform(get("/api/auth/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.loggedIn").value(true))
        .andExpect(jsonPath("$.displayName").value("若星"))
        .andExpect(jsonPath("$.profileCompleted").value(true))
        .andExpect(jsonPath("$.campusVerified").value(true))
        .andExpect(jsonPath("$.scheduleCompleted").value(true))
        .andExpect(jsonPath("$.campusName").value("北校区"));
  }

  @Test
  void homeChatAndFeedbackFlowsRetainMutableState() throws Exception {
    mockMvc.perform(post("/api/auth/wechat-login")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "wechat-code"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.loggedIn").value(true));

    mockMvc.perform(get("/api/home/dashboard"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recommendedPeople.length()").value(5))
        .andExpect(jsonPath("$.activityPreview.items.length()").value(2));

    mockMvc.perform(get("/api/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(0))
        .andExpect(jsonPath("$.recommendedPeople.length()").value(5));

    MvcResult createdSession = mockMvc.perform(post("/api/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-1"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recommendedPersonId").value("person-1"))
        .andExpect(jsonPath("$.phase").value("matching"))
        .andExpect(jsonPath("$.contactExchange.status").value("idle"))
        .andReturn();

    JsonNode sessionNode = objectMapper.readTree(createdSession.getResponse().getContentAsString());
    String sessionId = sessionNode.get("id").asText();

    mockMvc.perform(get("/api/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(1))
        .andExpect(jsonPath("$.sessions[0].id").value(sessionId))
        .andExpect(jsonPath("$.sessions[0].lastMessagePreview").value("刚建立临时会话，等你开场。"))
        .andExpect(jsonPath("$.sessions[0].pinned").value(false))
        .andExpect(jsonPath("$.sessions[0].unreadCount").value(0));

    mockMvc.perform(post("/api/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-1"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sessionId));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/messages", sessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "sender": "self",
                  "kind": "text",
                  "body": "你好"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phase").value("active"))
        .andExpect(jsonPath("$.messages.length()").value(1));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/contact-exchange/respond", sessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "actor": "self",
                  "decision": "accepted"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactExchange.status").value("accepted-by-self"));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/contact-exchange/respond", sessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "actor": "peer",
                  "decision": "accepted"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactExchange.status").value("completed"));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/end", sessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phase").value("closed"))
        .andExpect(jsonPath("$.closedReason").value("ended"));

    mockMvc.perform(get("/api/temp-chat/sessions/{id}", sessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phase").value("closed"))
        .andExpect(jsonPath("$.closedReason").value("ended"));

    mockMvc.perform(get("/api/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions[0].id").value(sessionId))
        .andExpect(jsonPath("$.sessions[0].phase").value("closed"))
        .andExpect(jsonPath("$.sessions[0].contactExchangeStatus").value("completed"));

    mockMvc.perform(post("/api/feedback/issues")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "title": "需要更清楚的超时提示",
                  "content": "会话结束时的提示还可以更明确。"
                }
                """))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.type").value("FEEDBACK"));

    mockMvc.perform(get("/api/feedback/my-submissions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("需要更清楚的超时提示"));
  }

  @Test
  void matchDebugEndpointCanStageQueuedAndExpiredResults() throws Exception {
    mockMvc.perform(post("/api/_debug/matches/next-status/queued"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextQueueStatus").value("queued"));

    mockMvc.perform(post("/api/matches")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "matchIntent": "topic",
                  "topicIds": ["music"],
                  "timeWindow": "今晚",
                  "durationMinutes": 30
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.queueStatus").value("queued"));

    mockMvc.perform(post("/api/_debug/matches/next-status/expired"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextQueueStatus").value("expired"));

    mockMvc.perform(post("/api/matches/quick")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "durationMinutes": 15
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.queueStatus").value("expired"))
        .andExpect(jsonPath("$.countdownMinutes").value(0));

    mockMvc.perform(post("/api/_debug/matches/next-status/invalid"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void chatOverviewSupportsPinningAndUnreadClearing() throws Exception {
    JsonNode firstSession = objectMapper.readTree(mockMvc.perform(post("/api/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-1"
                }
                """))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString());
    String firstSessionId = firstSession.get("id").asText();

    mockMvc.perform(post("/api/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-2"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/messages", firstSessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "sender": "peer",
                  "kind": "text",
                  "body": "今晚图书馆门口见。"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/messages", firstSessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "sender": "peer",
                  "kind": "text",
                  "body": "我 19:30 之后有空。"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/pin", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(true))
        .andExpect(jsonPath("$.unreadCount").value(2));

    mockMvc.perform(get("/api/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions[0].id").value(firstSessionId))
        .andExpect(jsonPath("$.sessions[0].pinned").value(true))
        .andExpect(jsonPath("$.sessions[0].unreadCount").value(2));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/read", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));

    mockMvc.perform(post("/api/temp-chat/sessions/{id}/unpin", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(false));
  }

  @Test
  void debugEndpointsExposeExpectedErrorShapes() throws Exception {
    mockMvc.perform(post("/api/_debug/errors/400"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("bad_request"))
        .andExpect(jsonPath("$.message").value("模拟校验错误"));

    mockMvc.perform(post("/api/_debug/errors/404"))
        .andExpect(status().isNotFound());

    mockMvc.perform(post("/api/_debug/errors/500"))
        .andExpect(status().isInternalServerError());
  }
}
