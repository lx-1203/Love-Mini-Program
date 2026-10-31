import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { i18n } from "../../i18n";

/**
 * 设置页分组收敛契约测试（2026-08-14 主页功能入口下沉）：
 * - 社交资产分组渲染（任务中心/交友币/我的圈子/恋爱咨询/我的动态/访客/浏览历史/相册/校园认证/课表）
 * - 隐私安全分组渲染
 * - 底部「关于 + 退出登录」保留
 * - 「清除缓存」真实清除（P2 修复 5，2026-10-31）：
 *   原实现硬编码 [STORAGE_KEYS.USER_CACHE]，而 USER_CACHE 全仓零写入方 ⇒
 *   点了只删一个从不存在的键，却照样 toast「已清除」。
 */

vi.mock("../../services/api", () => ({
  clientApi: {
    logout: vi.fn(),
    getSession: vi.fn(),
    getAppConfig: vi.fn(),
    getThemeSetting: vi.fn(),
    updateThemeSetting: vi.fn(),
    getDndSetting: vi.fn(),
  },
}));

vi.mock("../../utils/navigation", () => ({
  switchTabWithQuery: vi.fn(),
}));

// 保留真实实现，只把 clearAllCaches 换成可断言的 spy
vi.mock("../../utils/cache-ttl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/cache-ttl")>();
  return { ...actual, clearAllCaches: vi.fn(actual.clearAllCaches) };
});

vi.mock("../../utils/media-sign-cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/media-sign-cache")>();
  return { ...actual, clearMediaSignCache: vi.fn(actual.clearMediaSignCache) };
});

import SettingsIndex from "../../subpackages/profile-extra/settings/index.vue";
import {
  STORAGE_KEYS,
  REBUILDABLE_CACHE_KEYS,
} from "../../constants/storage-keys";
import { clearAllCaches } from "../../utils/cache-ttl";
import { clearMediaSignCache } from "../../utils/media-sign-cache";

/** 在 setup.ts 的 uni 桩上叠加本页「清除缓存」所需的可断言 API */
const uniAny = globalThis.uni as unknown as Record<string, any>;
const removeStorageSync = vi.fn();
const getStorageSync = vi.fn((key: string) => seedStorage.get(key) ?? null);
const seedStorage = new Map<string, unknown>();

uniAny.removeStorageSync = removeStorageSync;
uniAny.getStorageSync = getStorageSync;
uniAny.setStorageSync = (key: string, value: unknown) => {
  seedStorage.set(key, value);
};
uniAny.showModal = (opts: { success?: (res: { confirm: boolean; cancel: boolean }) => void }) => {
  opts.success?.({ confirm: true, cancel: false });
};
uniAny.getStorageInfo = vi.fn((opts: { success?: (info: { currentSize: number; keys: string[]; limitSize: number }) => void }) => {
  opts.success?.({ currentSize: 24, keys: Array.from(seedStorage.keys()), limitSize: 1024 });
});

function mountSettings() {
  return mount(SettingsIndex, {
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        switch: { template: '<view class="mock-switch" />', name: "uni-switch" },
      },
    },
  });
}

describe("设置页分组收敛（2026-08-14）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("渲染社交资产分组（主页功能入口收敛）", () => {
    const wrapper = mountSettings();
    const titles = wrapper.findAll(".section__title-text").map((n) => n.text());
    expect(titles.some((t) => t.includes("社交资产"))).toBe(true);
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    // 2026-09-06 产品收敛（需求方要求）：任务中心 / 我的圈子 / 情感实验室 从设置页隐藏；
    // 交友币入口受 commerce.coin 商业化开关控制（默认关闭不渲染）。
    // 恋爱认证移入账号资料分组，仍在页面菜单内。
    for (const expected of ["我的动态", "访客记录", "浏览记录", "我的相册", "恋爱认证"]) {
      expect(labels, `应包含入口 ${expected}`).toContain(expected);
    }
    for (const hidden of ["任务中心", "我的圈子"]) {
      expect(labels, `不应再展示入口 ${hidden}`).not.toContain(hidden);
    }
  });

  it("渲染隐私安全分组", () => {
    const wrapper = mountSettings();
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    expect(labels).toContain("隐私权限设置");
    expect(labels).toContain("安全中心");
  });

  it("保留关于与退出登录", () => {
    const wrapper = mountSettings();
    const labels = wrapper.findAll(".menu-item__label").map((n) => n.text());
    expect(labels.some((l) => l.includes("关于"))).toBe(true);
    expect(wrapper.find(".logout-btn").exists()).toBe(true);
  });

  // ------------------------------------------------------------------
  // P2 修复 5（2026-10-31）：「清除缓存」不得是 no-op
  // ------------------------------------------------------------------
  describe("清除缓存（P2 修复 5：不再对 no-op 弹成功 toast）", () => {
    /** 找到「清除缓存」那一行并点击（触发 uni.showModal 的 confirm 分支） */
    function tapClearCache(wrapper: ReturnType<typeof mountSettings>) {
      const row = wrapper
        .findAll(".menu-item")
        .find((item) => item.find(".menu-item__label").text().includes("清除缓存"));
      expect(row, "设置页应存在「清除缓存」入口").toBeTruthy();
      return row!.trigger("tap");
    }

    beforeEach(() => {
      seedStorage.clear();
      removeStorageSync.mockClear();
      getStorageSync.mockClear();
      vi.mocked(clearAllCaches).mockClear();
      vi.mocked(clearMediaSignCache).mockClear();
    });

    it("移除真实有写入方的可重建缓存键（修复前只删零写入的 USER_CACHE）", async () => {
      seedStorage.set(STORAGE_KEYS.NEARBY_CITY, "杭州市");
      seedStorage.set(STORAGE_KEYS.TABBAR_CHAT_UNREAD, 5);

      const wrapper = mountSettings();
      await tapClearCache(wrapper);

      const clearedKeys = removeStorageSync.mock.calls.map((call) => call[0]);
      expect(clearedKeys).toContain(STORAGE_KEYS.NEARBY_CITY);
      expect(clearedKeys).toContain(STORAGE_KEYS.TABBAR_CHAT_UNREAD);
    });

    it("同时清空运行时内存缓存（TTL stale-while-revalidate + 媒体签名 URL）", async () => {
      const wrapper = mountSettings();
      await tapClearCache(wrapper);

      expect(clearAllCaches).toHaveBeenCalled();
      expect(clearMediaSignCache).toHaveBeenCalled();
    });

    it("清除范围严格限于登记的缓存键，不动账号内容（草稿/搜索历史/token）", async () => {
      const wrapper = mountSettings();
      await tapClearCache(wrapper);

      for (const call of removeStorageSync.mock.calls) {
        expect(REBUILDABLE_CACHE_KEYS, `${call[0]} 不属可重建缓存`).toContain(call[0]);
      }
      expect(removeStorageSync).not.toHaveBeenCalledWith(STORAGE_KEYS.SEARCH_HISTORY);
      expect(removeStorageSync).not.toHaveBeenCalledWith(STORAGE_KEYS.VILLAGE_POST_DRAFT);
      expect(removeStorageSync).not.toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKEN);
    });

    it("清除后重新统计缓存大小（展示值不是摆设）", async () => {
      seedStorage.set(STORAGE_KEYS.NEARBY_CITY, "杭州市");
      const wrapper = mountSettings();
      await tapClearCache(wrapper);

      expect(uniAny.getStorageInfo).toHaveBeenCalled();
      // 缓存键已消失于存储层
      expect(removeStorageSync).toHaveBeenCalledWith(STORAGE_KEYS.NEARBY_CITY);
    });
  });
});
