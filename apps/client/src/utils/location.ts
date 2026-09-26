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

/**
 * IP 推断城市与本次真实坐标的最大可信距离（km）。
 * 超过它，"城市"与"坐标"就不是同一个地方了——同源判据（LOCATION-001）要求丢弃城市。
 */
export const CITY_COORD_MAX_KM = 100;

/** 两点间大圆距离（km，haversine）。城市级判据用地球平均半径足够。 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface LocationResult {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 城市/区域名（解析失败时为空串） */
  city: string;
  /** 城市来源：gps=由本次经纬度逆地理得到；ip=逆地理没成、改由请求方 IP 归属地推断。
   *  可选，旧消费方不读即保持原行为（LOCATION-001 的同源判据只在需要诚实标注的页面生效）。 */
  citySource?: "gps" | "ip";
  /** citySource=ip 时，该 IP 城市中心与本次坐标的距离（km）；后端没有该城市中心表时为 undefined。 */
  cityDistanceKm?: number;
  /** "城市"这个值是否与本次坐标同源到可以拿去做同城语义。
   *  false 的两种情形：距离超过 CITY_COORD_MAX_KM；或 IP 城市但距离量不出来（后端无中心表）。
   *  citySource=gps 时恒为 true。消费方在 false 时不得把 city 当用户所在城市用。 */
  cityTrusted: boolean;
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
    let citySource: "gps" | "ip" = "gps";
    let cityDistanceKm: number | undefined;
    let cityTrusted = true;
    if (!city) {
      // MP-R1-PAGES-NEARBY-INDEX-005：腾讯地图 key 未配置/解析失败时，
      // 回退后端公开端点 /location/ip-city（SecurityConfig permitAll）解析城市，
      // 避免「城市」维度因 key 缺失整链失真（currentCity 永不设置、
      // 城市过滤/副标题恒走兜底文案）。
      const ipCity = await fetchCityFromBackend().catch(() => null);
      city = ipCity?.city || "";
      // MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001：走到这里说明城市**不是**
      // 由上面那对经纬度解析出来的，而是按请求方 IP 归属地推断的——两者可以差出一个省。
      // 只打标记、不改 city 的取值：home/nearby/publish 三个消费方都不读这些新字段，
      // 行为零变化、005 的补救也不回退；只有需要"城市与坐标同源"的页面才按标记分支。
      if (city) {
        citySource = "ip";
        /* >100km 丢弃判据（本行 §91 点名的未落一半）：后端把该城市的中心坐标一起给出，
           这里量一次真实距离。量不出来（城市不在中心表里）同样算不可信——
           "同源"是需要证据的结论，缺证据时不能默认成立。 */
        cityDistanceKm =
          typeof ipCity?.latitude === "number" && typeof ipCity?.longitude === "number"
            ? distanceKm(latitude, longitude, ipCity.latitude, ipCity.longitude)
            : undefined;
        cityTrusted = cityDistanceKm !== undefined && cityDistanceKm <= CITY_COORD_MAX_KM;
      }
    }
    return { latitude, longitude, city, citySource, cityDistanceKm, cityTrusted };
  } catch (_err) {
    // 定位失败（用户拒绝授权 / 系统关闭定位等）
    return null;
  }
}

/** 后端 /location/ip-city 响应体（ApiResponse<LocationCityView> 的 data 字段）。 */
interface LocationCityData {
  city?: string;
  /** 城市中心坐标（gcj02）；后端无该城市中心表时不下发 */
  latitude?: number;
  longitude?: number;
}

/**
 * 经后端公开端点解析请求方 IP 所属城市（MP-R1-PAGES-NEARBY-INDEX-005），
 * 以及该城市的中心坐标（用来做 LOCATION-001 的 >100km 同源判据）。
 * 失败返回 null，由调用方继续走兜底文案。
 */
async function fetchCityFromBackend(): Promise<LocationCityData | null> {
  const data = (await request({
    url: "/location/ip-city",
    method: "GET",
  })) as Partial<LocationCityData> | null;
  const city = data?.city;
  return typeof city === "string" && city ? data : null;
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
  try {
    await request({
      url: "/location/report",
      method: "POST",
      data: { latitude, longitude },
    });
    lastReportAt = now;
  } catch (_e) {
    // 上报失败静默忽略
  }
}
