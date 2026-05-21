import type { components } from "../../services/generated/api-types";
import { appEnv } from "../../services/env";
import { request } from "../../services/http";
import { mockFixtures } from "../../services/mocks/fixtures";

type Schemas = components["schemas"];
type TempChatSession = Schemas["TempChatSession"];
type CreateTempChatSessionRequest = Schemas["CreateTempChatSessionRequest"];
type ChatMessageRequest = Schemas["ChatMessageRequest"];
type ContactExchangeDecisionRequest = Schemas["ContactExchangeDecisionRequest"];

export type ChatTransportMode = typeof appEnv.apiMode;

export interface ChatTransport {
  createSession(payload: CreateTempChatSessionRequest): Promise<TempChatSession>;
  loadSession(sessionId: string): Promise<TempChatSession>;
  pushMessage(sessionId: string, payload: ChatMessageRequest): Promise<TempChatSession>;
  pushVoice(sessionId: string, durationSeconds: number): Promise<TempChatSession>;
  respondToContactExchange(
    sessionId: string,
    payload: ContactExchangeDecisionRequest
  ): Promise<TempChatSession>;
  endSession(sessionId: string): Promise<TempChatSession>;
}

export interface UploadAdapter {
  uploadVoice(localPath: string): Promise<{ fileUrl: string }>;
}

class MockChatTransport implements ChatTransport {
  async createSession(payload: CreateTempChatSessionRequest) {
    return mockFixtures.createTempChatSession(payload);
  }

  async loadSession(sessionId: string) {
    return mockFixtures.getTempChatSession(sessionId);
  }

  async pushMessage(sessionId: string, payload: ChatMessageRequest) {
    return mockFixtures.sendTempChatMessage(sessionId, payload);
  }

  async pushVoice(sessionId: string, durationSeconds: number) {
    return mockFixtures.sendTempChatMessage(sessionId, {
      sender: "self",
      kind: "voice",
      body: "语音消息",
      durationSeconds,
    });
  }

  async respondToContactExchange(
    sessionId: string,
    payload: ContactExchangeDecisionRequest
  ) {
    return mockFixtures.respondToContactExchange(sessionId, payload.actor, payload.decision);
  }

  async endSession(sessionId: string) {
    return mockFixtures.endTempChatSession(sessionId);
  }
}

class RealChatTransport implements ChatTransport {
  async createSession(payload: CreateTempChatSessionRequest) {
    return request<TempChatSession, CreateTempChatSessionRequest>({
      url: "/temp-chat/sessions",
      method: "POST",
      data: payload,
    });
  }

  async loadSession(sessionId: string) {
    return request<TempChatSession>({
      url: `/temp-chat/sessions/${sessionId}`,
    });
  }

  async pushMessage(sessionId: string, payload: ChatMessageRequest) {
    return request<TempChatSession, ChatMessageRequest>({
      url: `/temp-chat/sessions/${sessionId}/messages`,
      method: "POST",
      data: payload,
    });
  }

  async pushVoice(sessionId: string, durationSeconds: number) {
    return this.pushMessage(sessionId, {
      sender: "self",
      kind: "voice",
      body: "语音消息",
      durationSeconds,
    });
  }

  async respondToContactExchange(
    sessionId: string,
    payload: ContactExchangeDecisionRequest
  ) {
    return request<TempChatSession, ContactExchangeDecisionRequest>({
      url: `/temp-chat/sessions/${sessionId}/contact-exchange/respond`,
      method: "POST",
      data: payload,
    });
  }

  async endSession(sessionId: string) {
    return request<TempChatSession>({
      url: `/temp-chat/sessions/${sessionId}/end`,
      method: "POST",
    });
  }
}

export function createChatTransport(mode: ChatTransportMode = appEnv.apiMode): ChatTransport {
  return mode === "real" ? new RealChatTransport() : new MockChatTransport();
}
