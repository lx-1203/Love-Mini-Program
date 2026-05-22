/**
 * @deprecated 匹配表单配置已废弃。
 * 原匹配逻辑已融入卡片喜欢系统，匹配筛选功能已迁移到寻觅页。
 * 迁移路径：
 *   - match → likes（喜欢） + discover（寻觅）
 *   - 话题匹配/一键速配 → discover 卡片右滑喜欢系统
 * 本文件保留仅用于回滚参考。
 */
export interface MatchFieldOption {
  id: string;
  label: string;
}

export interface MatchFieldSchema {
  id: string;
  type: "single-select" | "multi-select" | "stepper";
  label: string;
  description: string;
  options?: MatchFieldOption[];
  min?: number;
  max?: number;
}

export interface MatchSectionSchema {
  id: string;
  title: string;
  fields: MatchFieldSchema[];
}

export interface MatchFormSchema {
  sections: MatchSectionSchema[];
}

export const matchFormSchema: MatchFormSchema = {
  sections: [
    {
      id: "intent",
      title: "匹配目标",
      fields: [
        {
          id: "matchIntent",
          type: "single-select",
          label: "从什么开始",
          description: "先用一个轻量的话题框架开启对话。",
          options: [
            { id: "topic", label: "话题匹配" },
            { id: "coffee", label: "咖啡散步" },
            { id: "study", label: "自习搭子" },
          ],
        },
      ],
    },
    {
      id: "filters",
      title: "筛选条件",
      fields: [
        {
          id: "topicIds",
          type: "multi-select",
          label: "话题",
          description: "让第一轮聊天更具体、更容易接住。",
          options: [
            { id: "music", label: "音乐" },
            { id: "film", label: "电影" },
            { id: "sports", label: "运动" },
            { id: "food", label: "美食" },
          ],
        },
        {
          id: "timeWindow",
          type: "single-select",
          label: "时间",
          description: "从你的真实课表里选一个可用时段。",
          options: [
            { id: "today-evening", label: "今晚" },
            { id: "tomorrow", label: "明天" },
            { id: "this-week", label: "本周" },
          ],
        },
        {
          id: "durationMinutes",
          type: "stepper",
          label: "聊天时长",
          description: "用分钟限制这次临时会话的时长。",
          min: 15,
          max: 60,
        },
      ],
    },
  ],
};

export const quickMatchEntry = {
  id: "quick-match",
  title: "快速匹配",
  description: "使用默认筛选条件，直接进入匹配队列。",
  defaultDurationMinutes: 20,
};
