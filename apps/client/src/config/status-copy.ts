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
} as const;
