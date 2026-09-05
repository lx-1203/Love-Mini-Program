/**
 * 地理位置工具
 * 使用 uni.getLocation 获取真实定位，并尝试解析城市名。
 * 定位失败时 fallback 到默认值。
 * LBS Phase 2：新增坐标上报功能。
 */

import { request } from "../services/http";

/** 默认位置文案（校园 + 距离） */
export const DEFAULT_LOCATION_TEXT = "北京大学 · 附近";

export interface LocationResult {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 城市/区域名（解析失败时为空串） */
  city: string;
}

/** 上报节流：上次上报时间戳（ms），5 分钟内不重复上报 */
let lastReportAt = 0;
const REPORT_THROTTLE_MS = 5 * 60 * 1000;

/**
 * 尝试获取当前位置并解析城市名。
 * 失败时返回 null（调用方自行 fallback）。
 */
export async function fetchCurrentLocation(): Promise<LocationResult | null> {
  try {
    const res = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
      uni.getLocation({
        type: "gcj02",
        success: resolve,
        fail: reject,
      });
    });

    const { latitude, longitude } = res;
    // 尝试逆地理编码获取城市名
    const city = await reverseGeocode(latitude, longitude);
    return { latitude, longitude, city };
  } catch (_err) {
    // 定位失败（用户拒绝授权 / 系统关闭定位等）
    return null;
  }
}

/**
 * 逆地理编码：将经纬度解析为城市/区域名。
 * 优先使用微信内置逆解析（wx.request + 腾讯地图 API），
 * 失败时返回空串。
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 腾讯地图逆地理编码（免费额度，需在微信后台配置请求域名）
  // 若未配置域名或 key 无效，静默降级返回空串
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=YOUR_KEY`,
      success: (res: any) => {
        const result = res?.data?.result;
        const city = result?.address_component?.city || result?.address_component?.district || "";
        resolve(city);
      },
      fail: () => resolve(""),
    });
    // #endif
    // #ifndef MP-WEIXIN
    // 非微信环境（H5 / App）直接返回空串，由调用方 fallback
    resolve("");
    // #endif
  });
}

/**
 * 构建位置展示文案。
 * 优先使用城市名，否则使用校园名，最终兜底默认值。
 * LBS Phase 2：不再硬编码距离，由后端真实计算。
 */
export function buildLocationText(city: string, campusName?: string | null): string {
  if (city) return `${city} · 附近`;
  if (campusName) return `${campusName} · 附近`;
  return DEFAULT_LOCATION_TEXT;
}

/**
 * LBS Phase 2：上报坐标到后端（节流 5 分钟）。
 * 成功静默，失败忽略（不影响主流程）。
 *
 * @param latitude  纬度（gcj02）
 * @param longitude 经度（gcj02）
 * @param force     强制上报（跳过节流，用于进入 nearby 页时）
 */
export async function reportLocation(latitude: number, longitude: number, force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastReportAt < REPORT_THROTTLE_MS) return;
  lastReportAt = now;
  try {
    await request({
      url: "/location/report",
      method: "POST",
      data: { latitude, longitude },
    });
  } catch (_e) {
    // 上报失败静默忽略
  }
}
