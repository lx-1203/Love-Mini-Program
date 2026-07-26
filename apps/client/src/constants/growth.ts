/**
 * 成长/签到相关常量
 *
 * 集中维护签到（checkin）、消息中心（messages）等成长类模块使用的
 * 异步超时、动画收起延迟、补签次数上限等。
 *
 * 注意：
 * - ASYNC_TIMEOUT_MS 在 checkin.ts 与 messages.ts 中均使用，统一从此处导入
 * - 签到成功动画定时器需保存句柄，组件卸载或新签到时清理，避免覆盖状态
 */

/** 异步操作超时时间（毫秒）：用于签到/消息等接口的超时控制 */
export const ASYNC_TIMEOUT_MS = 15000;

/** 签到成功动画自动收起延迟（毫秒） */
export const SUCCESS_ANIMATION_AUTO_DISMISS_MS = 3000;

/** 默认补签次数上限（每月） */
export const DEFAULT_MAKEUP_LIMIT = 3;

/** 签到获取的额外推荐次数（mock 模式默认值） */
export const CHECKIN_EXTRA_RECOMMENDATIONS = 5;

/** 签到权益-额外推荐配额（签到成功后 +N） */
export const CHECKIN_EXTRA_QUOTA = 5;

/** 签到解锁热门话题数量（mock 模式默认值） */
export const CHECKIN_HOT_TOPIC_COUNT = 3;

/** 签到解锁新入圈用户数量（mock 模式默认值） */
export const CHECKIN_NEW_USER_COUNT = 2;

/** 临时会话默认时长（毫秒）：24 小时 */
export const TEMP_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
