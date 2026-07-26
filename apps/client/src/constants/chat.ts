/**
 * 聊天相关常量
 *
 * 集中维护聊天模块（chat-session、stores/chat.ts）使用的消息长度限制、
 * 图片数量限制、消息投递状态存储键、发送重试参数等。
 *
 * 注意：
 * - 与 stores/chat.ts 内部使用的常量保持一致，迁移后由本文件统一导出
 * - 消息投递状态持久化到本地存储，跨会话/刷新后仍可恢复展示
 */

/** 单条消息最大长度（字符） */
export const MESSAGE_MAX_LENGTH = 1000;

/** 单次发送最大图片数量 */
export const MESSAGE_MAX_IMAGES = 9;

/** 预置话题标签最大选择数 */
export const MAX_PRESET_TAGS = 3;

/** 自定义话题标签最大数量 */
export const MAX_CUSTOM_TAGS = 5;

/**
 * 消息投递状态本地存储键。
 *
 * 用于持久化每条消息的 sending/sent/failed 状态，
 * 页面刷新或切换会话后仍可恢复展示。
 */
export const MESSAGE_STATUS_STORAGE_KEY = "chat:message-delivery-status";

/** 消息发送最大重试次数（仅对网络层错误重试） */
export const MAX_SEND_RETRIES = 1;

/** 消息发送重试延迟（毫秒） */
export const SEND_RETRY_DELAY_MS = 500;

/** 空闲破冰提示触发延迟（毫秒）：用户 5 秒未输入则展示破冰话题 */
export const IDLE_ICEBREAKER_DELAY_MS = 5000;

/** 临时会话倒计时刷新间隔（毫秒） */
export const COUNTDOWN_TICK_MS = 1000;

/** 录音计时器刷新间隔（毫秒） */
export const RECORDING_TICK_MS = 1000;

/** 发帖成功后跳转回上一页的延迟（毫秒） */
export const POST_SUCCESS_NAVIGATE_BACK_MS = 800;

/** 发帖页草稿保存防抖延迟（毫秒） */
export const POST_DRAFT_SAVE_DEBOUNCE_MS = 500;

/** 页面入场动画延迟（毫秒） */
export const PAGE_ENTER_ANIMATION_DELAY_MS = 30;
