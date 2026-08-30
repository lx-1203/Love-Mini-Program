/**
 * Circle Store Mock 数据（mock 模式专用）。
 *
 * 隔离原则：本文件仅被 stores/circle.ts 的 useMock() 分支引用，
 * real 模式（apiMode=real）不会读取其中的任何 mock 用户/会话 ID。
 * 类型经 import type 引用（编译期擦除，无运行时循环依赖）。
 */
import type { CircleItem, ReplyItem, TopicDetail, TopicItem } from "../circle";
// 2026-08-26：圈子图标 emoji→SVG（项目硬约束：业务组件图标禁用 emoji 字符）
import { IMAGE_PATHS } from "../../config/images";

/** Mock 当前用户 ID（模拟当前登录用户身份，仅 mock 分支使用） */
export const MOCK_CURRENT_USER_ID = "user-1001";

/**
 * 2026-08-27 兴趣圈修复：旧入口数字 ID → 标准圈子 ID 别名映射。
 *
 * 首页「兴趣推荐」等入口使用后端数字 ID（1=摄影圈、2=旅行圈……），
 * 而 mock 圈子使用语义化字符串 ID（circle-photo……）。此前以数字 ID
 * 直达圈子详情页时 fetchTopics 查不到数据 → 空态"暂无话题"。
 * 本映射统一把数字 ID 归一到标准圈子，保证 mock 下所有入口都能取到内容。
 */
export const MOCK_CIRCLE_ID_ALIASES: Record<string, string> = {
  "1": "circle-photo",
  "2": "circle-travel",
  "3": "circle-music",
  "4": "circle-food",
  "5": "circle-sports",
  "6": "circle-game",
  "7": "circle-reading",
  "8": "circle-pet",
  "9": "circle-astronomy",
  "10": "circle-basketball",
  "11": "circle-boardgame",
  "12": "circle-postgraduate",
  "13": "circle-studybuddy",
  "14": "circle-cutepets",
};

/**
 * 把任意入口传入的 circleId 归一为 mock 标准圈子 ID。
 * - 已是标准圈子 ID（circle-photo 等）→ 原样返回；
 * - 数字 ID（首页入口 1~14）→ 映射为标准 ID；
 * - 未知 ID → null（调用方回退用原始 ID）。
 */
export function resolveMockCircleId(circleId: string | null | undefined): string | null {
  if (!circleId) return null;
  if (mockCircles.some((c) => c.id === circleId) || mockTopics[circleId]) return circleId;
  return MOCK_CIRCLE_ID_ALIASES[circleId] ?? null;
}

/* ========== Mock 数据 ========== */

export const mockCircles: CircleItem[] = [
  // v3 Nearby 冻结：8 个标准兴趣圈（system 种子），开放加入、无需校园认证。
  // 既有/用户自建圈子继续存在，不被删除。
  {
    id: "circle-photo",
    name: "摄影",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAMERA,
    description: "分享光影与构图，一起扫街、看展、记录生活",
    memberCount: 12000,
    topicCount: 486,
    isJoined: false,
  },
  {
    id: "circle-travel",
    name: "旅行",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_TRAVEL,
    description: "记录旅途中的美好，寻找同行旅伴",
    memberCount: 8932,
    topicCount: 352,
    isJoined: false,
  },
  {
    id: "circle-music",
    name: "音乐",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_MUSIC,
    description: "分享你喜欢的音乐，发现更多好声音",
    memberCount: 8123,
    topicCount: 301,
    isJoined: true,
  },
  {
    id: "circle-sports",
    name: "运动",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,
    description: "跑步、篮球、羽毛球，运动让生活更精彩",
    memberCount: 6532,
    topicCount: 244,
    isJoined: false,
  },
  {
    id: "circle-food",
    name: "美食",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_FOOD,
    description: "发现身边的美食，分享你的味蕾体验",
    memberCount: 7240,
    topicCount: 287,
    isJoined: true,
  },
  {
    id: "circle-game",
    name: "游戏",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_GAME,
    description: "组队开黑、聊新作，找到一起玩的人",
    memberCount: 8123,
    topicCount: 195,
    isJoined: false,
  },
  {
    id: "circle-reading",
    name: "阅读",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_BOOK,
    description: "一起读书，一起成长，分享读书心得",
    memberCount: 6532,
    topicCount: 210,
    isJoined: false,
  },
  {
    id: "circle-pet",
    name: "宠物",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PET,
    description: "晒猫晒狗，交流养宠心得",
    memberCount: 5621,
    topicCount: 176,
    isJoined: false,
  },
  // ===== 2026-08-27 兴趣圈修复：补齐缺失圈子（天文/篮球/桌游/考研/学习搭子/萌宠）=====
  // 与 nearby/index.vue CIRCLE_COVER 全覆盖映射对齐，保证列表不再"缺圈子"。
  {
    id: "circle-astronomy",
    name: "天文圈",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_PLANET,
    description: "仰望星空，分享观星攻略与宇宙之美",
    memberCount: 4860,
    topicCount: 132,
    isJoined: false,
  },
  {
    id: "circle-basketball",
    name: "篮球",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_SPORT,
    description: "约球、看球、聊球，球场见",
    memberCount: 3980,
    topicCount: 108,
    isJoined: false,
  },
  {
    id: "circle-boardgame",
    name: "桌游",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_DICE,
    description: "狼人杀、剧本杀、桌游搭子集合地",
    memberCount: 3120,
    topicCount: 96,
    isJoined: false,
  },
  {
    id: "circle-postgraduate",
    name: "考研",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_BOOK,
    description: "考研路上互相打气，资料经验共享",
    memberCount: 8750,
    topicCount: 263,
    isJoined: false,
  },
  {
    id: "circle-studybuddy",
    name: "学习搭子",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_BOOK,
    description: "自习打卡、组队学习，一起上岸",
    memberCount: 5230,
    topicCount: 145,
    isJoined: false,
  },
  {
    id: "circle-cutepets",
    name: "萌宠",
    icon: IMAGE_PATHS.ICONS_EMOJI.CIRCLE_CAT,
    description: "萌图轰炸，云吸猫云吸狗",
    memberCount: 4305,
    topicCount: 187,
    isJoined: false,
  },
];
export const mockTopics: Record<string, TopicItem[]> = {
  "circle-campus": [
    {
      id: "campus-topic-1",
      circleId: "circle-campus",
      title: "期末图书馆占座攻略",
      content: "期末周图书馆太难占座了！分享一个经验：早上七点半前到三楼东区，人少光线好。",
      images: [],
      author: { userId: "user-3011", name: "晨光", avatar: "", headline: "计算机学院" },
      replyCount: 45,
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    },
    {
      id: "campus-topic-2",
      circleId: "circle-campus",
      title: "本周六校园歌手大赛决赛，求组队观赛",
      content: "周六晚上七点大礼堂，决赛选手都好强！想找几个同学一起去，结束后可以约夜宵。",
      images: [],
      author: { userId: "user-3012", name: "晚风", avatar: "", headline: "外国语学院" },
      replyCount: 19,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "campus-topic-3",
      circleId: "circle-campus",
      title: "有没有同专业的学长学姐，求经验",
      content: "大二想转专业到软件工程，有没有学长学姐可以给点建议？感谢！",
      images: [],
      author: { userId: "user-3013", name: "小北", avatar: "", headline: "大二在读" },
      replyCount: 33,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
  ],
  "circle-1": [
    {
      id: "topic-1",
      circleId: "circle-1",
      title: "最近看了《奥本海默》，聊聊感受",
      content: "诺兰的新片真的太震撼了，三线叙事把人物刻画得非常立体。有人一起讨论吗？",
      images: [],
      author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "电影爱好者" },
      replyCount: 12,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "topic-2",
      circleId: "circle-1",
      title: "推荐几部适合情侣一起看的电影",
      content: "周末想和对象一起看电影，大家有什么好推荐吗？最好是温馨治愈类的。",
      images: [],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "影视专业" },
      replyCount: 28,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "topic-3",
      circleId: "circle-1",
      title: "有没有人一起去看周末的电影首映？",
      content: "这周六有部新片首映，想找人一起去，一个人看电影太孤单了。",
      images: [],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "设计师" },
      replyCount: 5,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ],
  "circle-3": [
    {
      id: "topic-4",
      circleId: "circle-3",
      title: "校园夜跑打卡群",
      content: "每天晚上9点操场夜跑，有没有人一起？互相监督，坚持锻炼！",
      images: [],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "篮球队长" },
      replyCount: 35,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
  ],
  // ===== 2026-08-26 P6：兴趣圈种子话题（含配图），保证圈子详情页有内容可看、可点击 =====
  "circle-photo": [
    {
      id: "photo-topic-1",
      circleId: "circle-photo",
      title: "颐和园的落日，今天的光线太绝了",
      content: "下午顺光拍了一组落日，湖面镀上一层金，分享给大家一起感受这份美好。",
      images: [IMAGE_PATHS.POSTS.POST_1, IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3006", name: "苏晴", avatar: "", headline: "摄影师" },
      replyCount: 46,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "photo-topic-2",
      circleId: "circle-photo",
      title: "雨天街拍小技巧分享",
      content: "下雨天的橱窗反光和雨滴都是很好的拍摄元素，分享几个踩点小Tips，欢迎交流。",
      images: [IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "摄影爱好者" },
      replyCount: 23,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "photo-topic-3",
      circleId: "circle-photo",
      title: "人像摄影约拍互勉",
      content: "本周末想找一位模特互勉约拍，题材偏文艺胶片感，感兴趣的朋友评论区集合！",
      images: [IMAGE_PATHS.POSTS.POST_2],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "设计系" },
      replyCount: 12,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
  ],
  "circle-travel": [
    {
      id: "travel-topic-1",
      circleId: "circle-travel",
      title: "西湖环线徒步约伴，周末出发",
      content: "计划周六早九点从断桥出发，环湖徒步+北山街，全程15公里，求1-2位伙伴同行。",
      images: [IMAGE_PATHS.POSTS.POST_2, IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "旅行达人" },
      replyCount: 34,
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    },
    {
      id: "travel-topic-2",
      circleId: "circle-travel",
      title: "川西小环线自驾攻略分享",
      content: "整理了4天3晚的川西小环线路线，含住宿与海拔提醒，按图索骥省心不少。",
      images: [IMAGE_PATHS.POSTS.POST_1, IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3005", name: "北岛", avatar: "", headline: "创业者" },
      replyCount: 58,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: "travel-topic-3",
      circleId: "circle-travel",
      title: "露营小白装备清单（避坑向）",
      content: "第一次露营踩了不少坑，整理一份新手装备清单，帐篷/防潮垫/头灯一个都不能少。",
      images: [IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "户外爱好者" },
      replyCount: 19,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
  ],
  // ===== 2026-08-27 兴趣圈修复：为其余标准圈子补齐种子话题（含配图），
  // 保证任意圈子进入详情页都有真实可点的内容，不再出现"暂无话题"空态 =====
  "circle-music": [
    {
      id: "music-topic-1",
      circleId: "circle-music",
      title: "周末校园草地音乐会，一起摇摆",
      content: "本周六晚学校操场有草地音乐会，民谣+流行都有，想找几个朋友一起去现场感受一下。",
      images: [IMAGE_PATHS.POSTS.POST_3, IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "音乐爱好者" },
      replyCount: 41,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "music-topic-2",
      circleId: "circle-music",
      title: "求推荐适合通勤路上听的宝藏歌单",
      content: "每天通勤一个小时，想找一些治愈系又不会睡着的歌单，求安利！",
      images: [IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "音乐发烧友" },
      replyCount: 26,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ],
  "circle-sports": [
    {
      id: "sports-topic-1",
      circleId: "circle-sports",
      title: "晨跑打卡第 30 天，坚持就是胜利",
      content: "不知不觉已经连续晨跑一个月了，记录一下今天的清晨操场，配速越来越稳。",
      images: [IMAGE_PATHS.POSTS.POST_2, IMAGE_PATHS.POSTS.POST_1],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "运动达人" },
      replyCount: 37,
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
    {
      id: "sports-topic-2",
      circleId: "circle-sports",
      title: "周末篮球局，还缺 2 个兄弟",
      content: "周六下午三点体育馆室内场，目前 8 个人，还差 2 个，水平不限，快乐篮球为主！",
      images: [IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3005", name: "北岛", avatar: "", headline: "篮球队长" },
      replyCount: 15,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ],
  "circle-food": [
    {
      id: "food-topic-1",
      circleId: "circle-food",
      title: "学校后门宝藏小馆子探店",
      content: "偶然发现后门一家川菜馆，水煮鱼分量超足价格还实惠，实名安利给干饭人！",
      images: [IMAGE_PATHS.POSTS.POST_5, IMAGE_PATHS.POSTS.POST_2],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "吃货" },
      replyCount: 48,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "food-topic-2",
      circleId: "circle-food",
      title: "深夜放毒：今晚的家常小炒",
      content: "周末在家做了三菜一汤，色香味俱全，一个人也要好好吃饭呀。",
      images: [IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3006", name: "苏晴", avatar: "", headline: "美食家" },
      replyCount: 22,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
  ],
  "circle-game": [
    {
      id: "game-topic-1",
      circleId: "circle-game",
      title: "新赛季上分英雄推荐（附出装）",
      content: "新赛季玩了一周，整理几个版本强势又好上手的英雄，附装备思路，上分卡段的可以参考。",
      images: [IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3005", name: "北岛", avatar: "", headline: "王者段位" },
      replyCount: 33,
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    },
    {
      id: "game-topic-2",
      circleId: "circle-game",
      title: "找游戏搭子，组队开黑不喷人",
      content: "本人脾气好不喷人，想找几个固定的游戏搭子，晚上一起上分，最好能开麦交流。",
      images: [IMAGE_PATHS.POSTS.POST_1],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "玩家" },
      replyCount: 18,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ],
  "circle-reading": [
    {
      id: "reading-topic-1",
      circleId: "circle-reading",
      title: "最近在读《百年孤独》，求交流",
      content: "第一次读马尔克斯，被魔幻现实主义震撼到了，读到中间有点绕，有人一起读一起聊聊吗？",
      images: [IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "书虫" },
      replyCount: 29,
      createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    },
    {
      id: "reading-topic-2",
      circleId: "circle-reading",
      title: "周末好书安利：治愈系书单分享",
      content: "整理了一份适合周末窝在家里读的治愈系书单，每一本都值得细细品味，欢迎补充。",
      images: [IMAGE_PATHS.POSTS.POST_5, IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3006", name: "苏晴", avatar: "", headline: "阅读推广人" },
      replyCount: 20,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    },
  ],
  "circle-pet": [
    {
      id: "pet-topic-1",
      circleId: "circle-pet",
      title: "我家猫主子今天超级粘人",
      content: "平时高冷的猫今天一直蹭我，还把肚皮翻出来求摸摸，幸福感爆棚，发出来给大家云吸一口。",
      images: [IMAGE_PATHS.POSTS.POST_2, IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "铲屎官" },
      replyCount: 52,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "pet-topic-2",
      circleId: "circle-pet",
      title: "小区捡到一只小奶狗，求领养",
      content: "在小区门口捡到一只小奶狗，很乖不咬人，已带去体检，希望能找到有爱心的主人。",
      images: [IMAGE_PATHS.POSTS.POST_1],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "爱宠人士" },
      replyCount: 64,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ],
  // ===== 2026-08-27 兴趣圈修复：新增圈子的种子话题（含配图）=====
  "circle-astronomy": [
    {
      id: "astronomy-topic-1",
      circleId: "circle-astronomy",
      title: "昨晚的银河，手机也能拍出来",
      content: "郊区光污染低，用手机夜景模式长曝光也拍到了银河，分享参数和踩点，想拍的可以约起来。",
      images: [IMAGE_PATHS.POSTS.POST_1, IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3006", name: "苏晴", avatar: "", headline: "天文爱好者" },
      replyCount: 31,
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "astronomy-topic-2",
      circleId: "circle-astronomy",
      title: "下月英仙座流星雨观测活动报名",
      content: "计划下个月组团去郊区看流星雨，含装备与往返安排，感兴趣的同学评论区集合。",
      images: [IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3005", name: "北岛", avatar: "", headline: "观星达人" },
      replyCount: 27,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    },
  ],
  "circle-basketball": [
    {
      id: "basketball-topic-1",
      circleId: "circle-basketball",
      title: "周末体育馆约球，欢迎来玩",
      content: "周六下午室内场已订好，半场 4v4，欢迎各位球友来切磋，出出汗锻炼身体。",
      images: [IMAGE_PATHS.POSTS.POST_4],
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "篮球队长" },
      replyCount: 17,
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
  ],
  "circle-boardgame": [
    {
      id: "boardgame-topic-1",
      circleId: "circle-boardgame",
      title: "周末狼人杀局，还缺 3 人",
      content: "本周末晚剧本杀店开狼人杀局，有萌新也有老手，边玩边教学，想来的举手。",
      images: [IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "桌游主持" },
      replyCount: 13,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
  ],
  "circle-postgraduate": [
    {
      id: "postgraduate-topic-1",
      circleId: "circle-postgraduate",
      title: "考研冲刺期作息表分享",
      content: "离考试越来越近，分享一份冲刺期作息表，科学安排复习与休息，稳住心态最重要。",
      images: [IMAGE_PATHS.POSTS.POST_2],
      author: { userId: "user-3007", name: "小北", avatar: "", headline: "考研党" },
      replyCount: 44,
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  ],
  "circle-studybuddy": [
    {
      id: "studybuddy-topic-1",
      circleId: "circle-studybuddy",
      title: "找一起自习的搭子，图书馆见",
      content: "大二学生，想找个能互相监督的自习搭子，每天图书馆泡三小时，考级考证一起冲。",
      images: [IMAGE_PATHS.POSTS.POST_3],
      author: { userId: "user-3007", name: "小北", avatar: "", headline: "大二在读" },
      replyCount: 21,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
  ],
  "circle-cutepets": [
    {
      id: "cutepets-topic-1",
      circleId: "circle-cutepets",
      title: "云吸猫！超萌橘猫合集",
      content: "收集了一组我家附近流浪猫的萌照，橘猫真的越看越治愈，今天也是被猫咪治愈的一天。",
      images: [IMAGE_PATHS.POSTS.POST_1, IMAGE_PATHS.POSTS.POST_5],
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "猫奴" },
      replyCount: 39,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
};

export const mockTopicDetail: Record<string, TopicDetail> = {
  "topic-1": {
    id: "topic-1",
    circleId: "circle-1",
    title: "最近看了《奥本海默》，聊聊感受",
    content: "诺兰的新片真的太震撼了，三线叙事把人物刻画得非常立体。尤其是那场听证会的戏，台词功力太强了。有人一起讨论吗？\n\n我觉得最打动我的是奥本海默在成功之后的道德挣扎，科学家的责任感和社会责任之间的矛盾。",
    images: [],
    author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "电影爱好者" },
    replyCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
};

export const mockReplies: Record<string, ReplyItem[]> = {
  "topic-1": [
    {
      id: "reply-1",
      topicId: "topic-1",
      author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "影视专业" },
      content: "我也看了！三线叙事确实很厉害，不过我觉得节奏稍微有点慢，前面铺垫太长了。",
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: "reply-2",
      topicId: "topic-1",
      author: { userId: "user-3003", name: "橙子", avatar: "", headline: "设计师" },
      content: "强烈推荐IMAX版本，视觉效果完全不一样！",
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "reply-3",
      topicId: "topic-1",
      author: { userId: "user-3004", name: "南风", avatar: "", headline: "篮球队长" },
      content: "看完之后一直在想一个问题：如果是我们，会做出同样的选择吗？",
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ],
};
