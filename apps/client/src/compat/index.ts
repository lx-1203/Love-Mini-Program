/**
 * 微信JSAPI兼容层
 * 
 * 修复控制台警告：
 * "wx.getSystemInfoSync is deprecated. Please use wx.getSystemSetting/
 *  wx.getAppAuthorizeSetting/wx.getDeviceInfo/wx.getWindowInfo/wx.getAppBaseInfo instead."
 * 
 * 原理：在uni-app框架调用 wx.getSystemInfoSync 之前， 
 * 用新API替换其实现，避免触发运行时弃用警告。
 * 
 * 注意：此文件必须在任何其他代码之前加载。
 */

// #ifdef MP-WEIXIN
// 仅在微信小程序平台生效

/** 微信小程序全局对象类型声明（条件编译下 TS 无法自动识别 wx） */
declare const wx: Record<string, any>;
export function patchDeprecatedApi(): void {
  if (typeof wx === "undefined") return;

  const wxAny = wx as Record<string, unknown>;

  // 保存原始引用，用于真正的 fallback
  const origGetSystemInfoSync = wxAny.getSystemInfoSync as (() => Record<string, unknown>) | undefined;

  // 构造一个使用新 API 的兼容实现
  function patchedGetSystemInfoSync(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    try {
      // 1. 基础信息
      const appBaseInfo = typeof wx.getAppBaseInfo === "function"
        ? wx.getAppBaseInfo()
        : {};
      Object.assign(result, appBaseInfo);

      // 2. 设备信息（覆盖同名属性）
      const deviceInfo = typeof wx.getDeviceInfo === "function"
        ? wx.getDeviceInfo()
        : {};
      Object.assign(result, deviceInfo);

      // 3. 窗口信息
      const windowInfo = typeof wx.getWindowInfo === "function"
        ? wx.getWindowInfo()
        : {};
      Object.assign(result, windowInfo);

      // 4. 系统设置
      const systemSetting = typeof wx.getSystemSetting === "function"
        ? wx.getSystemSetting()
        : {};
      Object.assign(result, systemSetting);

      // 5. 授权设置
      const authSetting = typeof wx.getAppAuthorizeSetting === "function"
        ? wx.getAppAuthorizeSetting()
        : {};
      Object.assign(result, authSetting);
    } catch (_e) {
      // 如果新 API 调用失败，回退到原始 API
      if (origGetSystemInfoSync) {
        try {
          return origGetSystemInfoSync();
        } catch (_ex) {
          // 忽略
        }
      }
    }

    return result;
  }

  // 替换 getSystemInfoSync 实现
  Object.defineProperty(wxAny, "getSystemInfoSync", {
    configurable: true,
    writable: false,
    value: patchedGetSystemInfoSync,
  });

  // 同时替换 getSystemInfo（异步版本）
  const origGetSystemInfo = wxAny.getSystemInfo as ((opts?: Record<string, unknown>) => void) | undefined;
  function patchedGetSystemInfo(opts?: Record<string, unknown>): void {
    const successCallback = opts && typeof opts === "object" ? (opts as Record<string, unknown>).success : undefined;

    try {
      const result = patchedGetSystemInfoSync();
      if (typeof successCallback === "function") {
        (successCallback as (res: Record<string, unknown>) => void)({ ...result, errMsg: "getSystemInfo:ok" });
      }
      return;
    } catch (_e) {
      // 回退
      if (origGetSystemInfo) {
        origGetSystemInfo(opts);
      }
    }
  }

  Object.defineProperty(wxAny, "getSystemInfo", {
    configurable: true,
    writable: false,
    value: patchedGetSystemInfo,
  });
}
// #endif
