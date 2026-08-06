import type { components } from "../services/generated/api-types";
import { statusCopyMap } from "../config/status-copy";
// 修复 no-duplicate-imports：合并 ./home 的重复 import
import { type HomeCompletionState, getHomeSetupTasks } from "./home";

type Schemas = components["schemas"];

export interface ChatRecommendationActionView {
  label: string;
  mode: "complete-setup" | "go-chat";
  target: string;
}

export type ChatRecommendedPersonView = Schemas["RecommendedPersonSummary"] & {
  action: ChatRecommendationActionView;
};

export type ChatSessionSummaryView = Schemas["ChatSessionSummary"] & {
  statusLabel: string;
};

export interface ChatOverviewView {
  sessions: ChatSessionSummaryView[];
  emptyStateLead: string;
  recommendedPeople: ChatRecommendedPersonView[];
}

function matchesSearchText(session: ChatSessionSummaryView, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    session.partnerName,
    session.partnerHeadline,
    session.availabilityHint,
    session.lastMessagePreview,
    session.statusLabel,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function getRecommendationAction(completion: HomeCompletionState): ChatRecommendationActionView {
  const tasks = getHomeSetupTasks(completion);

  if (tasks.length > 0) {
    return {
      label: statusCopyMap.chatAction.completeSetup,
      mode: "complete-setup",
      target: tasks[0]!.path,
    };
  }

  return {
    label: statusCopyMap.chatAction.goChat,
    mode: "go-chat",
    target: "/pages/chat/index",
  };
}

function toContactExchangeLabel(status: Schemas["ContactExchangeState"]["status"]) {
  return status === "accepted-by-peer"
    ? statusCopyMap.contactExchange.acceptedByPeer
    : status === "accepted-by-self"
      ? statusCopyMap.contactExchange.acceptedBySelf
      : status === "completed"
        ? statusCopyMap.contactExchange.completed
        : status === "rejected"
          ? statusCopyMap.contactExchange.rejected
          : status === "pending"
            ? statusCopyMap.contactExchange.pending
            : statusCopyMap.contactExchange.idle;
}

function toSessionStatusLabel(session: Schemas["ChatSessionSummary"]) {
  if (session.phase === "closed") {
    return session.closedReason === "ended"
      ? statusCopyMap.chatStatus.ended
      : statusCopyMap.chatStatus.closed;
  }

  if (session.phase === "matching") {
    return statusCopyMap.chatStatus.waitingOpen;
  }

  return toContactExchangeLabel(session.contactExchangeStatus);
}

export function toChatOverviewView(
  overview: Schemas["ChatOverview"],
  completion: HomeCompletionState
): ChatOverviewView {
  const action = getRecommendationAction(completion);

  return {
    sessions: overview.sessions.map((session) => ({
      ...session,
      statusLabel: toSessionStatusLabel(session),
    })),
    emptyStateLead: overview.emptyStateLead,
    recommendedPeople: overview.recommendedPeople.map((person) => ({
      ...person,
      action,
    })),
  };
}

export function filterChatSessions(sessions: ChatSessionSummaryView[], query: string) {
  return sessions.filter((session) => matchesSearchText(session, query));
}

export function toChatSessionView(session: Schemas["TempChatSession"]) {
  return {
    ...session,
    contactExchangeLabel: toContactExchangeLabel(session.contactExchange.status),
  };
}
