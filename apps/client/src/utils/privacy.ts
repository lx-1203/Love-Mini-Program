/**
 * Task 0.2.3 / 0.2.4：微信隐私协议授权工具函数。
 *
 * <p>背景：自 2023-09-15 起微信小程序要求所有调用敏感接口（chooseImage / chooseMedia /
 * getLocation / getUserProfile / chooseAddress / chooseLocation / startRecord 等）
 * 的应用必须接入隐私协议。在 manifest.json 配置 {@code __usePrivacyCheck__: true} 后，
 * 微信会在用户首次调用隐私接口前弹出协议确认框，开发者需通过以下方式保障流程：</p>
 *
 * <ul>
 *   <li>App.vue onLaunch 注册 {@code wx.onNeedPrivacyAuthorization} 回调，弹出协议确认 UI</li>
 *   <li>调用隐私接口前调用 {@link requirePrivacyAuthorize} 主动校验授权状态</li>
 *   <li>查询当前授权状态使用 {@link checkPrivacySetting}</li>
 * </ul>
 *
 * <p>本工具仅封装 mp-weixin 平台 API，H5/APP 端 {@code wx} 对象可能不存在，
 * 通过运行时判空与条件编译保证双端兼容。</p>
 *
 * <p>工程约束（per project_memory）：</p>
 * <ul>
 *   <li>不使用 {@code import.meta.env.DEV}（mp-weixin 不支持）</li>
 *   <li>不使用 {@code catch {}} 空绑定（mp-weixin 不兼容），统一 {@code catch (e) { ... }}</li>
 *   <li>不使用 {@code as any}，通过 {@code unknown} 收敛 + 类型守卫替代</li>
 * </ul>
 */

/**
 * 隐私授权检查结果。
 *
 * <p>对应 {@code wx.getPrivacySetting} 的返回值，简化为以下状态：</p>
 * <ul>
 *   <li>{@code authorized} - 用户已同意隐私协议</li>
 *   <li>{@code unauthorized} - 用户未同意隐私协议（needAuthorization=true）</li>
 *   <li>{@code unsupported} - 当前环境不支持隐私 API（H5/APP 或老版本微信）</li>
 * </ul>
 */
export type PrivacyAuthorizeStatus =
  | "authorized"
  | "unauthorized"
  | "unsupported";

/**
 * 隐私授权检查详细结果。
 */
export interface PrivacySettingResult {
  /** 授权状态 */
  status: PrivacyAuthorizeStatus;
  /** 是否需要授权（needAuthorization 原值，unsupported 时为 false） */
  needAuthorization: boolean;
  /** 隐私协议名称（如《用户隐私保护指引》），unsupported 时为空字符串 */
  privacyContractName: string;
}

/**
 * wx.getPrivacySetting 返回值的结构化类型（仅声明本工具使用的字段）。
 */
interface WxPrivacySettingResult {
  needAuthorization: boolean;
  privacyContractName?: string;
}

/**
 * wx.requirePrivacyAuthorize 选项结构。
 */
interface WxRequirePrivacyAuthorizeOpts {
  success?: () => void;
  fail?: (err: { errMsg?: string }) => void;
  complete?: () => void;
}

/**
 * wx.getPrivacySetting 选项结构。
 */
interface WxGetPrivacySettingOpts {
  success?: (res: WxPrivacySettingResult) => void;
  fail?: (err: { errMsg?: string }) => void;
  complete?: () => void;
}

/**
 * 安全获取 wx 全局对象。
 *
 * <p>mp-weixin 端 {@code wx} 为全局对象；H5/APP 端可能不存在。
 * 通过 {@code globalThis} 收敛 + 运行时判空避免运行时异常。</p>
 *
 * @returns wx 对象（不存在时返回 null）
 */
function getWxApi(): Record<string, unknown> | null {
  try {
    const wxApi = (
      globalThis as unknown as { wx?: Record<string, unknown> }
    ).wx;
    if (wxApi && typeof wxApi === "object") {
      return wxApi;
    }
  } catch (_e) {
    // globalThis 访问异常：忽略，返回 null
  }
  return null;
}

/**
 * 检查当前环境是否支持微信隐私 API。
 *
 * <p>同时校验：wx 对象存在 + 关键 API 函数存在。
 * 任意一项不满足均视为不支持（H5/APP/老版本微信）。</p>
 *
 * @returns 是否支持隐私 API
 */
export function isPrivacyApiSupported(): boolean {
  const wxApi = getWxApi();
  if (!wxApi) return false;
  return (
    typeof wxApi.getPrivacySetting === "function" ||
    typeof wxApi.requirePrivacyAuthorize === "function"
  );
}

/**
 * 查询当前隐私协议授权状态（同步 Promise 化封装）。
 *
 * <p>对应 {@code wx.getPrivacySetting}：
 * <ul>
 *   <li>needAuthorization=false → status='authorized'（用户已同意）</li>
 *   <li>needAuthorization=true → status='unauthorized'（用户未同意）</li>
 *   <li>API 不支持 → status='unsupported'</li>
 * </ul>
 * </p>
 *
 * <p>使用场景：
 * <ul>
 *   <li>页面 onShow 时检查授权状态，提示用户</li>
 *   <li>调用隐私接口前的预检查（决定是否需要主动调用 requirePrivacyAuthorize）</li>
 * </ul>
 * </p>
 *
 * @returns 授权状态详情 Promise
 */
export function checkPrivacySetting(): Promise<PrivacySettingResult> {
  return new Promise((resolve) => {
    const wxApi = getWxApi();
    if (!wxApi || typeof wxApi.getPrivacySetting !== "function") {
      // 不支持隐私 API：返回 unsupported，不阻塞调用方流程
      resolve({
        status: "unsupported",
        needAuthorization: false,
        privacyContractName: "",
      });
      return;
    }

    const getSetting = wxApi.getPrivacySetting as (
      opts: WxGetPrivacySettingOpts
    ) => void;
    try {
      getSetting({
        success: (res: WxPrivacySettingResult) => {
          const needAuth = !!res?.needAuthorization;
          resolve({
            status: needAuth ? "unauthorized" : "authorized",
            needAuthorization: needAuth,
            privacyContractName:
              typeof res?.privacyContractName === "string"
                ? res.privacyContractName
                : "",
          });
        },
        fail: (err: { errMsg?: string }) => {
          // getPrivacySetting 调用失败：保守视为未授权，避免静默同意
          console.warn("[privacy] getPrivacySetting failed:", err?.errMsg);
          resolve({
            status: "unauthorized",
            needAuthorization: true,
            privacyContractName: "",
          });
        },
      });
    } catch (e) {
      // 同步异常：视为不支持，避免阻塞主流程
      console.warn("[privacy] getPrivacySetting exception:", e);
      resolve({
        status: "unsupported",
        needAuthorization: false,
        privacyContractName: "",
      });
    }
  });
}

/**
 * 主动触发隐私协议授权（Promise 化封装）。
 *
 * <p>对应 {@code wx.requirePrivacyAuthorize}：
 * <ul>
 *   <li>用户已同意 → success 回调 → Promise resolve</li>
 *   <li>用户未同意或拒绝 → fail 回调 → Promise reject({ reason: 'unauthorized' | 'unsupported' | 'unknown' })</li>
 *   <li>API 不支持 → 直接 resolve（H5/APP 环境不阻塞业务流程）</li>
 * </ul>
 * </p>
 *
 * <p>使用场景：调用 chooseImage / chooseMedia / getLocation / getUserProfile 等
 * 隐私接口前主动校验，避免隐私接口直接 fail。</p>
 *
 * <p>典型用法：
 * <pre>{@code
 * async function chooseImage() {
 *   try {
 *     await requirePrivacyAuthorize();
 *     uni.chooseImage({ ... });
 *   } catch (e) {
 *     // 提示文案仅为示意（infra R2-00130）：生产环境应经 i18n t() 渲染，
 *     // 勿在业务代码中直接复制此硬编码中文文案。
 *     uni.showToast({ title: "需同意隐私协议后才能选择图片", icon: "none" });
 *   }
 * }
 * }</pre>
 * </p>
 *
 * @returns 已授权时 resolve；未授权或不支持时 reject
 */
export function requirePrivacyAuthorize(): Promise<void> {
  return new Promise((resolve, reject) => {
    const wxApi = getWxApi();
    if (!wxApi || typeof wxApi.requirePrivacyAuthorize !== "function") {
      // 不支持隐私 API（H5/APP）：直接 resolve，不阻塞业务流程
      // 注：H5 端 chooseImage 等接口不经过微信隐私协议，无需授权
      resolve();
      return;
    }

    const requireAuth = wxApi.requirePrivacyAuthorize as (
      opts: WxRequirePrivacyAuthorizeOpts
    ) => void;
    try {
      requireAuth({
        success: () => {
          // 用户已同意隐私协议
          resolve();
        },
        fail: (err: { errMsg?: string }) => {
          // 用户拒绝或调用失败：reject 并附带原因
          // errMsg 常见值："requirePrivacyAuthorize:fail" / "requirePrivacyAuthorize:fail user deny"
          const errMsg = typeof err?.errMsg === "string" ? err.errMsg : "";
          const reason = errMsg.includes("deny")
            ? "unauthorized"
            : errMsg.includes("unsupported")
              ? "unsupported"
              : "unknown";
          reject({ reason, errMsg });
        },
      });
    } catch (e) {
      // 同步异常：reject 避免静默同意
      reject({ reason: "unknown", error: e });
    }
  });
}

/**
 * 打开微信托管的隐私协议页面。
 *
 * <p>对应 {@code wx.openPrivacyContract}，用于在设置页等场景让用户查阅完整协议。</p>
 *
 * @returns Promise<void>，成功 resolve，失败 reject
 */
export function openPrivacyContract(): Promise<void> {
  return new Promise((resolve, reject) => {
    const wxApi = getWxApi();
    if (!wxApi || typeof wxApi.openPrivacyContract !== "function") {
      // 不支持：视为成功（H5/APP 无隐私协议概念）
      resolve();
      return;
    }

    const openFn = wxApi.openPrivacyContract as (
      opts: {
        success?: () => void;
        fail?: (err: { errMsg?: string }) => void;
      }
    ) => void;
    try {
      openFn({
        success: () => resolve(),
        fail: (err: { errMsg?: string }) => {
          reject({
            reason: "open_failed",
            errMsg: typeof err?.errMsg === "string" ? err.errMsg : "",
          });
        },
      });
    } catch (e) {
      reject({ reason: "open_exception", error: e });
    }
  });
}

/**
 * 调用隐私接口前的便捷守卫：先检查授权，未授权时弹出引导。
 *
 * <p>封装「checkPrivacySetting → requirePrivacyAuthorize」两步流程：
 * <ul>
 *   <li>已授权 → 直接 resolve，调用方继续执行隐私接口</li>
 *   <li>未授权 → 自动调用 requirePrivacyAuthorize 触发微信协议弹窗</li>
 *   <li>不支持 → 直接 resolve（H5/APP 环境）</li>
 * </ul>
 * </p>
 *
 * @returns 已授权或支持时 resolve；用户拒绝授权时 reject
 */
export async function ensurePrivacyAuthorized(): Promise<void> {
  const setting = await checkPrivacySetting();

  if (setting.status === "unsupported") {
    // H5/APP 环境：不阻塞
    return;
  }

  if (setting.status === "authorized") {
    // 已授权：直接通过
    return;
  }

  // 未授权：触发微信协议弹窗（实际弹窗 UI 由 App.vue 的 onNeedPrivacyAuthorization 回调处理）
  await requirePrivacyAuthorize();
}
