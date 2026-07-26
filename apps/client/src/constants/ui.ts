/**
 * UI 交互相关常量
 *
 * 集中维护通用 UI 交互（振动反馈、录音、按压动画等）相关参数。
 * 业务模块的 UI 参数（如卡片滑动阈值）请在对应业务常量文件中声明。
 *
 * 注意：
 * - H5 端 uni.vibrateShort 不支持 type 参数，调用会静默失败
 * - 录音格式 mp3，最长 60 秒（与后端 VoiceMessageService 限制一致）
 * - 录音时长过短（<1 秒）触发取消回调
 */

/** 振动反馈间隔（毫秒）：连续两次振动之间的延迟 */
export const HAPTIC_INTERVAL_MS = 100;

/** 录音默认最长时长（毫秒）：60 秒，与后端 VoiceMessageService 限制一致 */
export const RECORDER_MAX_DURATION_MS = 60_000;

/** 录音默认采样率（Hz） */
export const RECORDER_SAMPLE_RATE = 8000;

/** 录音默认编码码率（kbps） */
export const RECORDER_ENCODE_BIT_RATE = 64;

/** 最小有效录音时长（秒）：低于此值视为取消 */
export const RECORDER_MIN_DURATION_SECONDS = 1;

/** 录音默认格式 */
export const RECORDER_DEFAULT_FORMAT = "mp3" as const;

/** 按压反馈停留时间（毫秒）：mp-weixin hover-stay-time 配置 */
export const PRESS_FEEDBACK_STAY_MS = 120;

/** swiper 默认切换动画时长（毫秒） */
export const SWIPER_DEFAULT_DURATION_MS = 300;

/** 心跳粒子动画粒子数量（签到成功触发） */
export const HEART_PARTICLE_COUNT = 12;

/** 心跳粒子动画时长（毫秒） */
export const HEART_PARTICLE_DURATION_MS = 1500;

/** 在线状态点动画时长（毫秒）：pulse-dot 关键帧周期 */
export const ONLINE_DOT_PULSE_MS = 1500;

/** 匹配标签 pulse 动画周期（毫秒） */
export const MATCH_TAG_PULSE_MS = 2000;
