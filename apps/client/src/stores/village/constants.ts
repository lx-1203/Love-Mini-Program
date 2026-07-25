/**
 * Village Store 常量定义
 *
 * 集中维护村口社区相关的所有常量：
 * - 内容/图片限制
 * - 防抖时间
 * - 排序选项
 * - 分页大小
 */

/** 内容最大长度 */
export const MAX_CONTENT_LENGTH = 500;

/** 图片最大数量 */
export const MAX_IMAGES_COUNT = 9;

/**
 * 评论发送防抖延迟（毫秒）。
 *
 * 修复（P1 BUG）：用户快速点击发送评论按钮时，可能触发多次 commentPost 请求，
 * 导致后端创建重复评论。通过 500ms 防抖窗口合并多次点击为一次实际请求。
 */
export const COMMENT_DEBOUNCE_MS = 500;

/**
 * 默认分页大小。
 * 与后端约定：每页 20 条帖子。
 */
export const PAGE_SIZE = 20;

/**
 * 帖子排序选项。
 * - latest: 按创建时间倒序（默认）
 * - hot: 按点赞数倒序
 */
export const SORT_OPTIONS = ["latest", "hot"] as const;

/** 帖子排序类型 */
export type SortOption = (typeof SORT_OPTIONS)[number];

/** 校园分类 ID */
export const CATEGORY_CAMPUS_ID = "cat-campus";

/** 全部分类 ID */
export const CATEGORY_ALL_ID = "cat-all";

/** 分类 ID 前缀（用于去除前缀转换后端分类名） */
export const CATEGORY_PREFIX = "cat-";
