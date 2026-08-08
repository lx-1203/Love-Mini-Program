/**
 * Campus Store Mock 数据（mock 模式专用）。
 *
 * 隔离原则：本文件仅被 stores/campus.ts 的 useMock() 分支引用，
 * real 模式（apiMode=real）不会读取其中的任何 mock 用户/会话 ID。
 * 类型经 import type 引用（编译期擦除，无运行时循环依赖）。
 */
import type {
  CampusActivity,
  CampusReplyItem,
  CampusTopicDetail,
  CampusTopicItem,
} from "../campus";

/** Mock 当前用户 ID（模拟当前登录用户身份，仅 mock 分支使用） */
export const MOCK_CURRENT_USER_ID = "user-1001";

export const mockTopics: CampusTopicItem[] = [
  // 课程交流
  {
    id: "campus-topic-1",
    category: "course_exchange",
    title: "高数B期末复习资料分享",
    contentPreview: "整理了一份高数B的期末复习资料，包含重点公式和典型例题解析，有需要的同学自取~",
    author: { userId: "u-1001", name: "学长小王", avatar: "", school: "广州大学" },
    replyCount: 23,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "campus-topic-2",
    category: "course_exchange",
    title: "数据结构实验报告模板",
    contentPreview: "分享一份数据结构实验报告的标准模板，含代码规范和注释要求，适合新手参考。",
    author: { userId: "u-1002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 15,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  // 社团招新
  {
    id: "campus-topic-3",
    category: "club_recruitment",
    title: "摄影社团招新啦！",
    contentPreview: "喜欢摄影的朋友看过来！摄影社团新学期招新开始啦，零基础也可以加入，我们会定期组织外拍活动~",
    author: { userId: "u-2001", name: "摄影社社长", avatar: "", school: "广州大学" },
    replyCount: 45,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "campus-topic-4",
    category: "club_recruitment",
    title: "街舞社寻找志同道合的舞伴",
    contentPreview: "街舞社新学期招新！无论你是什么水平，只要热爱街舞就欢迎加入。每周二四晚集训~",
    author: { userId: "u-2002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 32,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  // 校园活动
  {
    id: "campus-topic-5",
    category: "campus_activity",
    title: "本周六校园音乐节节目单公布",
    contentPreview: "校园音乐节节目单出来啦！本周六下午2点开始，地点在操场，有乐队表演、舞蹈、相声等节目~",
    author: { userId: "u-3001", name: "学生会长", avatar: "", school: "广州大学" },
    replyCount: 89,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "campus-topic-6",
    category: "campus_activity",
    title: "校园跑步打卡活动第三期",
    contentPreview: "坚持锻炼，健康生活！第三期跑步打卡活动开始报名，完成21天打卡可获证书和奖品。",
    author: { userId: "u-3002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 56,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  // 学习互助
  {
    id: "campus-topic-7",
    category: "study_help",
    title: "考研英语复习经验分享",
    contentPreview: "分享一下我考研英语80+的复习经验，包括单词记忆方法、阅读理解技巧和作文模板~",
    author: { userId: "u-4001", name: "考研学姐", avatar: "", school: "广州大学" },
    replyCount: 67,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "campus-topic-8",
    category: "study_help",
    title: "求伴一起刷LeetCode",
    contentPreview: "大二计科，目前刷了200多题，想找几个编程搭子互相监督，每天至少刷3道题。",
    author: { userId: "u-4002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 34,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  // 生活服务
  {
    id: "campus-topic-9",
    category: "life_service",
    title: "食堂新窗口测评",
    contentPreview: "二楼新开了川菜窗口，试了水煮鱼和麻婆豆腐，味道相当不错！比外面还便宜，推荐大家去试。",
    author: { userId: "u-5001", name: "吃货小分队", avatar: "", school: "广州大学" },
    replyCount: 42,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "campus-topic-10",
    category: "life_service",
    title: "校园代拿快递服务推荐",
    contentPreview: "推荐一个靠谱的校园代拿快递，价格实惠，南区北区都覆盖，不用再排队拿快递了~",
    author: { userId: "u-5002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 28,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  // 校友动态
  {
    id: "campus-topic-11",
    category: "alumni_news",
    title: "校友企业招聘信息汇总（六月）",
    contentPreview: "汇总了6月份来校招聘的校友企业信息，包括字节、腾讯、阿里等，有需要的同学记得关注~",
    author: { userId: "u-6001", name: "校友联络员", avatar: "", school: "广州大学" },
    replyCount: 53,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "campus-topic-12",
    category: "alumni_news",
    title: "创业成功的学长回来做分享",
    contentPreview: "听说咱们学校2015级的师兄创业成功，下周三回来做经验分享，想去的可以先报名。",
    author: { userId: "u-6002", name: "匿名校友", avatar: "", school: "" },
    replyCount: 19,
    isAnonymous: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const mockTopicDetail: Record<string, CampusTopicDetail> = {
  "campus-topic-1": {
    id: "campus-topic-1",
    category: "course_exchange",
    title: "高数B期末复习资料分享",
    content: "整理了一份高数B的期末复习资料，包含重点公式和典型例题解析，有需要的同学自取~\n\n内容包括：\n1. 极限与连续性重点公式\n2. 导数与微分的应用\n3. 不定积分与定积分\n4. 微分方程\n5. 典型例题20道（带详细解析）\n\n需要的同学私信我获取百度云链接~期末加油！",
    author: { userId: "u-1001", name: "学长小王", avatar: "", school: "广州大学" },
    replyCount: 23,
    isAnonymous: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
};

export const mockReplies: Record<string, CampusReplyItem[]> = {
  "campus-topic-1": [
    {
      id: "campus-reply-1",
      topicId: "campus-topic-1",
      author: { userId: "u-2001", name: "学弟小李", avatar: "", school: "广州大学" },
      content: "感谢学长！正好在复习高数，太及时了！",
      isAnonymous: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "campus-reply-2",
      topicId: "campus-topic-1",
      author: { userId: "u-3001", name: "匿名校友", avatar: "", school: "" },
      content: "可以也发我一份吗？谢谢！",
      isAnonymous: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "campus-reply-3",
      topicId: "campus-topic-1",
      author: { userId: "u-4001", name: "小张同学", avatar: "", school: "广州大学" },
      content: "学长整理的太详细了，特别是定积分那块，一直没搞懂，看完终于明白了！",
      isAnonymous: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
};

export const mockActivities: CampusActivity[] = [
  {
    id: "act-1",
    title: "校园音乐节",
    description: "一年一度的校园音乐节来啦！乐队、舞蹈、相声等精彩节目等你来",
    coverUrl: "",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 4).toISOString(),
    location: "学校操场",
    organizer: "学生会",
    participantCount: 320,
    maxParticipants: 500,
  },
  {
    id: "act-2",
    title: "英语角周末活动",
    description: "和外教一起练习口语，本期主题：Travel & Culture",
    coverUrl: "",
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 2).toISOString(),
    location: "教学楼B栋201",
    organizer: "英语协会",
    participantCount: 45,
    maxParticipants: 60,
  },
];

