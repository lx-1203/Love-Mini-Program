import type { components } from "../services/generated/api-types";
import { statusCopyMap } from "../config/status-copy";

type Schemas = components["schemas"];

function toStatusTone(
  queueStatus: Schemas["MatchResult"]["queueStatus"]
): "brand" | "warning" {
  return queueStatus === "connected" ? "brand" : "warning";
}

function toResultLead(queueStatus: Schemas["MatchResult"]["queueStatus"]) {
  if (queueStatus === "queued") {
    return "系统还在等待对方加入，这时不会提前创建聊天会话。";
  }

  if (queueStatus === "expired") {
    return "这次连接窗口已经结束，请重新发起一轮新的匹配。";
  }

  return "会话已就绪，可以直接进入 24 小时临时聊天。";
}

export function toMatchSummary(matchResult: Schemas["MatchResult"]) {
  return {
    ...matchResult,
    statusCopy: statusCopyMap.match[matchResult.queueStatus],
    statusTone: toStatusTone(matchResult.queueStatus),
    resultLead: toResultLead(matchResult.queueStatus),
    canOpenChat: matchResult.queueStatus === "connected",
  };
}
