/**
 * 地理位置工具
 * 使用 uni.getLocation 获取真实定位，并尝试解析城市名。
 * 定位失败时 fallback 到默认值。
 * LBS Phase 2：新增坐标上报功能。
 */

import { request, getToken } from "../services/http";
import { TENCENT_MAP_KEY, isDev } from "../config/env";

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
    // 尝试逆地理编码获取城市名（腾讯地图 key 未配置时内部直接短路返回空串）
    let city = await reverseGeocode(latitude, longitude);
    if (!city) {
      // MP-R1-PAGES-NEARBY-INDEX-005：腾讯地图 key 未配置/解析失败时，
      // 回退后端公开端点 /location/ip-city（SecurityConfig permitAll）解析城市，
      // 避免「城市」维度因 key 缺失整链失真（currentCity 永不设置、
      // 城市过滤/副标题恒走兜底文案）。
      city = await fetchCityFromBackend().catch(() => "");
    }
    return { latitude, longitude, city };
  } catch (_err) {
    // 定位失败（用户拒绝授权 / 系统关闭定位等）
    return null;
  }
}

/** 后端 /location/ip-city 响应体（ApiResponse<LocationCityView> 的 data 字段）。 */
interface LocationCityData {
  city?: string;
}

/**
 * 经后端公开端点解析请求方 IP 所属城市（MP-R1-PAGES-NEARBY-INDEX-005）。
 * 失败返回空串，由调用方继续走兜底文案。
 */
async function fetchCityFromBackend(): Promise<string> {
  const data = (await request({
    url: "/location/ip-city",
    method: "GET",
  })) as Partial<LocationCityData> | null;
  const city = data?.city;
  return typeof city === "string" ? city : "";
}

/** 腾讯地图逆地理编码响应体（仅声明本文件消费的字段，apis.map.qq.com/ws/geocoder/v1）。 */
interface GeocoderResponse {
  result?: {
    address_component?: {
      city?: string;
      district?: string;
    };
  };
}

/**
 * 逆地理编码：将经纬度解析为城市/区域名。
 * 优先使用微信内置逆解析（wx.request + 腾讯地图 API），
 * 失败时返回空串。
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // 腾讯地图逆地理编码（免费额度，需在微信后台配置请求域名）
  // MP-R1-PAGES-HOME-INDEX-004：key 改由构建期环境变量 VITE_TENCENT_MAP_KEY 注入
  // （config/env.ts 的 TENCENT_MAP_KEY）；未配置时直接短路返回空串，
  // 不再发出注定失败的请求（占位符 YOUR_KEY 时代城市解析恒败且每次定位白打一次请求）。
  if (!TENCENT_MAP_KEY) {
    if (isDev) {
      console.warn("[location] VITE_TENCENT_MAP_KEY 未配置，跳过腾讯地图逆地理编码（城市改经后端 /location/ip-city 解析）");
    }
    return "";
  }
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${TENCENT_MAP_KEY}`,
      success: (res: UniApp.RequestSuccessCallbackResult) => {
        // data 为 string | AnyObject | ArrayBuffer，先收敛到对象再按契约读取
        const payload: unknown = res.data;
        if (typeof payload !== "object" || payload === null) {
          resolve("");
          return;
        }
        const component = (payload as GeocoderResponse).result?.address_component;
        resolve(component?.city || component?.district || "");
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
 * MP-R2-PAGES-HOME-INDEX-001 / MP-R2-PAGES-NEARBY-INDEX-001：/location/report 为
 * 受保护端点（SecurityConfig 仅放行 /location/ip-city），未登录（real）时匿名请求
 * 401 → http 层 handle401 → redirectToLogin 强踢登录页，击穿首页/附近页的
 * 「未登录预览」产品形态。此处统一加登录门：real 无 token 直接短路。
 * MP-R1VIS-PAGES-NEARBY-INDEX-001 / MP-R1-N02-01：登录门收敛为「无 token 一律短路」
 * （不再分 mock/real）——http 层恒以真实 uni.request 打到 apiBaseUrl、不存在 mock
 * 传输层，mock 构建放行时 POST /location/report 会命中真实后端 401 → 强踢登录页
 * （N02 实测复现：终栈=login + 「登录已过期」toast）。
 *
 * @param latitude  纬度（gcj02）
 * @param longitude 经度（gcj02）
 * @param force     强制上报（跳过节流，用于进入 nearby 页时）
 */
export async function reportLocation(latitude: number, longitude: number, force = false): Promise<void> {
  if (getToken().length === 0) return;
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
