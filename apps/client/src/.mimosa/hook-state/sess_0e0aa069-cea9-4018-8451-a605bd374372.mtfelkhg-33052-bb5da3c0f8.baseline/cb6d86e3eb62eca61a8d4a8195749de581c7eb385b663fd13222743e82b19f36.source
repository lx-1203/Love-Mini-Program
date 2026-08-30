export type ChatPhase = "matching" | "active" | "closing" | "closed";
export type ChatMessageKind = "text" | "voice" | "emoji" | "system";
export type ChatSender = "self" | "peer" | "system";
export type ContactExchangeStatus =
  | "idle"
  | "pending"
  | "accepted-by-self"
  | "accepted-by-peer"
  | "completed"
  | "rejected";

export interface ChatMessageInput {
  id: string;
  kind: ChatMessageKind;
  sender: ChatSender;
  body: string;
  sentAt: string;
  durationSeconds?: number;
}

export interface ChatSessionState {
  id: string;
  phase: ChatPhase;
  closesAt?: string;
  closedReason?: "expired" | "ended";
  messages: ChatMessageInput[];
  contactExchange: {
    proposer?: "self" | "peer";
    status: ContactExchangeStatus;
  };
}

export function createSessionState(id: string): ChatSessionState {
  return {
    id,
    phase: "matching",
    messages: [],
    contactExchange: {
      status: "idle",
    },
  };
}

export function sendUserMessage(
  state: ChatSessionState,
  message: ChatMessageInput
): ChatSessionState {
  return {
    ...state,
    phase: "active",
    messages: [...state.messages, message],
  };
}

export function proposeContactExchange(
  state: ChatSessionState,
  proposer: "self" | "peer"
): ChatSessionState {
  return {
    ...state,
    contactExchange: {
      proposer,
      status: "pending",
    },
  };
}

export function respondToContactExchange(
  state: ChatSessionState,
  actor: "self" | "peer",
  decision: "accepted" | "rejected"
): ChatSessionState {
  if (decision === "rejected") {
    return {
      ...state,
      contactExchange: {
        proposer: state.contactExchange.proposer,
        status: "rejected",
      },
    };
  }

  const current = state.contactExchange.status;
  let nextStatus: ContactExchangeStatus;
  if (current === "accepted-by-self" && actor === "peer") {
    nextStatus = "completed";
  } else if (current === "accepted-by-peer" && actor === "self") {
    nextStatus = "completed";
  } else {
    nextStatus = actor === "self" ? "accepted-by-self" : "accepted-by-peer";
  }

  return {
    ...state,
    contactExchange: {
      proposer: state.contactExchange.proposer,
      status: nextStatus,
    },
  };
}

export function sendSystemTimeout(
  state: ChatSessionState,
  closedAt: string
): ChatSessionState {
  return {
    ...state,
    phase: "closed",
    closedReason: "expired",
    closesAt: closedAt,
  };
}
