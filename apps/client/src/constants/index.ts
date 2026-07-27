/**
 * 统一常量入口
 *
 * 集中导出所有业务模块的常量，便于上层模块按需引用：
 *   import { SWIPE_THRESHOLD, ASYNC_TIMEOUT_MS, ROUTES, STORAGE_KEYS } from "@/constants";
 *
 * 模块划分：
 * - app:    应用全局常量（应用名称、版本、统一存储键名等）
 * - api:    HTTP 请求层常量（超时、重试、状态码等）
 * - match:  寻觅/匹配相关常量（滑动阈值、长按时延、动画参数等）
 * - chat:   聊天相关常量（消息长度限制、发送重试、存储键等）
 * - village: 村口社区相关常量（帖子内容限制、草稿存储键等）
 * - growth: 成长/签到相关常量（异步超时、动画收起、补签上限等）
 * - ui:     UI 交互相关常量（振动反馈、录音参数、按压停留等）
 * - routes: 统一页面路径常量（SubTask 3.5.1）
 * - storage-keys: 统一本地存储键名（SubTask 3.5.2）
 * - api-params: API 协议参数（Bearer 前缀/wxCode/WebSocket topic，SubTask 3.5.3）
 * - limits: UI 限制与魔法数字（UI_LIMITS/API_TIMEOUT/WS_RECONNECT，SubTask 3.5.4）
 *
 * 注意：
 * - 已有的领域常量文件（如 stores/discover/constants.ts、stores/village/constants.ts）
 *   保持原位置不变，本目录仅作为统一入口汇聚跨模块复用的常量
 * - 不引入新依赖，仅使用 TypeScript 原生语法
 */

export * from "./app";
export * from "./api";
export * from "./match";
export * from "./chat";
export * from "./village";
export * from "./growth";
export * from "./ui";
export * from "./routes";
export * from "./storage-keys";
export * from "./api-params";
export * from "./limits";
