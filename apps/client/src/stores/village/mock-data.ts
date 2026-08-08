/**
 * Village Store Mock 数据（mock 模式专用，自 stores/village/utils.ts 拆分）。
 *
 * 隔离原则：本文件内的 mock 帖子/作者/评论/活动数据仅被
 * stores/village/index.ts 的 useMock() 分支（及 tag-posts.vue 的
 * apiMode === "mock" 分支）引用，real 模式不会读取其中的任何 mock 用户 ID。
 * 类型经 import type 引用（编译期擦除，无运行时循环依赖）。
 */
import type {
  ActivitySummaryView,
  CommentItem,
  PostAuthor,
  PostCategory,
  PostItem,
  SimilarAuthor,
} from "./types";

/* ========== Mock 数据 ========== */

/** Mock 当前用户 ID（模拟当前登录用户身份，仅 mock 分支使用） */
export const MOCK_CURRENT_USER_ID = "user-1001";

/** 相似作者推荐 Mock 数据（user-30xx mock 作者 ID，仅 mock 分支使用） */
export const mockSimilarAuthors: SimilarAuthor[] = [
  {
    userId: "user-3004",
    name: "南风",
    avatar: "/static/assets/default-avatar.jpg",
    campusName: "北京大学",
    headline: "97年 · 深圳 · 产品经理 · 本科",
    isAlumni: true,
    commonInterests: ["阅读", "旅行"],
    isFollowed: false,
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "/static/assets/default-avatar.jpg",
    campusName: "四川大学",
    headline: "93年 · 成都 · 创业者 · 博士",
    isAlumni: false,
    commonInterests: ["阅读"],
    isFollowed: false,
  },
];

/** 标签聚合页 Mock 帖子（修复 R4-00130：作者 ID 由裸数字 1001~1006 统一为 user-30xx，
 * 并与 mockAuthors 同名作者对齐同一 ID，跨模块身份一致；仅 mock 分支使用） */
export const mockTagPosts: PostItem[] = [
  {
    id: "mock-tag-post-1",
    author: { userId: "user-3016", name: "星野", avatar: "", headline: "北京·985硕士", campusName: "北京大学" },
    categoryId: "sincere", title: "", content: "今天在图书馆遇到一个认真学习的女生，感觉好有气质！",
    images: [], tags: ["#校园日常", "#表白墙"], likes: 32, comments: 8, shares: 3,
    isLiked: false, isFollowed: false, isShared: false, isAlumni: false,
    favorites: 10, isFavorite: false, views: 320, createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "mock-tag-post-2",
    author: { userId: "user-3002", name: "阿泽", avatar: "", headline: "上海·互联网大厂", campusName: "复旦大学" },
    categoryId: "interest", title: "", content: "有没有一起打羽毛球的？周末约起来！求搭子！",
    images: [], tags: ["#找搭子", "#兴趣分享"], likes: 18, comments: 12, shares: 4,
    isLiked: true, isFollowed: false, isShared: false, isAlumni: false,
    favorites: 6, isFavorite: false, views: 180, createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "mock-tag-post-3",
    author: { userId: "user-3003", name: "橙子", avatar: "", headline: "杭州·设计师", campusName: "浙江大学" },
    categoryId: "activity", title: "", content: "急！计算机组成原理期末怎么复习？求大佬带带",
    images: [], tags: ["#求助", "#技术交流"], likes: 45, comments: 23, shares: 6,
    isLiked: false, isFollowed: true, isShared: false, isAlumni: false,
    favorites: 15, isFavorite: true, views: 450, createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: "mock-tag-post-4",
    author: { userId: "user-3005", name: "北岛", avatar: "", headline: "成都·创业者", campusName: "四川大学" },
    categoryId: "sincere", title: "", content: "毕业5年了，想问问学弟学妹们学校现在变化大吗？",
    images: [], tags: ["#校友动态", "#生活记录"], likes: 67, comments: 19, shares: 10,
    isLiked: false, isFollowed: false, isShared: true, isAlumni: false,
    favorites: 22, isFavorite: false, views: 670, createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock-tag-post-5",
    author: { userId: "user-3004", name: "南风", avatar: "", headline: "深圳·产品经理", campusName: "北京大学" },
    categoryId: "life", title: "", content: "记录一下今天在食堂吃到的好吃的！麻辣香锅绝了",
    images: [], tags: ["#生活记录", "#校园日常"], likes: 23, comments: 5, shares: 2,
    isLiked: false, isFollowed: false, isShared: false, isAlumni: false,
    favorites: 7, isFavorite: false, views: 230, createdAt: new Date(Date.now() - 90000000).toISOString(),
  },
  {
    id: "mock-tag-post-6",
    author: { userId: "user-3001", name: "小鹿", avatar: "", headline: "北京·Java开发", campusName: "清华大学" },
    categoryId: "interest", title: "", content: "想找个一起刷 LeetCode 的队友，每天互相监督",
    images: [], tags: ["#技术交流", "#找搭子"], likes: 15, comments: 7, shares: 3,
    isLiked: false, isFollowed: false, isShared: false, isAlumni: false,
    favorites: 5, isFavorite: false, views: 150, createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const mockCategories: PostCategory[] = [
  { id: "cat-all", name: "全部", icon: "grid" },
  { id: "cat-interest", name: "兴趣圈", icon: "heart" },
  { id: "cat-sincere", name: "诚意帖", icon: "star" },
  { id: "cat-hometown", name: "同乡", icon: "location" },
  { id: "cat-campus", name: "校园", icon: "school" },
  { id: "cat-latest", name: "最新", icon: "time" },
];

/** 我的动态分类（收尾轮：内部目标分类，不出现在 Tab 栏） */
export const mockMineCategory: PostCategory = {
  id: "cat-mine",
  name: "我的",
  icon: "user",
};

/**
 * Mock 作者列表
 *
 * 修复（严格模式 noUncheckedIndexedAccess）：原声明为 PostAuthor[]，索引访问会返回 PostAuthor | undefined，
 * 导致 mockPosts / mockComments 中 `author: mockAuthors[N]` 报 TS2322。
 * 改为显式 5 元素元组类型，索引访问 mockAuthors[0..4] 将返回确定的 PostAuthor，无需非空断言。
 */
export const mockAuthors: [PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor] = [
  {
    userId: "user-3001",
    name: "小鹿",
    avatar: "/static/assets/images/avatars/avatar-13.jpg",
    headline: "94年 · 北京 · 年薪30w+ · 985硕士",
    campusName: "北京大学",
    interests: ["阅读", "旅行", "志愿者"],
  },
  {
    userId: "user-3002",
    name: "阿泽",
    avatar: "/static/assets/images/avatars/avatar-14.jpg",
    headline: "96年 · 上海 · 互联网大厂 · 本科",
    campusName: "复旦大学",
    interests: ["徒步", "户外", "摄影"],
  },
  {
    userId: "user-3003",
    name: "橙子",
    avatar: "/static/assets/images/avatars/avatar-15.jpg",
    headline: "95年 · 杭州 · 设计师 · 硕士",
    campusName: "浙江大学",
    interests: ["设计", "美食", "旅行"],
  },
  {
    userId: "user-3004",
    name: "南风",
    avatar: "/static/assets/images/avatars/avatar-16.jpg",
    headline: "97年 · 深圳 · 产品经理 · 本科",
    campusName: "北京大学",
    interests: ["产品", "运动", "音乐"],
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "/static/assets/images/avatars/avatar-17.jpg",
    headline: "93年 · 成都 · 创业者 · 博士",
    campusName: "四川大学",
    interests: ["创业", "摄影", "读书"],
  },
  {
    userId: "user-3006",
    name: "苏晴",
    avatar: "/static/assets/images/avatars/avatar-18.jpg",
    headline: "95年 · 广州 · 摄影师 · 本科",
    campusName: "中山大学",
    interests: ["摄影", "旅行", "音乐"],
  },
  {
    userId: "user-3007",
    name: "周沐",
    avatar: "/static/assets/images/avatars/avatar-19.jpg",
    headline: "96年 · 南京 · 教师 · 硕士",
    campusName: "南京大学",
    interests: ["教育", "阅读", "手工"],
  },
  {
    userId: "user-3008",
    name: "许诺",
    avatar: "/static/assets/images/avatars/avatar-20.jpg",
    headline: "97年 · 武汉 · 工程师 · 本科",
    campusName: "武汉大学",
    interests: ["编程", "桌游", "健身"],
  },
  {
    userId: "user-3009",
    name: "林安",
    avatar: "/static/assets/images/avatars/avatar-21.jpg",
    headline: "94年 · 西安 · 医生 · 博士",
    campusName: "西安交通大学",
    interests: ["医学", "跑步", "咖啡"],
  },
  {
    userId: "user-3010",
    name: "叶青",
    avatar: "/static/assets/images/avatars/avatar-22.jpg",
    headline: "95年 · 苏州 · 律师 · 硕士",
    campusName: "中国人民大学",
    interests: ["法律", "辩论", "旅行"],
  },
  {
    userId: "user-3011",
    name: "夏言",
    avatar: "/static/assets/images/avatars/avatar-23.jpg",
    headline: "96年 · 厦门 · 自媒体 · 本科",
    campusName: "厦门大学",
    interests: ["写作", "美食", "电影"],
  },
  {
    userId: "user-3012",
    name: "顾北",
    avatar: "/static/assets/images/avatars/avatar-24.jpg",
    headline: "93年 · 青岛 · 建筑师 · 硕士",
    campusName: "天津大学",
    interests: ["建筑", "手绘", "旅行"],
  },
  {
    userId: "user-3013",
    name: "沈念",
    avatar: "/static/assets/images/avatars/avatar-25.jpg",
    headline: "95年 · 长沙 · 运营 · 本科",
    campusName: "中南大学",
    interests: ["运营", "瑜伽", "宠物"],
  },
  {
    userId: "user-3014",
    name: "白鹭",
    avatar: "/static/assets/images/avatars/avatar-26.jpg",
    headline: "97年 · 大连 · 教师 · 硕士",
    campusName: "大连理工大学",
    interests: ["教育", "钢琴", "烘焙"],
  },
  {
    userId: "user-3015",
    name: "季风",
    avatar: "/static/assets/images/avatars/avatar-27.jpg",
    headline: "94年 · 重庆 · 产品设计 · 本科",
    campusName: "重庆大学",
    interests: ["设计", "桌游", "火锅"],
  },
];

/* ========== 2026-08-08 频道化重构：Mock 活动摘要（帖子活动卡内嵌用） ========== */

/**
 * 本周五/本周六日期（yyyy-MM-dd）。
 * R4-00132：mock 活动日期由固定日期改为相对当前日期生成（活动卡不随
 * 时间推移过期失真；与活动 store 的相对日期处理保持一致）。
 */
function upcomingWeekdayDate(weekday: 5 | 6): string {
  const now = new Date();
  const day = now.getDay(); // 0=周日 ... 6=周六
  let daysAhead = weekday - day;
  if (daysAhead <= 0) daysAhead += 7; // 已过则取下周
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${target.getFullYear()}-${mm}-${dd}`;
}

/**
 * Mock 活动摘要列表（与后端 MockVillageService 的 activity 数据对齐：
 * 201 电影社线下碰面 / 202 周末篮球友谊赛）。
 */
export const mockActivities: ActivitySummaryView[] = [
  {
    id: 201,
    title: "电影社线下碰面",
    location: "影像楼 B 厅",
    scheduleText: "周五 19:00",
    activityDate: upcomingWeekdayDate(5),
    status: "upcoming",
    enrollmentCount: 23,
    coverImage: "/static/assets/images/posts/post-2.jpg",
  },
  {
    id: 202,
    title: "周末篮球友谊赛",
    location: "东区篮球场",
    scheduleText: "周六 15:00",
    activityDate: upcomingWeekdayDate(6),
    status: "upcoming",
    enrollmentCount: 12,
    coverImage: "",
  },
];

/** Mock 帖子列表 */
/**
 * Mock 帖子原始数据（2026-08-08 论坛互动真实化：收藏/浏览量字段由
 * {@link mockPosts} 归一化派生，避免逐条维护 30 条重复字段）。
 */
const mockPostsRaw: Array<
  Omit<PostItem, "favorites" | "isFavorite" | "views">
> = [
  {
    id: "post-1",
    author: mockAuthors[0],
    categoryId: "cat-sincere",
    title: "",
    content:
      "认真征友，希望能遇到那个对的人。平时喜欢看书、旅行，周末会去做志愿者。期待一段双向奔赴的感情。",
    images: [],
    tags: ["#这是一条520交友启事", "#诚意征友"],
    likes: 128,
    comments: 32,
    shares: 15,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    buddyTags: ["读书搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "post-2",
    author: mockAuthors[1],
    categoryId: "cat-interest",
    title: "",
    content:
      "周末有一起去徒步的吗？计划去西湖周边走一圈，大概15公里，新手友好路线。已经有3个人了，再来2个就出发！",
    images: [],
    tags: ["#周末徒步", "#西湖", "#户外"],
    likes: 45,
    comments: 18,
    shares: 8,
    isLiked: true,
    isFollowed: true,
    isShared: true,
    isAlumni: true,
    city: "杭州",
    buddyTags: ["运动搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "post-3",
    author: mockAuthors[2],
    categoryId: "cat-hometown",
    title: "",
    content:
      "在杭州的四川老乡集合啦！想建一个老乡群，周末可以一起约火锅、打麻将。身在异乡，老乡最亲~",
    images: [],
    tags: ["#四川老乡", "#杭州", "#火锅"],
    likes: 89,
    comments: 56,
    shares: 23,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "post-4",
    author: mockAuthors[3],
    categoryId: "cat-mask",
    title: "",
    content:
      "【蒙面话题】你们觉得相亲时最看重对方什么？我先说：三观一致最重要，颜值其次。",
    images: [],
    tags: ["#蒙面话题", "#相亲", "#三观"],
    likes: 234,
    comments: 89,
    shares: 42,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "post-5",
    author: mockAuthors[4],
    categoryId: "cat-sincere",
    title: "",
    content:
      "创业第三年，公司步入正轨，终于有时间考虑个人问题了。喜欢运动、摄影，希望找一个能一起成长的伴侣。",
    images: [],
    tags: ["#创业", "#征友", "#摄影"],
    likes: 167,
    comments: 43,
    shares: 19,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "post-6",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享最近读的一本书《亲密关系》，里面讲到沟通的重要性，推荐给正在恋爱中的朋友们。",
    images: [],
    tags: ["#读书分享", "#亲密关系"],
    likes: 67,
    comments: 12,
    shares: 6,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: true,
    city: "南京",
    buddyTags: ["读书搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "post-7",
    author: mockAuthors[0],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末去爬山，山顶的日落太治愈了，有一起的朋友吗？",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#爬山', '#周末活动'],
    likes: 20,
    comments: 3,
    shares: 1,
    isLiked: true,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "北京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: "post-8",
    author: mockAuthors[1],
    categoryId: "cat-sincere",
    title: "",
    content:
      "刚看完《长安三万里》，李白的一生太浪漫了，推荐！",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#电影', '#分享'],
    likes: 27,
    comments: 6,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "post-9",
    author: mockAuthors[2],
    categoryId: "cat-sincere",
    title: "",
    content:
      "想找个人一起学做咖啡，拉花入门中，进度缓慢但快乐～",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#咖啡', '#兴趣'],
    likes: 34,
    comments: 9,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "杭州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
  },
  {
    id: "post-10",
    author: mockAuthors[3],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享我的旅行清单：想去冰岛看极光，攒钱中！",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#校园日常', '#图书馆'],
    likes: 41,
    comments: 12,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "广州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
  {
    id: "post-11",
    author: mockAuthors[4],
    categoryId: "cat-sincere",
    title: "",
    content:
      "第一次尝试露营，星空下的北京近郊太美了。",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#露营', '#户外'],
    likes: 48,
    comments: 15,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "深圳",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
  },
  {
    id: "post-12",
    author: mockAuthors[5],
    categoryId: "cat-sincere",
    title: "",
    content:
      "养了一只英短，叫年糕，每天回家都治愈一天的疲惫。",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#宠物', '#日常'],
    likes: 55,
    comments: 18,
    shares: 11,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: true,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
  },
  {
    id: "post-13",
    author: mockAuthors[6],
    categoryId: "cat-sincere",
    title: "",
    content:
      "健身第三个月，终于能看到一点线条了，坚持就是胜利！",
    images: [],
    tags: ['#健身', '#打卡'],
    likes: 62,
    comments: 21,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString(),
  },
  {
    id: "post-14",
    author: mockAuthors[7],
    categoryId: "cat-interest",
    title: "",
    content:
      "MBTI测试分享：我是INFJ，有一样的吗？",
    images: [],
    tags: ['#城市生活', '#慢生活'],
    likes: 69,
    comments: 24,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "武汉",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "post-15",
    author: mockAuthors[8],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末羽毛球局缺人，有没有组队的朋友？",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#运动', '#球局'],
    likes: 76,
    comments: 27,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "西安",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
  },
  {
    id: "post-16",
    author: mockAuthors[9],
    categoryId: "cat-sincere",
    title: "",
    content:
      "雨天宅家，泡杯茶看看书，难得的悠闲时光。",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#雨天', '#阅读'],
    likes: 83,
    comments: 30,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "苏州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: "post-17",
    author: mockAuthors[10],
    categoryId: "cat-sincere",
    title: "",
    content:
      "辞职后gap三个月，计划走遍中国西部，有人同行吗？",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#旅行', '#辞职gap'],
    likes: 90,
    comments: 3,
    shares: 9,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "厦门",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 31).toISOString(),
  },
  {
    id: "post-18",
    author: mockAuthors[11],
    categoryId: "cat-interest",
    title: "",
    content:
      "有没有喜欢逛博物馆的朋友？周末组个局？",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#手作', '#陶艺'],
    likes: 97,
    comments: 6,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "青岛",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 34).toISOString(),
  },
  {
    id: "post-19",
    author: mockAuthors[12],
    categoryId: "cat-sincere",
    title: "",
    content:
      "深夜放毒：亲手做的红烧肉，肥而不腻，绝了！",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#美食', '#深夜食堂'],
    likes: 104,
    comments: 9,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "长沙",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 37).toISOString(),
  },
  {
    id: "post-20",
    author: mockAuthors[13],
    categoryId: "cat-sincere",
    title: "",
    content:
      "想找语伴练英语口语，每周两次线上，有人吗？",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#学习', '#英语'],
    likes: 111,
    comments: 12,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "大连",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
  },
  {
    id: "post-21",
    author: mockAuthors[14],
    categoryId: "cat-sincere",
    title: "",
    content:
      "滑雪初体验！摔了十几次终于会刹车了，明年再战。",
    images: [],
    tags: ['#滑雪', '#冬天'],
    likes: 118,
    comments: 15,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "重庆",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 43).toISOString(),
  },
  {
    id: "post-22",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享我的旅行清单：想去冰岛看极光，攒钱中！",
    images: [],
    tags: ['#摄影', '#生活记录'],
    likes: 125,
    comments: 18,
    shares: 7,
    isLiked: true,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "北京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 46).toISOString(),
  },
  {
    id: "post-23",
    author: mockAuthors[1],
    categoryId: "cat-sincere",
    title: "",
    content:
      "加班到深夜，楼下便利店的热豆浆是唯一的慰藉。",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#加班', '#打工日常'],
    likes: 132,
    comments: 21,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(),
  },
  {
    id: "post-24",
    author: mockAuthors[2],
    categoryId: "cat-sincere",
    title: "",
    content:
      "春天来了，想找个人一起看樱花，武汉的樱花开好了。",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#春天', '#樱花'],
    likes: 139,
    comments: 24,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "杭州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
  {
    id: "post-25",
    author: mockAuthors[3],
    categoryId: "cat-sincere",
    title: "",
    content:
      "学了三个月吉他，终于能弹完整一首《晴天》了！",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#吉他', '#音乐'],
    likes: 146,
    comments: 27,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "广州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
  },
  {
    id: "post-26",
    author: mockAuthors[4],
    categoryId: "cat-interest",
    title: "",
    content:
      "MBTI测试分享：我是INFJ，有一样的吗？",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#童年', '#回忆'],
    likes: 153,
    comments: 30,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "深圳",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 58).toISOString(),
  },
  {
    id: "post-27",
    author: mockAuthors[5],
    categoryId: "cat-sincere",
    title: "",
    content:
      "跑步第100天打卡！从3公里到10公里，变化看得见。",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#跑步', '#坚持'],
    likes: 160,
    comments: 3,
    shares: 5,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 61).toISOString(),
  },
  {
    id: "post-28",
    author: mockAuthors[6],
    categoryId: "cat-sincere",
    title: "",
    content:
      "最近在研究咖啡手冲，喜欢的朋友可以交流下～",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#咖啡', '#手冲'],
    likes: 167,
    comments: 6,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 64).toISOString(),
  },
  {
    id: "post-29",
    author: mockAuthors[7],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末去看展，遇见一幅很喜欢的画，忍不住拍下来。",
    images: [],
    tags: ['#看展', '#艺术'],
    likes: 24,
    comments: 9,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "武汉",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 67).toISOString(),
  },
  {
    id: "post-30",
    author: mockAuthors[8],
    categoryId: "cat-interest",
    title: "",
    content:
      "有没有喜欢逛博物馆的朋友？周末组个局？",
    images: [],
    tags: ['#火锅', '#美食'],
    likes: 31,
    comments: 12,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "西安",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
  },
  /* ========== 2026-08-08 频道化重构：今日演示帖（置顶 / 活动关联 / 校园） ========== */
  {
    id: "post-31",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "本周圈子公告：七夕主题活动预告",
    content:
      "本周六晚 7 点，校园东区草坪将举办「七夕星光主题趴」：露天电影、心动配对、荧光手环，现场还有小礼物～心动就来发帖报名，名额有限先到先得！",
    images: [],
    tags: ["#圈子公告", "#七夕活动"],
    likes: 56,
    comments: 18,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "post-32",
    author: mockAuthors[1],
    categoryId: "cat-activity",
    title: "今晚电影社放映《你的名字》，现场报名 ing！",
    content:
      "周五 19:00 影像楼 B 厅放映《你的名字》，映后自由讨论，免费入场！已报名 23 人，活动链接点卡片直达～",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ["#电影", "#活动"],
    likes: 42,
    comments: 11,
    shares: 6,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    activityId: "201",
    activity: mockActivities[0],
    recentComments: [
      {
        id: "comment-31",
        postId: "post-32",
        author: mockAuthors[2],
        content: "带我一个！正好周末没安排",
        likes: 2,
        isLiked: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "post-33",
    author: mockAuthors[3],
    categoryId: "cat-campus",
    title: "图书馆四楼新增自习区，环境超棒！",
    content:
      "今天去图书馆发现四楼新开了自习区，每个座位都有插座和台灯，还有独立隔板，学习效率直接拉满，推荐给同校的同学们！",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ["#校园日常", "#图书馆"],
    likes: 35,
    comments: 9,
    shares: 4,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
];

/**
 * Mock 帖子列表（2026-08-08 论坛互动真实化）：
 * 收藏数/浏览量派生自点赞数；post-1 / post-4 预置收藏态便于演示初始状态。
 */
export const mockPosts: PostItem[] = mockPostsRaw.map((p) => ({
  ...p,
  favorites: Math.floor(p.likes / 3),
  views: p.likes * 10,
  isFavorite: p.id === "post-1" || p.id === "post-4",
}));

/**
 * Mock 帖子浏览历史（2026-08-08 论坛互动真实化）：取前 6 条，浏览时间错开。
 */
export const mockPostHistory: { post: PostItem; viewedAt: string }[] =
  mockPosts.slice(0, 6).map((p, i) => ({
    post: p,
    viewedAt: new Date(
      Date.now() - 1000 * 60 * 60 * (i * 3 + 1)
    ).toISOString(),
  }));

/** Mock 评论列表 */
export const mockComments: CommentItem[] = [
  {
    id: "comment-1",
    postId: "post-1",
    author: mockAuthors[1],
    content: "同在北京，可以认识一下吗？",
    likes: 6,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "comment-2",
    postId: "post-1",
    author: mockAuthors[2],
    content: "志愿者活动是在哪里做的呀？",
    likes: 3,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "comment-3",
    postId: "post-4",
    author: mockAuthors[0],
    content: "完全同意！三观不合真的很难走下去。",
    likes: 12,
    isLiked: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "comment-4",
    postId: "post-4",
    author: mockAuthors[4],
    content: "我觉得人品和责任心也很重要。",
    likes: 8,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

// 2026-08-08 论坛互动真实化：mock 评论覆盖全部 mock 帖子
// （修复 mock 模式下大部分帖子评论区为空——原 mockComments 只覆盖 post-1/post-2/post-4）
const mockCommentSeed = [
  "支持一下楼主！",
  "说得很有道理",
  "学到了，感谢分享",
  "路过帮顶",
  "同感+1",
];
mockPosts.slice(4).forEach((p, i) => {
  const author = mockAuthors[i % mockAuthors.length];
  if (!author) return; // 防御：mockAuthors 池意外为空时跳过
  mockComments.push({
    id: `comment-mock-${i + 1}`,
    postId: p.id,
    author,
    content: mockCommentSeed[i % mockCommentSeed.length] ?? "支持一下楼主！",
    likes: (i * 3) % 9,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * (i + 1)).toISOString(),
  });
});
