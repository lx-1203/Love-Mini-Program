/**
 * 村口社区相关常量
 *
 * 集中维护村口社区（village）模块的发帖内容限制、图片数量、草稿存储键等。
 * 与 stores/village/constants.ts 互补——后者偏向 store 数据流（分页/排序/防抖），
 * 本文件偏向页面层（发帖页 post.vue）的内容限制与本地存储。
 *
 * 注意：
 * - 帖子内容长度上限与 chat-session 页面对齐，便于复用 MESSAGE_MAX_LENGTH
 * - 图片上传限制 ≤10MB（项目硬约束），单帖最多 9 张
 */

/**
 * 帖子内容最大长度（字符）。
 * MP-R1-PUBLISH-012 曾把本值从 1000 抄成 500 以对齐 store，代价是两处字面量必须手工同步
 * ——这正是 MP-R1-PUB-016 的病灶。2026-10-26 起直接取 store 常量的引用，只留一个数。
 */
export { MAX_CONTENT_LENGTH as POST_MAX_LENGTH } from "../stores/village/constants";

/** 帖子标题最小长度（字符，P1-01 必填校验） */
export const POST_TITLE_MIN_LENGTH = 5;

/** 帖子标题最大长度（字符） */
export const POST_TITLE_MAX_LENGTH = 30;

/** 帖子最大图片数量 */
export const POST_MAX_IMAGES = 9;

/** 自定义标签最大数量 */
export const POST_MAX_CUSTOM_TAGS = 5;

/** 图片压缩质量（0-100） */
export const IMAGE_COMPRESS_QUALITY = 80;

/**
 * 发帖草稿本地存储键（post.vue 专用）。
 *
 * MP-R1-PUBLISH-004：publish.vue 与 post.vue 曾共用本键但快照结构不同
 * （post 有独立 title、无 tags；publish 无 title、多 tags 且双写后端），
 * 互相污染（post 的 title 被静默丢弃、publish 的空 title 反向覆盖）。
 * publish 改用独立键 PUBLISH_DRAFT_STORAGE_KEY，本键仅 post.vue 使用。
 */
export const POST_DRAFT_STORAGE_KEY = "village:post-draft";

/**
 * 统一发布页草稿本地存储键（publish.vue 专用，MP-R1-PUBLISH-004）。
 * 快照带 updatedAt 时间戳，与后端草稿按「取新」恢复。
 */
export const PUBLISH_DRAFT_STORAGE_KEY = "village:publish-draft";

/** 发帖成功后跳转回上一页的延迟（毫秒） */
export const POST_SUBMIT_NAVIGATE_BACK_MS = 800;

/** 默认选中分类 ID */
export const DEFAULT_CATEGORY_ID = "cat-sincere";
