import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Task 0.2.5：utils/privacy 单元测试
 *
 * 验证 `utils/privacy.ts` 的核心行为：
 * 1. 已授权场景：wx.getPrivacySetting 返回 needAuthorization=false → checkPrivacySetting 返回 authorized
 * 2. 未授权场景：wx.getPrivacySetting 返回 needAuthorization=true → checkPrivacySetting 返回 unauthorized
 * 3. 拒绝授权场景：wx.requirePrivacyAuthorize fail 回调被触发 → requirePrivacyAuthorize reject
 * 4. 不支持场景：wx 全局对象不存在 / 缺少隐私 API → 返回 unsupported，不阻塞流程
 * 5. ensurePrivacyAuthorized 集成：未授权时自动触发 requirePrivacyAuthorize
 *
 * 工程约束（per project_memory）：
 * - 不使用 `import.meta.env.DEV`（mp-weixin 不支持）
 * - 不使用 `catch {}` 空绑定（mp-weixin 不兼容），统一 `catch (e) { ... }`
 * - 不使用 `as any`，通过 `unknown` 收敛 + 类型守卫替代
 */

// ------------------------------------------------------------------
// 类型声明：被 mock 的 wx 隐私 API 结构
// ------------------------------------------------------------------
type PrivacySettingResult = {
  needAuthorization: boolean;
  privacyContractName?: string;
};

type WxApiShape = {
  getPrivacySetting?: (opts: {
    success?: (res: PrivacySettingResult) => void;
    fail?: (err: { errMsg?: string }) => void;
  }) => void;
  requirePrivacyAuthorize?: (opts: {
    success?: () => void;
    fail?: (err: { errMsg?: string }) => void;
  }) => void;
  openPrivacyContract?: (opts: {
    success?: () => void;
    fail?: (err: { errMsg?: string }) => void;
  }) => void;
};

// ------------------------------------------------------------------
// wx 全局对象存根：每个用例通过 setWxApi 重新配置
// ------------------------------------------------------------------
function setWxApi(api: WxApiShape | null): void {
  if (api === null) {
    delete (globalThis as unknown as { wx?: unknown }).wx;
  } else {
    (globalThis as unknown as { wx?: unknown }).wx = api;
  }
}

// ------------------------------------------------------------------
// 在 mock 设置完成后导入被测模块（避免模块缓存导致测试间相互污染）
// ------------------------------------------------------------------
// 注：vitest 中模块导入是 hoisted 的，但 utils/privacy.ts 通过函数内
// 读取 globalThis.wx，所以测试时无需重新加载模块，每次调用都会读取最新值。
import {
  checkPrivacySetting,
  ensurePrivacyAuthorized,
  isPrivacyApiSupported,
  openPrivacyContract,
  requirePrivacyAuthorize,
} from "../../utils/privacy";

describe("utils/privacy - Task 0.2.5", () => {
  beforeEach(() => {
    // 每个用例前重置 wx 存根
    setWxApi(null);
  });

  afterEach(() => {
    // 每个用例后清理 wx 存根，避免污染后续用例
    setWxApi(null);
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------------
  // 场景 1：已授权（needAuthorization=false）
  // ----------------------------------------------------------------
  it("checkPrivacySetting: 用户已同意隐私协议时返回 authorized", async () => {
    // Arrange：构造已授权的 wx.getPrivacySetting 返回值
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({
          needAuthorization: false,
          privacyContractName: "用户隐私保护指引",
        });
      },
      requirePrivacyAuthorize: (opts) => {
        opts.success?.();
      },
    });

    // Act
    const result = await checkPrivacySetting();

    // Assert：状态为 authorized，needAuthorization=false
    expect(result.status).toBe("authorized");
    expect(result.needAuthorization).toBe(false);
    expect(result.privacyContractName).toBe("用户隐私保护指引");
  });

  // ----------------------------------------------------------------
  // 场景 2：未授权（needAuthorization=true）
  // ----------------------------------------------------------------
  it("checkPrivacySetting: 用户未同意隐私协议时返回 unauthorized", async () => {
    // Arrange：构造未授权的 wx.getPrivacySetting 返回值
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({
          needAuthorization: true,
          privacyContractName: "用户隐私保护指引",
        });
      },
      requirePrivacyAuthorize: (opts) => {
        opts.success?.();
      },
    });

    // Act
    const result = await checkPrivacySetting();

    // Assert：状态为 unauthorized，needAuthorization=true
    expect(result.status).toBe("unauthorized");
    expect(result.needAuthorization).toBe(true);
  });

  // ----------------------------------------------------------------
  // 场景 3：拒绝授权（requirePrivacyAuthorize fail）
  // ----------------------------------------------------------------
  it("requirePrivacyAuthorize: 用户拒绝授权时 reject 并附带 reason=unauthorized", async () => {
    // Arrange：构造 requirePrivacyAuthorize.fail 回调（用户拒绝）
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({ needAuthorization: true });
      },
      requirePrivacyAuthorize: (opts) => {
        // 模拟用户拒绝：errMsg 含 "deny"
        opts.fail?.({ errMsg: "requirePrivacyAuthorize:fail user deny" });
      },
    });

    // Act + Assert：requirePrivacyAuthorize 应 reject
    await expect(requirePrivacyAuthorize()).rejects.toMatchObject({
      reason: "unauthorized",
      errMsg: expect.stringContaining("deny"),
    });
  });

  // ----------------------------------------------------------------
  // 场景 4：requirePrivacyAuthorize 成功（用户已同意）
  // ----------------------------------------------------------------
  it("requirePrivacyAuthorize: 用户已同意时 resolve", async () => {
    // Arrange
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({ needAuthorization: false });
      },
      requirePrivacyAuthorize: (opts) => {
        opts.success?.();
      },
    });

    // Act + Assert
    await expect(requirePrivacyAuthorize()).resolves.toBeUndefined();
  });

  // ----------------------------------------------------------------
  // 场景 5：不支持隐私 API（wx 全局对象不存在）
  // ----------------------------------------------------------------
  it("checkPrivacySetting: wx 不存在时返回 unsupported", async () => {
    // Arrange：不设置 wx（globalThis 无 wx）
    setWxApi(null);

    // Act
    const result = await checkPrivacySetting();

    // Assert
    expect(result.status).toBe("unsupported");
    expect(result.needAuthorization).toBe(false);
    expect(result.privacyContractName).toBe("");
  });

  it("requirePrivacyAuthorize: wx 不存在时直接 resolve（H5/APP 不阻塞）", async () => {
    // Arrange：不设置 wx
    setWxApi(null);

    // Act + Assert
    await expect(requirePrivacyAuthorize()).resolves.toBeUndefined();
  });

  it("isPrivacyApiSupported: wx 不存在时返回 false", () => {
    setWxApi(null);
    expect(isPrivacyApiSupported()).toBe(false);
  });

  it("isPrivacyApiSupported: wx 存在且包含隐私 API 时返回 true", () => {
    setWxApi({
      getPrivacySetting: () => {},
      requirePrivacyAuthorize: () => {},
    });
    expect(isPrivacyApiSupported()).toBe(true);
  });

  // ----------------------------------------------------------------
  // 场景 6：ensurePrivacyAuthorized 集成测试
  // ----------------------------------------------------------------
  it("ensurePrivacyAuthorized: 已授权时直接 resolve（不调用 requirePrivacyAuthorize）", async () => {
    // Arrange
    const requireAuthSpy = vi.fn();
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({ needAuthorization: false });
      },
      requirePrivacyAuthorize: requireAuthSpy,
    });

    // Act
    await ensurePrivacyAuthorized();

    // Assert：已授权时不应调用 requirePrivacyAuthorize
    expect(requireAuthSpy).not.toHaveBeenCalled();
  });

  it("ensurePrivacyAuthorized: 未授权时自动调用 requirePrivacyAuthorize", async () => {
    // Arrange
    const requireAuthSpy = vi.fn((opts: { success?: () => void }) => {
      opts.success?.();
    });
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.success?.({ needAuthorization: true });
      },
      requirePrivacyAuthorize: requireAuthSpy,
    });

    // Act
    await ensurePrivacyAuthorized();

    // Assert：未授权时应调用 requirePrivacyAuthorize
    expect(requireAuthSpy).toHaveBeenCalledTimes(1);
  });

  it("ensurePrivacyAuthorized: 不支持隐私 API 时直接 resolve", async () => {
    // Arrange：不设置 wx
    setWxApi(null);

    // Act + Assert
    await expect(ensurePrivacyAuthorized()).resolves.toBeUndefined();
  });

  // ----------------------------------------------------------------
  // 场景 7：openPrivacyContract 跳转
  // ----------------------------------------------------------------
  it("openPrivacyContract: 调用 wx.openPrivacyContract 成功时 resolve", async () => {
    // Arrange
    setWxApi({
      openPrivacyContract: (opts) => {
        opts.success?.();
      },
    });

    // Act + Assert
    await expect(openPrivacyContract()).resolves.toBeUndefined();
  });

  it("openPrivacyContract: 调用失败时 reject", async () => {
    // Arrange
    setWxApi({
      openPrivacyContract: (opts) => {
        opts.fail?.({ errMsg: "openPrivacyContract:fail" });
      },
    });

    // Act + Assert
    await expect(openPrivacyContract()).rejects.toMatchObject({
      reason: "open_failed",
    });
  });

  // ----------------------------------------------------------------
  // 场景 8：getPrivacySetting 调用失败时保守视为未授权
  // ----------------------------------------------------------------
  it("checkPrivacySetting: getPrivacySetting fail 时返回 unauthorized（保守策略）", async () => {
    // Arrange：构造 getPrivacySetting.fail
    setWxApi({
      getPrivacySetting: (opts) => {
        opts.fail?.({ errMsg: "getPrivacySetting:fail" });
      },
      requirePrivacyAuthorize: () => {},
    });

    // Act
    const result = await checkPrivacySetting();

    // Assert：失败时保守视为未授权，避免静默同意
    expect(result.status).toBe("unauthorized");
    expect(result.needAuthorization).toBe(true);
  });
});
