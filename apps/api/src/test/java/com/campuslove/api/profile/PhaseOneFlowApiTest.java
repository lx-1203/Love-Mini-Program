package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.campuslove.api.testdata.MockAllRepositoriesConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Phase One 端到端流程 API 测试（mock profile）。
 *
 * <p>说明：ProfileController / ProfileVisitorController 为 {@code @Profile("real")} 专属，
 * mock profile 下不存在 /api/v1/profile/** 的 HTTP 端点（前端走本地 mockFixtures）。
 * 因此本测试中「保存资料推进会话完成状态」链路通过注入的 {@link ProfileService}
 * （mock profile 下为 {@link MockProfileService}，与 real 实现接口语义等价）完成，
 * 并继续通过 /api/v1/auth/me 验证资料保存后会话完成状态（profileCompleted /
 * campusVerified / scheduleCompleted / campusName / displayName）被推进。</p>
 */
@SpringBootTest(properties = "JWT_SECRET=test-jwt-secret-for-phase-one-flow-tests-32-chars-min")
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@Import(MockAllRepositoriesConfig.class)
class PhaseOneFlowApiTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private ProfileService profileService;

  @Test
  void profileSavesAdvanceSessionCompletionState() throws Exception {
    mockMvc.perform(post("/api/v1/auth/wechat-login")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "wechat-code"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.loggedIn").value(true));

    // mock profile 下无 /api/v1/profile/** HTTP 端点（ProfileController 为 real 专属），
    // 通过注入的 ProfileService（mock 实现 MockProfileService）保存基本资料/校园资料/课表资料，
    // 语义与 real 端点的保存链路等价，随后由 /api/v1/auth/me 验证会话完成状态被推进。
    BasicProfileView basic = profileService.saveBasicProfile(
        new BasicProfileRequest("若星", "安静而明确", "大三", "她/她",
            null, null, null, null, null, null, null));
    assertEquals("若星", basic.nickname());

    CampusProfileView campus = profileService.saveCampusProfile(
        new CampusProfileRequest("广州", "北校区", "设计系"));
    assertEquals("pending", campus.verificationStatus());

    ScheduleProfileView schedule = profileService.saveScheduleProfile(
        new ScheduleProfileRequest("图书馆", List.of("今晚"), List.of()));
    assertEquals("图书馆", schedule.preferredCampusArea());

    mockMvc.perform(get("/api/v1/auth/me"))
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
    mockMvc.perform(post("/api/v1/auth/wechat-login")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "wechat-code"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.loggedIn").value(true));

    mockMvc.perform(get("/api/v1/home/dashboard"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recommendedPeople.length()").value(5))
        .andExpect(jsonPath("$.activityPreview.items.length()").value(2));

    mockMvc.perform(get("/api/v1/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(0))
        .andExpect(jsonPath("$.recommendedPeople.length()").value(5));

    MvcResult createdSession = mockMvc.perform(post("/api/v1/temp-chat/sessions")
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

    mockMvc.perform(get("/api/v1/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions.length()").value(1))
        .andExpect(jsonPath("$.sessions[0].id").value(sessionId))
        .andExpect(jsonPath("$.sessions[0].lastMessagePreview").value("刚建立临时会话，等你开场。"))
        .andExpect(jsonPath("$.sessions[0].pinned").value(false))
        .andExpect(jsonPath("$.sessions[0].unreadCount").value(0));

    mockMvc.perform(post("/api/v1/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-1"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(sessionId));

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/messages", sessionId)
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

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/contact-exchange/respond", sessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "actor": "self",
                  "decision": "accept"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactExchange.status").value("accepted-by-self"));

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/contact-exchange/respond", sessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "actor": "peer",
                  "decision": "accept"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactExchange.status").value("completed"));

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/end", sessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phase").value("closed"))
        .andExpect(jsonPath("$.closedReason").value("ended"));

    mockMvc.perform(get("/api/v1/temp-chat/sessions/{id}", sessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.phase").value("closed"))
        .andExpect(jsonPath("$.closedReason").value("ended"));

    mockMvc.perform(get("/api/v1/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions[0].id").value(sessionId))
        .andExpect(jsonPath("$.sessions[0].phase").value("closed"))
        .andExpect(jsonPath("$.sessions[0].contactExchangeStatus").value("completed"));

    mockMvc.perform(post("/api/v1/feedback/issues")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "title": "需要更清楚的超时提示",
                  "content": "会话结束时的提示还可以更明确。"
                }
                """))
        .andExpect(status().isAccepted())
        .andExpect(jsonPath("$.data.type").value("FEEDBACK"));

    mockMvc.perform(get("/api/v1/feedback/my-submissions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data[0].title").value("需要更清楚的超时提示"));
  }

  @Test
  void matchDebugEndpointCanStageQueuedAndExpiredResults() throws Exception {
    mockMvc.perform(post("/api/v1/_debug/matches/next-status/queued"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextQueueStatus").value("queued"));

    mockMvc.perform(post("/api/v1/matches")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "userId": 1,
                  "matchIntent": "topic",
                  "topicIds": ["music"],
                  "timeWindow": "今晚",
                  "durationMinutes": 30
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.queueStatus").value("queued"));

    mockMvc.perform(post("/api/v1/_debug/matches/next-status/expired"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextQueueStatus").value("expired"));

    mockMvc.perform(post("/api/v1/matches/quick")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "userId": 1,
                  "durationMinutes": 15
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.queueStatus").value("expired"))
        .andExpect(jsonPath("$.countdownMinutes").value(0));

    mockMvc.perform(post("/api/v1/_debug/matches/next-status/invalid"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void chatOverviewSupportsPinningAndUnreadClearing() throws Exception {
    JsonNode firstSession = objectMapper.readTree(mockMvc.perform(post("/api/v1/temp-chat/sessions")
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

    mockMvc.perform(post("/api/v1/temp-chat/sessions")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "recommendedPersonId": "person-2"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/messages", firstSessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "sender": "peer",
                  "kind": "text",
                  "body": "今晚图书馆门口见。"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/messages", firstSessionId)
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "sender": "peer",
                  "kind": "text",
                  "body": "我 19:30 之后有空。"
                }
                """))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/pin", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(true))
        .andExpect(jsonPath("$.unreadCount").value(2));

    mockMvc.perform(get("/api/v1/chat/overview"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sessions[0].id").value(firstSessionId))
        .andExpect(jsonPath("$.sessions[0].pinned").value(true))
        .andExpect(jsonPath("$.sessions[0].unreadCount").value(2));

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/read", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unreadCount").value(0));

    mockMvc.perform(post("/api/v1/temp-chat/sessions/{id}/unpin", firstSessionId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pinned").value(false));
  }

  @Test
  void debugEndpointsExposeExpectedErrorShapes() throws Exception {
    mockMvc.perform(post("/api/v1/_debug/errors/400"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("bad_request"))
        .andExpect(jsonPath("$.message").value("模拟校验错误"));

    mockMvc.perform(post("/api/v1/_debug/errors/404"))
        .andExpect(status().isNotFound());

    mockMvc.perform(post("/api/v1/_debug/errors/500"))
        .andExpect(status().isInternalServerError());
  }
}
