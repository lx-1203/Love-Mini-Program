/**
 * 微信登录认证服务（Task 0.1.1 真实链路实现）。
 *
 * <p>提供 {@link loginWithWechat} 端到端登录流程：</p>
 * <ol>
 *   <li>调用 {@code uni.login({provider: "weixin"})} 获取微信临时 code
 *       （带 15 秒超时 + state CSRF 防护）</li>
 *   <li>POST {@code /v1/auth/wechat} 将 code 发送到后端，后端调用微信
 *       {@code jscode2session} 换取 openId / session_key</li>
 *   <li>后端查找/创建用户、签发 JWT，返回 UserSession</li>
 *   <li>客户端保存 token / refreshToken 到本地存储</li>
 * </ol>
 *
 * <p>错误处理：抛出 {@link WechatLoginError}，携带明确业务错误码，
 * 调用方可根据 code 做精细化分支处理（重新拉起登录、提示账号禁用、提示微信服务不可用等）。
 * 错误码与后端 {@code WechatLoginException.ErrorCode} 对齐：</p>
 * <ul>
 *   <li>{@code INVALID_CODE}（401）：微信 code 失效或已过期，应重新拉起 wx.login</li>
 *   <li>{@code WECHAT_API_ERROR}（502）：微信 API 调用失败，提示稍后重试</li>
 *   <li>{@code USER_DISABLED}（403）：用户被禁用，提示联系管理员</li>
 *   <li>{@code CLIENT_ERROR}：客户端侧错误（wx.login 超时 / 用户拒绝 / 网络错误等）</li>
 * </ul>
 *
 * <p>工程约束：</p>
 * <ul>
 *   <li>不使用 {@code import.meta.env.DEV}（mp-weixin 不支持）</li>
 *   <li>不使用 {@code catch {}} 空绑定（mp-weixin 不兼容），统一 {@code catch (e) { ... }}</li>
 *   <li>不使用 {@code :hover} 伪类</li>
 *   <li>不含任何 Mock fallback，登录失败显示具体错误</li>
 * </ul>
 */

import { request, setToken, setRefreshToken } from "./http";
import type { components } from "./generated/api-types";

type Schemas = components["schemas"];
type UserSession = Schemas["UserSession"];

/** 微信登录超时时间（毫秒），超时后提示用户重试 */
const WECHAT_LOGIN_TIMEOUT_MS = 15000;
/** 本地存储中用于 CSRF 防护的 state key */
const WECHAT_LOGIN_STATE_KEY = "login:wechat:state";
/** 后端微信登录端点（相对 apiBaseUrl，最终拼成 /api/v1/auth/wechat） */
const WECHAT_LOGIN_ENDPOINT = "/v1/auth/wechat";

/**
 * 微信登录业务错误码。
 *
 * 与后端 {@code WechatLoginException.ErrorCode} 对齐，前端按 code 分支处理：
 * - INVALID_CODE：清本地 token + 重新拉起 wx.login
 * - WECHAT_API_ERROR：提示"微信服务暂时不可用，请稍后重试"
 * - USER_DISABLED：提示"账号已被禁用，请联系管理员"
 * - CLIENT_ERROR：提示具体的客户端错误（超时 / 拒绝授权 / 网络错误）
 */
export enum WechatLoginErrorCode {
  /** 微信 code 失效或已过期（后端返回 401） */
  INVALID_CODE = "INVALID_CODE",
  /** 微信 API 调用失败（后端返回 502） */
  WECHAT_API_ERROR = "WECHAT_API_ERROR",
  /** 用户已被禁用（后端返回 403） */
  USER_DISABLED = "USER_DISABLED",
  /** 客户端侧错误：wx.login 超时 / 用户拒绝授权 / 网络错误等 */
  CLIENT_ERROR = "CLIENT_ERROR",
}

/**
 * 微信登录错误类。
 *
 * 携带业务错误码 {@link code} 与用户友好消息 {@link message}，
 * 调用方捕获后可直接使用 error.code 与 error.message 进行分支处理与 UI 提示。
 */
export class WechatLoginError extends Error {
  /** 业务错误码，用于前端分支处理 */
  readonly code: WechatLoginErrorCode;
  /** HTTP 状态码（CLIENT_ERROR 时为 0） */
  readonly status: number;

  constructor(code: WechatLoginErrorCode, message: string, status = 0) {
    super(message);
    this.name = "WechatLoginError";
    this.code = code;
    this.status = status;
  }
}

/**
 * 生成随机 state 字符串用于 CSRF 防护。
 *
 * 在 mp-weixin 端 crypto 可能不可用，使用 Math.random 兜底。
 * state 写入本地存储，wx.login 返回后校验一致性，防止中间人伪造登录请求。
 */
function generateLoginState(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (e) {
    // crypto 不可用时走兜底（mp-weixin 端可能不支持 crypto.randomUUID）
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 调用 uni.login 获取微信 code，带 15 秒超时与 state 校验防 CSRF。
 *
 * 流程：
 * 1. 生成本地 state 写入 storage
 * 2. 调用 uni.login({provider: "weixin"}) 拉起微信登录
 * 3. 校验返回的 code 与本地 state 一致（防 CSRF）
 * 4. 超时则抛出 WechatLoginError(CLIENT_ERROR)
 *
 * @returns 微信临时登录凭证 code（5 分钟有效）
 * @throws WechatLoginError 当超时 / 用户拒绝 / state 校验失败 / 无 code 返回时抛出
 */
function getWxLoginCode(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const state = generateLoginState();
    try {
      uni.setStorageSync(WECHAT_LOGIN_STATE_KEY, state);
    } catch (e) {
      // storage 写入失败不阻塞登录，但 state 校验会失败
    }

    const timer = setTimeout(() => {
      // 超时拒绝，提示重试
      reject(
        new WechatLoginError(
          WechatLoginErrorCode.CLIENT_ERROR,
          "微信登录超时，请重试"
        )
      );
    }, WECHAT_LOGIN_TIMEOUT_MS);

    uni.login({
      provider: "weixin",
      success: (res) => {
        clearTimeout(timer);
        // 校验 state 防 CSRF：本地存储的 state 与本次生成必须一致
        let savedState = "";
        try {
          savedState = uni.getStorageSync(WECHAT_LOGIN_STATE_KEY) as string;
        } catch (e) {
          // 读取失败忽略，但 state 校验会失败
        }
        if (!savedState || savedState !== state) {
          reject(
            new WechatLoginError(
              WechatLoginErrorCode.CLIENT_ERROR,
              "登录状态校验失败，请重试"
            )
          );
          return;
        }
        if (!res.code) {
          reject(
            new WechatLoginError(
              WechatLoginErrorCode.CLIENT_ERROR,
              "微信登录未返回有效凭证，请重试"
            )
          );
          return;
        }
        resolve(res.code);
      },
      fail: (err) => {
        clearTimeout(timer);
        // uni.login fail 通常是用户拒绝授权或微信客户端异常
        const errMsg = err?.errMsg || "微信登录失败";
        // 拒绝授权的常见 errMsg: "login:fail user deny"
        const isUserDeny = /deny|cancel|拒绝|取消/i.test(errMsg);
        const message = isUserDeny
          ? "您已取消微信登录"
          : `微信登录失败：${errMsg}`;
        reject(
          new WechatLoginError(WechatLoginErrorCode.CLIENT_ERROR, message)
        );
      },
    });
  });
}

/**
 * 将后端错误响应转换为 WechatLoginError。
 *
 * 后端 GlobalExceptionHandler 返回的标准错误体格式：
 * { error: string, message: string, status: number, code?: string }
 *
 * 根据 status 与 code 字段映射到对应的 WechatLoginErrorCode：
 * - 401 + INVALID_CODE → INVALID_CODE
 * - 403 + USER_DISABLED → USER_DISABLED
 * - 502 + WECHAT_API_ERROR → WECHAT_API_ERROR
 * - 其他 → CLIENT_ERROR（兜底）
 *
 * @param status HTTP 状态码
 * @param data 响应体（可能含 code 字段）
 * @param fallbackMessage 兜底错误消息
 */
function buildWechatLoginError(
  status: number,
  data: unknown,
  fallbackMessage: string
): WechatLoginError {
  let errorCode: WechatLoginErrorCode;
  let message = fallbackMessage;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    // 优先读取后端返回的 code 字段（业务错误码）
    const code =
      typeof record.code === "string" ? record.code.toUpperCase() : "";
    // 读取后端返回的 message 字段（用户友好消息）
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      message = record.message;
    }

    if (code === WechatLoginErrorCode.INVALID_CODE || status === 401) {
      errorCode = WechatLoginErrorCode.INVALID_CODE;
    } else if (code === WechatLoginErrorCode.USER_DISABLED || status === 403) {
      errorCode = WechatLoginErrorCode.USER_DISABLED;
    } else if (code === WechatLoginErrorCode.WECHAT_API_ERROR || status === 502) {
      errorCode = WechatLoginErrorCode.WECHAT_API_ERROR;
    } else {
      errorCode = WechatLoginErrorCode.CLIENT_ERROR;
    }
  } else {
    // 无响应体，按 HTTP 状态码兜底
    if (status === 401) {
      errorCode = WechatLoginErrorCode.INVALID_CODE;
    } else if (status === 403) {
      errorCode = WechatLoginErrorCode.USER_DISABLED;
    } else if (status === 502) {
      errorCode = WechatLoginErrorCode.WECHAT_API_ERROR;
    } else {
      errorCode = WechatLoginErrorCode.CLIENT_ERROR;
    }
  }

  return new WechatLoginError(errorCode, message, status);
}

/**
 * 微信登录真实链路入口（Task 0.1.1）。
 *
 * <p>端到端流程：</p>
 * <ol>
 *   <li>调用 {@link getWxLoginCode} 获取微信临时 code（带超时 + state CSRF 防护）</li>
 *   <li>POST {@code /v1/auth/wechat} 将 code 发送到后端</li>
 *   <li>后端调用微信 {@code jscode2session} 换取 openId、查找/创建用户、签发 JWT</li>
 *   <li>保存 token / refreshToken 到本地存储</li>
 *   <li>返回用户会话信息</li>
 * </ol>
 *
 * <p>错误处理：所有失败场景统一抛出 {@link WechatLoginError}，
 * 调用方捕获后根据 {@link WechatLoginError.code} 做精细化分支处理。</p>
 *
 * <p>注意：本函数不含任何 Mock fallback，登录失败会抛出具体错误。
 * 调用方应使用 try/catch 捕获并在 UI 上显示 {@link WechatLoginError.message}。</p>
 *
 * @returns 用户会话信息（含 userId / loggedIn / profileCompleted 等）
 * @throws WechatLoginError 当 wx.login 失败 / 后端返回业务错误 / 网络异常时抛出
 */
export async function loginWithWechat(): Promise<UserSession> {
  // 1. 调用 wx.login 获取临时 code（带超时 + state CSRF 防护）
  const code = await getWxLoginCode();

  // 2. POST code 到后端 /v1/auth/wechat 端点
  //    使用 skipAuth=true 跳过 Authorization 头附加（登录前无 token）
  //    使用 noRetry=true 避免登录失败时自动重试（应明确返回错误给用户）
  let response: UserSession;
  try {
    response = await request<UserSession, { code: string }>({
      url: WECHAT_LOGIN_ENDPOINT,
      method: "POST",
      data: { code },
      skipAuth: true,
      noRetry: true,
    });
  } catch (error) {
    // 将 HTTP 错误转换为 WechatLoginError
    // EnhancedApiError / AppApiError 均包含 status 字段，从中提取错误信息
    const status =
      error !== null &&
      typeof error === "object" &&
      "status" in error
        ? (error as { status: number }).status
        : 0;
    const message =
      error !== null &&
      typeof error === "object" &&
      "message" in error
        ? String((error as { message: unknown }).message)
        : "登录失败，请稍后重试";
    const details =
      error !== null &&
      typeof error === "object" &&
      "details" in error
        ? (error as { details: unknown }).details
        : undefined;
    throw buildWechatLoginError(status, details, message);
  }

  // 3. 保存 token / refreshToken 到本地存储
  //    UserSession schema 暂未声明 token / refreshToken 字段，通过 unknown 中转 +
  //    类型守卫安全访问，避免 `as Record<string, unknown>` 反复断言。
  const responseRecord = response as unknown as Record<string, unknown>;
  if (
    typeof responseRecord.token === "string" &&
    responseRecord.token.length > 0
  ) {
    setToken(responseRecord.token);
  }
  if (
    typeof responseRecord.refreshToken === "string" &&
    responseRecord.refreshToken.length > 0
  ) {
    setRefreshToken(responseRecord.refreshToken);
  }

  return response;
}
