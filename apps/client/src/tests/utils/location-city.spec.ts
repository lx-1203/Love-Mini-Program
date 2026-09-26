/**
 * LOCATION-001 的同源判据：IP 推断出来的城市离本次坐标超过 100km 时不可信。
 *
 * 这一半原先在台账里记的就是"未落"（§91：距离守卫在 location.vue 与 utils/location.ts
 * 里 grep 无命中），所以本 spec 是这条判据的载体，不是装饰：
 * 它同时钉住三个容易退化的点——
 *   1) 距离算错（单位、球面公式）；
 *   2) "后端没给中心坐标"被当成"距离 0"从而放行；
 *   3) 城市来自 GPS 时被误标不可信（那会连带改坏 home/nearby 的既有行为）。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CITY_COORD_MAX_KM, distanceKm, fetchCurrentLocation } from "../../utils/location";

const requestMock = vi.fn();
vi.mock("../../services/http", () => ({
  request: (...args: unknown[]) => requestMock(...args),
  getToken: () => "",
}));

const NANJING = { latitude: 32.041544, longitude: 118.767413 };
const HANGZHOU = { latitude: 30.27415, longitude: 120.15507 };

function stubGetLocation(res: { latitude: number; longitude: number } | null) {
  (globalThis as { uni: Record<string, unknown> }).uni = {
    ...((globalThis as { uni?: Record<string, unknown> }).uni || {}),
    getLocation: (opts: { success?: (r: unknown) => void; fail?: (e: unknown) => void }) => {
      if (res && opts.success) opts.success(res);
      else if (opts.fail) opts.fail(new Error("deny"));
    },
  };
}

describe("distanceKm", () => {
  it("南京中心到杭州中心是跨省距离，不是几百米", () => {
    const km = distanceKm(NANJING.latitude, NANJING.longitude, HANGZHOU.latitude, HANGZHOU.longitude);
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(350);
  });
  it("同点距离为 0", () => {
    expect(distanceKm(NANJING.latitude, NANJING.longitude, NANJING.latitude, NANJING.longitude)).toBeCloseTo(0, 6);
  });
});

describe("fetchCurrentLocation 的城市可信度", () => {
  beforeEach(() => requestMock.mockReset());
  afterEach(() => vi.unstubAllGlobals())

  it("IP 城市与坐标差出一个省 ⇒ cityTrusted=false 并带出实测距离", async () => {
    stubGetLocation(NANJING);
    requestMock.mockResolvedValue({ city: "杭州", ...HANGZHOU });
    const loc = await fetchCurrentLocation();
    expect(loc).not.toBeNull();
    expect(loc!.citySource).toBe("ip");
    expect(loc!.city).toBe("杭州");
    expect(loc!.cityDistanceKm).toBeGreaterThan(CITY_COORD_MAX_KM);
    expect(loc!.cityTrusted).toBe(false);
  });

  it("IP 城市就在坐标所在的城市 ⇒ 可信（标注仍保留，不改口径）", async () => {
    stubGetLocation(NANJING);
    requestMock.mockResolvedValue({ city: "南京", ...NANJING });
    const loc = await fetchCurrentLocation();
    expect(loc!.citySource).toBe("ip");
    expect(loc!.cityTrusted).toBe(true);
    expect(loc!.cityDistanceKm).toBeLessThanOrEqual(CITY_COORD_MAX_KM);
  });

  it("后端没有该城市中心表 ⇒ 量不出来就是不成立，不许默认可信", async () => {
    stubGetLocation(NANJING);
    requestMock.mockResolvedValue({ city: "拉萨" });
    const loc = await fetchCurrentLocation();
    expect(loc!.citySource).toBe("ip");
    expect(loc!.cityDistanceKm).toBeUndefined();
    expect(loc!.cityTrusted).toBe(false);
  });

  it("ip-city 拿不到城市时不掺和可信度判断（城市为空串，来源仍是 gps）", async () => {
    stubGetLocation(NANJING);
    /* 走"没有城市"而不是"请求抛错"：两条路在 fetchCurrentLocation 里汇到同一个 city=""，
       而 vitest 会把 mock 抛出的异常按注册点记账、报成用例失败，误导成产品缺陷。 */
    requestMock.mockResolvedValue(null);
    const loc = await fetchCurrentLocation();
    expect(loc!.city).toBe("");
    expect(loc!.citySource).toBe("gps");
    expect(loc!.cityTrusted).toBe(true);
  });
});
