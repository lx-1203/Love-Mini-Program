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

/** 帖子内容最大长度（字符） */
export const POST_MAX_LENGTH = 1000;

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
 * 发帖草稿本地存储键。
 *
 * 用于持久化用户输入的内容、图片、标签等，
 * 误退页面后再次进入可恢复草稿，避免内容丢失。
 */
export const POST_DRAFT_STORAGE_KEY = "village:post-draft";

/** 发帖成功后跳转回上一页的延迟（毫秒） */
export const POST_SUBMIT_NAVIGATE_BACK_MS = 800;

/** 默认选中分类 ID */
export const DEFAULT_CATEGORY_ID = "cat-sincere";
