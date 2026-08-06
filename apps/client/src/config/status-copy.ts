/**
 * 状态文案配置（i18n-data-review #12：硬编码中文已抽为 i18n key）。
 *
 * 说明：
 * - 对应 i18n key：config.statusCopy.*（zh/en 同步，见 i18n/locales/*.ts）；
 * - 本 map 的值保留中文兜底文案，避免在未接入 t() 的调用方（如 view-models/chat.ts）
 *   渲染出 raw key；展示层接入 i18n 时请改为经 t("config.statusCopy.xxx") 渲染，
 *   勿直接输出本 map 的值作为最终文案。
 * - 另见 #52：aiPlan.enabled 文案与后端 chat_ai_enabled=false 矛盾，属数据层面问题，
 *   由后端配置驱动（loadChatAiConfig），此处仅保留本地兜底文案。
 */
export const statusCopyMap = {
  aiPlan: {
    enabled: "AI 计划已就绪",
    fallback: "当前使用人工编辑兜底方案",
  },
  match: {
    open: "可开始匹配",
    queued: "等待对方加入",
    connected: "会话已就绪",
    expired: "会话已过期",
  },
  contactExchange: {
    idle: "未发起交换",
    pending: "等待双方确认",
    acceptedByPeer: "对方已同意",
    acceptedBySelf: "你已同意",
    completed: "交换已完成",
    rejected: "交换已关闭",
  },
  /** view-models/chat.ts 的会话操作文案（i18n key: config.statusCopy.chatAction.*） */
  chatAction: {
    completeSetup: "先完成设置",
    goChat: "去聊天",
  },
  /** view-models/chat.ts 的会话状态文案（i18n key: config.statusCopy.chatStatus.*） */
  chatStatus: {
    ended: "聊天已结束",
    closed: "聊天已关闭",
    waitingOpen: "等待你开场",
  },
} as const;
