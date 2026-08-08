/**
 * Circle Store Mock 数据（mock 模式专用）。
 *
 * 隔离原则：本文件仅被 stores/circle.ts 的 useMock() 分支引用，
 * real 模式（apiMode=real）不会读取其中的任何 mock 用户/会话 ID。
 * 类型经 import type 引用（编译期擦除，无运行时循环依赖）。
 */
import type { CircleItem, ReplyItem, TopicDetail, TopicItem } from "../circle";
import { IMAGE_PATHS } from "../../config/images";

/** Mock 当前用户 ID（模拟当前登录用户身份，仅 mock 分支使用） */
export const MOCK_CURRENT_USER_ID = "user-1001";

/* ========== Mock 数据 ========== */

export const mockCircles: CircleItem[] = [
  // infra R2-00042: 以下兴趣圈 name/description 为 mock 演示数据（useMock 守卫），
  // real 分支由后端下发；若作为 real 空数据兜底展示需走 t("circle.*") 本地化
  {
    id: "circle-campus",
    name: "校园圈",
    icon: IMAGE_PATHS.ICONS_COMMON.SCHOOL,
    description: "本校认证同学的专属圈子：同校动态、活动与互助",
    memberCount: 3420,
    topicCount: 890,
    isJoined: true,
    campusVerified: true,
  },
  {
    id: "circle-1",
    name: "电影迷",
    icon: IMAGE_PATHS.ICONS_EMOJI.VIDEO,
    description: "分享你喜欢的电影，寻找一起看片的伙伴",
    memberCount: 1280,
    topicCount: 356,
    isJoined: true,
  },
  {
    id: "circle-2",
    name: "读书会",
    icon: IMAGE_PATHS.ICONS_EMOJI.BOOK,
    description: "一起读书，一起成长，分享读书心得",
    memberCount: 890,
    topicCount: 210,
    isJoined: false,
  },
  {
    id: "circle-3",
    name: "运动达人",
    icon: IMAGE_PATHS.ICONS_EMOJI.BOLT,
    description: "跑步、篮球、羽毛球，运动让生活更精彩",
    memberCount: 1560,
    topicCount: 420,
    isJoined: true,
  },
  {
    id: "circle-4",
    name: "美食探店",
    icon: IMAGE_PATHS.ICONS_EMOJI.FOOD,
    description: "发现身边的美食，分享你的味蕾体验",
    memberCount: 2100,
    topicCount: 580,
    isJoined: false,
  },
  {
    id: "circle-5",
    name: "旅行日记",
    icon: IMAGE_PATHS.ICONS_COMMON.SHARE_ICON_SVG,
    description: "记录旅途中的美好，寻找同行旅伴",
    memberCount: 960,
    topicCount: 275,
    isJoined: false,
  },
  {
    id: "circle-6",
    name: "音乐空间",
    icon: IMAGE_PATHS.ICONS_EMOJI.HEART,
    description: "分享你喜欢的音乐，发现更多好声音",
    memberCount: 750,
    topicCount: 180,
    isJoined: true,
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
