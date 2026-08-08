/**
 * 官方号 code 常量（R4-00081：收敛散落的硬编码 "official-assistant" / "official-promoter"）。
 *
 * 说明：
 * - 官方号列表的真实数据源为 GET /official-accounts 响应（后端可增删），
 *   本文件仅收敛「已知官方号」的 code，供默认值/兜底/入口跳转使用；
 *   实时列表应以接口响应为准（见 stores/messages.ts fetchSessions real 分支）。
 */
export const OFFICIAL_ACCOUNT_CODES = {
  /** 产品助手号（系统通知/助手消息） */
  ASSISTANT: "official-assistant",
  /** 活动运营号 */
  PROMOTER: "official-promoter",
} as const;

/** 官方号 code 联合类型 */
export type OfficialAccountCode = (typeof OFFICIAL_ACCOUNT_CODES)[keyof typeof OFFICIAL_ACCOUNT_CODES];
