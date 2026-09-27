/**
 * LOCATION-001 的同源判据：IP 推断出来的城市离本次坐标超过 100km 时不可信。
 *
 * 这一半原先在台账里记的就是"未落"（§91：距离守卫在 location.vue 与 utils/location.ts
 * 里 grep 无命中），所以本 spec 是这条判据的载体，不是装饰：
 * 它同时钉住三个容易退化的点——
 *   1) 距离算错（单位、球面公式）；
 *   2) "后端没给中心坐标"被当成"距离 0"从而放行；
 *   3) 城市来自 GPS 时被误标不可信（那会连带改坏 home/nearby 的既有行为）。
 * 文件末尾另起一节钉 location.vue 的同源渲染——判据的前半（逆地理失败 ⇒ 只剩坐标 +
 * 「地址解析不可用」；ip 城市 ⇒ 显式标注；选点回来的地址不再背 ip 的出处）只在那儿可测。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";
import { CITY_COORD_MAX_KM, distanceKm, fetchCurrentLocation } from "../../utils/location";

const requestMock = vi.fn();
vi.mock("../../services/http", () => ({
  request: (...args: unknown[]) => requestMock(...args),
  getToken: () => "",
}));

/* location.vue 在 onLoad 里自动定位；测试改为用例显式点「重新定位」，把时序握在自己手里。 */
vi.mock("@dcloudio/uni-app", () => ({ onLoad: vi.fn() }));

import LocationPage from "../../subpackages/profile-extra/profile/location.vue";

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

function stubChooseLocation(res: { latitude: number; longitude: number; address: string } | null) {
  (globalThis as { uni: Record<string, unknown> }).uni = {
    ...((globalThis as { uni?: Record<string, unknown> }).uni || {}),
    chooseLocation: (opts: { success?: (r: unknown) => void; fail?: (e: unknown) => void }) => {
      if (res && opts.success) opts.success(res);
      else if (opts.fail) opts.fail(new Error("cancel"));
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

/**
 * 判据前半的页面侧：location.vue 是全站唯一把「城市」和「坐标」并排展示的地方。
 * 第三例是回归钉子——地图选点回来的地址本就是这对坐标逆解析出来的（同源），
 * 上一次定位留下的 ip 出处/超距丢弃标记若不清掉，选好的位置会被继续标成
 * 「服务器所在城市」甚至整条吞成「地址解析不可用」。
 */
describe("location.vue 的城市与坐标同源渲染", () => {
  const PICKED_ADDRESS = "南京市鼓楼区中山路 1 号";
  /** 南京近郊（约 12km 内）：IP 城市可信的档位 */
  const QIXIA = { latitude: 32.11, longitude: 118.83 };

  beforeEach(() => {
    setActivePinia(createPinia());
    requestMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  function mountPage() {
    return mount(LocationPage, {
      global: {
        plugins: [i18n],
        stubs: {
          view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
          text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
          image: { template: '<img class="mock-image" />', name: "uni-image" },
        },
      },
    });
  }

  it("IP 城市超出 100km ⇒ 城市不渲染，只剩坐标 + 「地址解析不可用」", async () => {
    stubGetLocation(NANJING);
    stubChooseLocation({ ...NANJING, address: PICKED_ADDRESS });
    requestMock.mockResolvedValue({ city: "杭州", ...HANGZHOU });

    const wrapper = mountPage();
    await wrapper.find(".location-btn--primary").trigger("tap");
    await flushPromises();

    expect(wrapper.find(".location-card__value").text()).toBe("地址解析不可用");
    expect(wrapper.find(".location-card__coords").text()).toContain("纬度 32.0415");
    // 兜底文案会把一个硬编码假城市写进与坐标同源的行里，这里必须一次不出现
    expect(wrapper.html()).not.toContain("北京大学 · 附近");
  });

  it("IP 城市就在坐标附近 ⇒ 渲染并显式标注「服务器所在城市」", async () => {
    stubGetLocation(NANJING);
    stubChooseLocation({ ...NANJING, address: PICKED_ADDRESS });
    requestMock.mockResolvedValue({ city: "南京", ...QIXIA });

    const wrapper = mountPage();
    await wrapper.find(".location-btn--primary").trigger("tap");
    await flushPromises();

    expect(wrapper.find(".location-card__value").text()).toBe("南京 · 服务器所在城市");
  });

  it("地图选点 ⇒ 选点地址按同源口径顶掉 ip 出处标记", async () => {
    stubGetLocation(NANJING);
    stubChooseLocation({ ...NANJING, address: PICKED_ADDRESS });
    requestMock.mockResolvedValue({ city: "杭州", ...HANGZHOU });

    const wrapper = mountPage();
    await wrapper.find(".location-btn--primary").trigger("tap");
    await flushPromises();
    await wrapper.find(".location-map__pick").trigger("tap");
    await flushPromises();

    expect(wrapper.find(".location-card__value").text().startsWith(PICKED_ADDRESS)).toBe(true);
    expect(wrapper.find(".location-card__value").text()).not.toContain("服务器所在城市");
    expect(wrapper.find(".location-card__address-value").text()).toBe(PICKED_ADDRESS);
  });
});
