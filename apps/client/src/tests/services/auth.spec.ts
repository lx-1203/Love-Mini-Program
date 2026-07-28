import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 客户端微信登录服务单元测试（Task 0.1.5）
 *
 * 验证 `services/auth.ts` 的 `loginWithWechat()` 端到端行为：
 * 1. 成功场景：wx.login 返回 code → POST /v1/auth/wechat → 返回 UserSession 并保存 token
 * 2. INVALID_CODE 场景：后端返回 401 + INVALID_CODE → 抛出 WechatLoginError(INVALID_CODE)
 * 3. WECHAT_API_ERROR 场景：后端返回 502 + WECHAT_API_ERROR → 抛出 WechatLoginError(WECHAT_API_ERROR)
 * 4. USER_DISABLED 场景：后端返回 403 + USER_DISABLED → 抛出 WechatLoginError(USER_DISABLED)
 * 5. CLIENT_ERROR 场景：wx.login 失败（用户拒绝授权）→ 抛出 WechatLoginError(CLIENT_ERROR)
 *
 * 工程约束：
 * - 不使用 `import.meta.env.DEV`（mp-weixin 不支持）
 * - 不使用 `catch {}` 空绑定（mp-weixin 不兼容），统一 `catch (e) { ... }`
 * - 不含任何 Mock fallback，登录失败显示具体错误
 */

// ------------------------------------------------------------------
// Mock 依赖：services/http
// ------------------------------------------------------------------
// 通过 vi.mock 替换 http 模块的 request / setToken / setRefreshToken，
// 避免触发真实的 uni.request 网络调用，并允许在每个用例中控制其行为。
const mockRequest = vi.fn();
const mockSetToken = vi.fn();
const mockSetRefreshToken = vi.fn();

vi.mock("../../services/http", () => ({
  request: (...args: unknown[]) => mockRequest(...args),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  setRefreshToken: (...args: unknown[]) => mockSetRefreshToken(...args),
}));

// ------------------------------------------------------------------
// Stub 全局 uni：login / setStorageSync / getStorageSync
// ------------------------------------------------------------------
// 使用 Map 模拟 storage，使 state CSRF 校验能正常通过
// （generateLoginState 写入 → getWxLoginCode 校验时读取）。
type UniLoginOpts = {
  provider: string;
  success?: (res: { code?: string; errMsg?: string }) => void;
  fail?: (err: { errMsg?: string }) => void;
};

const storageMap = new Map<string, unknown>();
let capturedLoginOpts: UniLoginOpts | null = null;

(globalThis as any).uni = {
  setStorageSync: vi.fn((key: string, value: unknown) => {
    storageMap.set(key, value);
  }),
  getStorageSync: vi.fn((key: string) => storageMap.get(key) ?? ""),
  login: vi.fn((opts: UniLoginOpts) => {
    capturedLoginOpts = opts;
  }),
};

// ------------------------------------------------------------------
// 在 mock 设置完成后导入被测模块
// ------------------------------------------------------------------
import {
  loginWithWechat,
  WechatLoginError,
  WechatLoginErrorCode,
} from "../../services/auth";

/**
 * 触发 uni.login 的 success 回调（模拟微信客户端返回 code）。
 */
function triggerLoginSuccess(code: string): void {
  expect(capturedLoginOpts).not.toBeNull();
  capturedLoginOpts!.success!({ code });
}

/**
 * 触发 uni.login 的 fail 回调（模拟用户拒绝授权或微信客户端异常）。
 */
function triggerLoginFail(errMsg: string): void {
  expect(capturedLoginOpts).not.toBeNull();
  capturedLoginOpts!.fail!({ errMsg });
}

/**
 * 等待一个微任务周期，让 loginWithWechat 内部的 Promise 链推进到
 * 调用 uni.login 的位置，以便后续触发 success / fail 回调。
 */
function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe("services/auth - loginWithWechat (Task 0.1.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    capturedLoginOpts = null;
  });

  // ----------------------------------------------------------------
  // 场景 1：登录成功
  // ----------------------------------------------------------------
  it("success: wx.login 返回 code → POST /v1/auth/wechat → 保存 token 并返回 UserSession", async () => {
    // Arrange：构造后端成功返回的 UserSession（含 token / refreshToken）
    const mockSession = {
      userId: "100",
      loggedIn: true,
      loginMethod: "wechat" as const,
      displayName: "测试用户",
      phoneBound: false,
      profileCompleted: false,
      campusVerified: false,
      scheduleCompleted: false,
      featureFlags: {},
      // token / refreshToken 不在 schema 中，但后端实际会返回（运行时透传）
      token: "jwt-token-abc",
      refreshToken: "refresh-token-xyz",
    };
    mockRequest.mockResolvedValue(mockSession);

    // Act：发起登录，等待 uni.login 被调用，触发 success 回调
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("valid-wx-code");
    const result = await promise;

    // Assert：返回的会话信息与 mock 一致
    expect(result).toEqual(mockSession);

    // Assert：request 被以正确的参数调用（POST + skipAuth + noRetry）
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledWith({
      url: "/v1/auth/wechat",
      method: "POST",
      data: { code: "valid-wx-code" },
      skipAuth: true,
      noRetry: true,
    });

    // Assert：token 与 refreshToken 被持久化到本地存储
    expect(mockSetToken).toHaveBeenCalledTimes(1);
    expect(mockSetToken).toHaveBeenCalledWith("jwt-token-abc");
    expect(mockSetRefreshToken).toHaveBeenCalledTimes(1);
    expect(mockSetRefreshToken).toHaveBeenCalledWith("refresh-token-xyz");
  });

  // ----------------------------------------------------------------
  // 场景 2：INVALID_CODE - 微信 code 失效（401）
  // ----------------------------------------------------------------
  it("INVALID_CODE: 后端返回 401 + INVALID_CODE 时抛出 WechatLoginError(INVALID_CODE)", async () => {
    // Arrange：模拟 request 抛出包含 status=401 与 details.code=INVALID_CODE 的错误
    const apiError = {
      status: 401,
      message: "微信登录凭证已失效，请重新登录",
      details: {
        code: "INVALID_CODE",
        message: "微信登录凭证已失效，请重新登录",
      },
    };
    mockRequest.mockRejectedValue(apiError);

    // Act：发起登录并触发 wx.login success
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("expired-wx-code");

    // Assert：应抛出 WechatLoginError，且错误码为 INVALID_CODE
    await expect(promise).rejects.toMatchObject({
      name: "WechatLoginError",
      code: WechatLoginErrorCode.INVALID_CODE,
      status: 401,
      message: "微信登录凭证已失效，请重新登录",
    });

    // Assert：登录失败时不应保存 token
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockSetRefreshToken).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 场景 3：WECHAT_API_ERROR - 微信 API 调用失败（502）
  // ----------------------------------------------------------------
  it("WECHAT_API_ERROR: 后端返回 502 + WECHAT_API_ERROR 时抛出 WechatLoginError(WECHAT_API_ERROR)", async () => {
    // Arrange
    const apiError = {
      status: 502,
      message: "微信服务暂时不可用，请稍后重试",
      details: {
        code: "WECHAT_API_ERROR",
        message: "微信服务暂时不可用，请稍后重试",
      },
    };
    mockRequest.mockRejectedValue(apiError);

    // Act
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("valid-wx-code-but-wechat-down");

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: "WechatLoginError",
      code: WechatLoginErrorCode.WECHAT_API_ERROR,
      status: 502,
    });
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 场景 4：USER_DISABLED - 用户被禁用（403）
  // ----------------------------------------------------------------
  it("USER_DISABLED: 后端返回 403 + USER_DISABLED 时抛出 WechatLoginError(USER_DISABLED)", async () => {
    // Arrange
    const apiError = {
      status: 403,
      message: "账号已被禁用，请联系管理员",
      details: {
        code: "USER_DISABLED",
        message: "账号已被禁用，请联系管理员",
      },
    };
    mockRequest.mockRejectedValue(apiError);

    // Act
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("valid-wx-code-but-user-disabled");

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: "WechatLoginError",
      code: WechatLoginErrorCode.USER_DISABLED,
      status: 403,
    });
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 场景 5：CLIENT_ERROR - wx.login 用户拒绝授权
  // ----------------------------------------------------------------
  it("CLIENT_ERROR: wx.login 用户拒绝授权时抛出 WechatLoginError(CLIENT_ERROR)", async () => {
    // Arrange：request 不应被调用（wx.login 阶段已失败）
    mockRequest.mockResolvedValue({});

    // Act：发起登录并触发 wx.login fail 回调（"login:fail user deny"）
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginFail("login:fail user deny");

    // Assert：应抛出 WechatLoginError(CLIENT_ERROR)，且消息友好提示用户取消
    await expect(promise).rejects.toMatchObject({
      name: "WechatLoginError",
      code: WechatLoginErrorCode.CLIENT_ERROR,
    });

    // 由于 wx.login 失败，request 不应被调用
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockSetToken).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 场景 6：CLIENT_ERROR - wx.login 返回空 code
  // ----------------------------------------------------------------
  it("CLIENT_ERROR: wx.login 返回空 code 时抛出 WechatLoginError(CLIENT_ERROR)", async () => {
    // Arrange
    mockRequest.mockResolvedValue({});

    // Act：触发 success 但 res.code 为空字符串
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("");

    // Assert
    await expect(promise).rejects.toMatchObject({
      name: "WechatLoginError",
      code: WechatLoginErrorCode.CLIENT_ERROR,
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------------
  // 场景 7：错误类型断言 - WechatLoginError 是 Error 子类
  // ----------------------------------------------------------------
  it("WechatLoginError 应为 Error 子类，便于调用方用 instanceof 判断", async () => {
    // Arrange
    mockRequest.mockRejectedValue({
      status: 401,
      message: "失效",
      details: { code: "INVALID_CODE", message: "失效" },
    });

    // Act
    const promise = loginWithWechat();
    await flushMicrotasks();
    triggerLoginSuccess("any-code");

    // Assert：捕获异常并断言类型
    let caught: unknown = null;
    try {
      await promise;
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WechatLoginError);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as WechatLoginError).code).toBe(
      WechatLoginErrorCode.INVALID_CODE
    );
  });
});
