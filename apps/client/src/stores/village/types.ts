/**
 * Village Store 类型定义
 *
 * 集中维护村口社区相关的所有 TypeScript 类型定义：
 * - 实体类型：PostCategory / PostAuthor / PostItem / CommentItem / SimilarAuthor
 * - 状态类型：VillageState
 * - 后端视图类型：PostSummaryView / PostAuthorView / PostDetailView 等
 * - 筛选类型：PostFilters
 */

/**
 * 帖子分类
 */
export interface PostCategory {
  id: string;
  name: string;
  icon: string;
}

/**
 * 帖子作者
 */
export interface PostAuthor {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  /** 所属学校名称，用于同校匹配 */
  campusName?: string;
  /** 兴趣标签列表 */
  interests?: string[];
  /** P1-16：作者年龄（后端 PostAuthorView.age，由年级推导，缺失为 null） */
  age?: number | null;
  /** P1-16：作者所在城市（后端 PostAuthorView.city） */
  city?: string;
  /** P1-16：作者学历（后端 PostAuthorView.education：bachelor/master/phd） */
  education?: string;
}

/**
 * 帖子列表项
 */
export interface PostItem {
  id: string;
  author: PostAuthor;
  categoryId: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: number;
  /** 转发次数 */
  shares: number;
  isLiked: boolean;
  isFollowed: boolean;
  /** 当前用户是否已转发 */
  isShared: boolean;
  /** 作者是否与当前用户同校 */
  isAlumni: boolean;
  /** Phase Feedback4：帖子所属城市（同城 Tab 过滤用） */
  city?: string;
  /** Phase Feedback4：搭子圈标签（discover-buddy 过滤用，如"运动搭子"） */
  buddyTags?: string[];
  createdAt: string;
}

/**
 * 评论项
 */
export interface CommentItem {
  id: string;
  postId: string;
  author: PostAuthor;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: string;
  /** P1-02 楼中楼：父评论 ID（null 为根评论） */
  parentId?: string | null;
  /** P1-02 楼中楼：回复对象昵称（楼中楼回复时展示"回复 @昵称"） */
  replyTo?: string | null;
  /** P1-02 楼中楼：回复子列表（根评论携带，子评论为空） */
  replies?: CommentItem[];
}

/**
 * 相似作者推荐项
 */
export interface SimilarAuthor {
  userId: string;
  name: string;
  nickname?: string;
  avatar: string;
  avatarUrl?: string;
  campusName: string;
  headline: string;
  isAlumni: boolean;
  commonInterests: string[];
  isFollowed: boolean;
}

/**
 * 帖子筛选条件
 */
export interface PostFilters {
  categoryId?: string;
  keyword?: string;
  sortBy?: "latest" | "hot";
  /** 当前用户 ID，用于校园分类筛选 */
  userId?: string;
  /** Phase Feedback4：同城 Tab 城市名（如"南京"），配合 categoryId="cat-samecity" */
  city?: string;
  /** Phase Feedback4：发现 Tab 二级子标签（all/alumni/hometown/buddy） */
  discoverSub?: string;
}

/**
 * VillageStore 状态
 */
export interface VillageState {
  /** 帖子列表 */
  posts: PostItem[];
  /** 当前查看的帖子详情 */
  currentPost: PostItem | null;
  /** 评论列表 */
  comments: CommentItem[];
  /** 分类列表 */
  categories: PostCategory[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 当前页码（从1开始） */
  page: number;
  /** 是否还有更多数据可加载 */
  hasMore: boolean;
  /** 同校动态流 - 帖子列表 */
  campusFeedPosts: PostItem[];
  /** 同校动态流 - 活动列表 */
  campusFeedActivities: Record<string, unknown>[];
  /** 同校动态流 - 话题列表 */
  campusFeedTopics: Record<string, unknown>[];
  /** 同校动态流是否正在加载 */
  loadingCampusFeed: boolean;
  /** 相似作者推荐列表 */
  similarAuthors: SimilarAuthor[];
  /** 相似作者推荐是否正在加载 */
  loadingSimilarAuthors: boolean;
}

/**
 * 后端 PostSummaryView 类型
 * 对应后端 record PostSummaryView
 */
export interface PostSummaryView {
  id: number;
  title: string;
  summary: string;
  author: PostAuthorView;
  category: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isHot: boolean;
  isAlumni: boolean;
  /** Phase Feedback3 P2.5：作者是否被当前用户关注（关注 Tab 打通；后端缺失时回退 false） */
  isFollowed?: boolean;
}

/**
 * 后端 PostAuthorView 类型
 * 对应后端 record PostAuthorView(Long userId, String nickname, String avatarUrl, String campusName, Integer age, String city, String education)
 */
export interface PostAuthorView {
  userId: number;
  nickname: string;
  avatarUrl: string;
  campusName: string;
  /** P1-16：年龄（由年级推导，缺失为 null） */
  age?: number | null;
  /** P1-16：所在城市 */
  city?: string;
  /** P1-16：学历（bachelor/master/phd） */
  education?: string;
}

/**
 * 后端 PostDetailView 类型
 * 对应后端 record PostDetailView
 */
export interface PostDetailView {
  id: number;
  title: string;
  content: string;
  author: PostAuthorView;
  category: string;
  tags: string[];
  images: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked: boolean;
  isAuthor: boolean;
  isAlumni: boolean;
  /** Phase Feedback3 P2.5：作者是否被当前用户关注 */
  isFollowed?: boolean;
}

/**
 * 后端 PostListResponse 类型
 * 对应后端 record PostListResponse(List<PostSummaryView> items, int total, int page, int pageSize)
 */
export interface PostListResponse {
  items: PostSummaryView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端 CommentItemView 类型
 * 对应后端 record CommentItemView
 */
export interface CommentItemView {
  id: number;
  postId: number;
  parentId: number | null;
  author: CommentAuthorView;
  content: string;
  likeCount: number;
  createdAt: string;
  isAuthor: boolean;
  replyTo: string | null;
  /** P1-02 楼中楼：回复子列表（根评论携带，子评论为空列表） */
  replies?: CommentItemView[];
}

/**
 * 后端 CommentAuthorView 类型
 */
export interface CommentAuthorView {
  userId: number;
  nickname: string;
  avatarUrl: string;
}

/**
 * 后端 CommentListResponse 类型
 */
export interface CommentListResponse {
  items: CommentItemView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端 PostLikeResponse 类型
 */
export interface PostLikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
}

/**
 * 后端 ShareView 类型
 */
export interface ShareView {
  id: number;
  postId: number;
  shareCount: number;
}
