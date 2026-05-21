import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";
import { toChatOverviewView, toChatSessionView } from "../view-models/chat";
import { createChatTransport } from "../features/chat/transport";

const chatTransport = createChatTransport();

export const useChatStore = defineStore("chat", {
  state: () => ({
    loadingOverview: false,
    loadingSession: false,
    errorMessage: null as string | null,
    overview: null as Awaited<ReturnType<typeof clientApi.getChatOverview>> | null,
    overviewView: null as ReturnType<typeof toChatOverviewView> | null,
    activeSession: null as ReturnType<typeof toChatSessionView> | null,
  }),
  actions: {
    async loadOverview() {
      this.loadingOverview = true;
      this.errorMessage = null;

      try {
        const sessionStore = useSessionStore();
        this.overview = await clientApi.getChatOverview();
        this.overviewView = toChatOverviewView(this.overview, sessionStore.completionState);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "聊天页加载失败";
      } finally {
        this.loadingOverview = false;
      }
    },
    async startFromRecommendation(recommendedPersonId: string) {
      const session = await chatTransport.createSession({ recommendedPersonId });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
      return this.activeSession;
    },
    async startFromMatch(matchId: string) {
      const session = await chatTransport.createSession({ matchId });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
      return this.activeSession;
    },
    async loadSession(sessionId: string) {
      this.loadingSession = true;
      this.errorMessage = null;

      try {
        const session = await chatTransport.loadSession(sessionId);
        this.activeSession = toChatSessionView(session);
        await clientApi.markTempChatSessionRead(sessionId);
        await this.loadOverview();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "聊天详情加载失败";
      } finally {
        this.loadingSession = false;
      }
    },
    async setSessionPinned(sessionId: string, pinned: boolean) {
      this.errorMessage = null;

      try {
        if (pinned) {
          await clientApi.pinTempChatSession(sessionId);
        } else {
          await clientApi.unpinTempChatSession(sessionId);
        }

        await this.loadOverview();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "会话置顶状态更新失败";
      }
    },
    async sendText(body: string) {
      if (!this.activeSession) {
        return;
      }

      const session = await chatTransport.pushMessage(this.activeSession.id, {
        sender: "self",
        kind: "text",
        body,
        durationSeconds: null,
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async sendVoice(durationSeconds: number) {
      if (!this.activeSession) {
        return;
      }

      const session = await chatTransport.pushVoice(this.activeSession.id, durationSeconds);
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async acceptExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      const session = await chatTransport.respondToContactExchange(this.activeSession.id, {
        actor,
        decision: "accepted",
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async rejectExchange(actor: "self" | "peer") {
      if (!this.activeSession) {
        return;
      }

      const session = await chatTransport.respondToContactExchange(this.activeSession.id, {
        actor,
        decision: "rejected",
      });
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
    async endSession() {
      if (!this.activeSession) {
        return;
      }

      const session = await chatTransport.endSession(this.activeSession.id);
      this.activeSession = toChatSessionView(session);
      await this.loadOverview();
    },
  },
});
