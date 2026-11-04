import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive } from "vue";

/**
 * useUnreadBadge（composables/useUnreadBadge.ts）单测：实时未读消息计数与 TabBar 红点同步。
 *
 * 消费面：App.vue 全局挂一次 + custom-tab-bar 红点链路（WebSocket 推送 → messages store
 * → totalUnreadCount getter → watch → 红点），是被多端渲染通路消费的基础设施。
 * 覆盖的主要分支：
 * - setChatTabBadge 平台分叉：mp-weixin（自定义 TabBar）走「storage + getTabBar().setData
 *   双通道」，非 mp-weixin 走 uni.setTabBarBadge / removeTabBarBadge；
 * - 数值语义：count>0 设置角标、>99 封顶显示 "99+"（99 恰好不封顶）、count<=0 移除角标；
 * - 兜底分支：tabBar 实例缺失 / setData 非函数 / storage 写入抛错 / setTabBarBadge API
 *   不存在或抛异常，一律静默不影响启动；
 * - useUnreadBadge：onLaunch 注册监听并立即同步初始值，watch 驱动后续增减；
 *   messages store 初始化失败时静默忽略；
 * - CHAT_TAB_INDEX 与 config/navigation.ts（appTabs）同一真相源，tab 顺序调整红点自动跟随。
 *
 * 桩方式与相邻的 use-post-share.spec.ts 一致：stubUni 记录/还原 setup.ts 注入的全局 uni，
 * compat 平台函数按用例注入。
 */

const hooks = vi.hoisted(() => ({
  onLaunch: [] as Array<() => unknown>,
}));

const messagesApi = vi.hoisted(() => ({
  useMessagesStore: vi.fn(),
  // 工厂里挂真实 ref：storeToRefs 只认 ref/reactive 形态的 state（login-index.spec 同款）
  totalUnreadCount: null as { value: number } | null,
}));

const compatFlags = vi.hoisted(() => ({
  mp: false,
  tabBar: null as { setData?: (data: Record<string, unknown>) => void } | null,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onLaunch: (cb: () => unknown) => hooks.onLaunch.push(cb),
  onShow: vi.fn(),
  onHide: vi.fn(),
  onLoad: vi.fn(),
  onUnload: vi.fn(),
  onReady: vi.fn(),
}));

vi.mock("../../stores/messages", async () => {
  const { ref } = await import("vue");
  const totalUnreadCount = ref(0);
  messagesApi.totalUnreadCount = totalUnreadCount;
  return { useMessagesStore: messagesApi.useMessagesStore };
});

// 平台分叉与 TabBar 实例获取收敛在 compat（Task 35），这里按用例注入；
// 其余 compat 导出保持真实实现
vi.mock("../../compat", async (importOriginal) => ({
  ...(await importOriginal()),
  isMpWeixin: () => compatFlags.mp,
  getTabBarInstance: () => compatFlags.tabBar,
}));

import {
  CHAT_TAB_INDEX,
  setChatTabBadge,
  useUnreadBadge,
} from "../../composables/useUnreadBadge";
import { appTabs } from "../../config/navigation";
import { STORAGE_KEYS } from "../../constants";

/** 与 use-post-share.spec.ts 同款：记录/还原 setup.ts 注入的全局 uni 单个方法 */
const uniOriginals = new Map<string, unknown>();

function stubUni(name: string, impl: unknown): void {
  const holder = uni as unknown as Record<string, unknown>;
  if (!uniOriginals.has(name)) {
    uniOriginals.set(name, holder[name]);
  }
  holder[name] = impl;
}

let setTabBarBadge: ReturnType<typeof vi.fn>;
let removeTabBarBadge: ReturnType<typeof vi.fn>;
let setStorageSync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  compatFlags.mp = false;
  compatFlags.tabBar = null;
  hooks.onLaunch.length = 0;
  if (messagesApi.totalUnreadCount) messagesApi.totalUnreadCount.value = 0;
  messagesApi.useMessagesStore.mockReset();
  messagesApi.useMessagesStore.mockImplementation(() =>
    reactive({ totalUnreadCount: messagesApi.totalUnreadCount })
  );
  setTabBarBadge = vi.fn();
  removeTabBarBadge = vi.fn();
  setStorageSync = vi.fn();
  stubUni("setTabBarBadge", setTabBarBadge);
  stubUni("removeTabBarBadge", removeTabBarBadge);
  stubUni("setStorageSync", setStorageSync);
});

afterEach(() => {
  vi.restoreAllMocks();
  const holder = uni as unknown as Record<string, unknown>;
  for (const [name, original] of uniOriginals) {
    holder[name] = original;
  }
  uniOriginals.clear();
});

describe("useUnreadBadge：setChatTabBadge 平台分叉", () => {
  it("mp-weixin（自定义 TabBar）：storage + getTabBar().setData 双通道，不走 setTabBarBadge", () => {
    compatFlags.mp = true;
    const setData = vi.fn();
    compatFlags.tabBar = { setData };
    setChatTabBadge(3);
    expect(setStorageSync).toHaveBeenCalledWith(STORAGE_KEYS.TABBAR_CHAT_UNREAD, 3);
    expect(setData).toHaveBeenCalledWith({ chatBadge: 3 });
    expect(setTabBarBadge).not.toHaveBeenCalled();
  });

  it("mp-weixin：tabBar 实例缺失（页面未挂载）仍写 storage，交给 attached/show 兜底通道", () => {
    compatFlags.mp = true;
    compatFlags.tabBar = null;
    expect(() => setChatTabBadge(5)).not.toThrow();
    expect(setStorageSync).toHaveBeenCalledWith(STORAGE_KEYS.TABBAR_CHAT_UNREAD, 5);
    expect(setTabBarBadge).not.toHaveBeenCalled();
  });

  it("mp-weixin：setData 非函数时静默跳过实例通道（storage 通道照常）", () => {
    compatFlags.mp = true;
    compatFlags.tabBar = {};
    expect(() => setChatTabBadge(2)).not.toThrow();
    expect(setStorageSync).toHaveBeenCalledWith(STORAGE_KEYS.TABBAR_CHAT_UNREAD, 2);
  });

  it("mp-weixin：storage 写入抛错被吞掉，setData 通道仍然刷新（不因存储失败丢红点）", () => {
    compatFlags.mp = true;
    const setData = vi.fn();
    compatFlags.tabBar = { setData };
    setStorageSync.mockImplementation(() => {
      throw new Error("storage full");
    });
    expect(() => setChatTabBadge(4)).not.toThrow();
    expect(setData).toHaveBeenCalledWith({ chatBadge: 4 });
  });

  it("非 mp-weixin（H5/APP）：count>0 → setTabBarBadge(chat 索引, 数字文本)，且不写 storage", () => {
    setChatTabBadge(3);
    expect(setTabBarBadge).toHaveBeenCalledTimes(1);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX, text: "3" })
    );
    expect(removeTabBarBadge).not.toHaveBeenCalled();
    expect(setStorageSync).not.toHaveBeenCalled();
  });

  it("非 mp-weixin：超过 99 封顶显示 99+，恰好 99 不封顶", () => {
    setChatTabBadge(100);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ text: "99+" })
    );
    setTabBarBadge.mockClear();
    setChatTabBadge(99);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ text: "99" })
    );
  });

  it("非 mp-weixin：count<=0 → removeTabBarBadge 移除红点，不得误设角标", () => {
    setChatTabBadge(0);
    expect(removeTabBarBadge).toHaveBeenCalledTimes(1);
    expect(removeTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX })
    );
    expect(setTabBarBadge).not.toHaveBeenCalled();
    removeTabBarBadge.mockClear();
    setChatTabBadge(-1);
    expect(removeTabBarBadge).toHaveBeenCalledTimes(1);
  });

  it("非 mp-weixin：uni.setTabBarBadge 不存在（兼容性分支）→ 静默返回，无副作用", () => {
    stubUni("setTabBarBadge", undefined);
    expect(() => setChatTabBadge(5)).not.toThrow();
    expect(removeTabBarBadge).not.toHaveBeenCalled();
  });

  it("非 mp-weixin：setTabBarBadge 抛异常（部分端 fail 回调不可用）被 try/catch 吞掉", () => {
    setTabBarBadge.mockImplementation(() => {
      throw new Error("not supported");
    });
    expect(() => setChatTabBadge(5)).not.toThrow();
  });
});

describe("useUnreadBadge：onLaunch 初始化与 watch 联动", () => {
  function launchBadge(): void {
    useUnreadBadge();
    expect(hooks.onLaunch).toHaveLength(1);
    hooks.onLaunch[0]();
  }

  // 注意：源码在 onLaunch 里注册的 watch 是全局监听（无作用域、不随测试停止），
  // 而 totalUnreadCount 是模块级共享 ref——跨测试会泄漏监听器。因此本 describe
  // 把「初始化失败」放在最前（此刻文件内尚无任何存活 watch，零调用断言才精确），
  // 并把初始化 + watch 全链路收敛到一个用例里跑，保证全程只有一个 watch 在场，
  // 每个阶段的调用次数都可精确断言。

  it("messages store 初始化失败：静默忽略，不影响应用启动，也不做初始同步", () => {
    messagesApi.useMessagesStore.mockImplementationOnce(() => {
      throw new Error("store boom");
    });
    launchBadge();
    // catch 兜底生效：连初始同步都没有发生过，更不会把失败放大成红点错乱
    expect(setTabBarBadge).not.toHaveBeenCalled();
    expect(removeTabBarBadge).not.toHaveBeenCalled();
    expect(setStorageSync).not.toHaveBeenCalled();
  });

  it("onLaunch 注册监听并立即同步初始值，watch 驱动红点增减与 99+ 封顶（全链路）", async () => {
    if (messagesApi.totalUnreadCount) messagesApi.totalUnreadCount.value = 3;
    launchBadge();
    // 初始值立即对齐，不靠下一次变化才纠正
    expect(setTabBarBadge).toHaveBeenCalledTimes(1);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX, text: "3" })
    );

    // 新消息涌入 → 角标 +N（此刻文件内只有本用例注册的一个 watch）
    setTabBarBadge.mockClear();
    if (messagesApi.totalUnreadCount) messagesApi.totalUnreadCount.value = 7;
    await nextTick();
    await nextTick();
    expect(setTabBarBadge).toHaveBeenCalledTimes(1);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX, text: "7" })
    );

    // 全部已读 → 移除红点
    setTabBarBadge.mockClear();
    removeTabBarBadge.mockClear();
    if (messagesApi.totalUnreadCount) messagesApi.totalUnreadCount.value = 0;
    await nextTick();
    await nextTick();
    expect(removeTabBarBadge).toHaveBeenCalledTimes(1);
    expect(removeTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX })
    );
    expect(setTabBarBadge).not.toHaveBeenCalled();

    // 突发洪峰 → 封顶显示 99+
    removeTabBarBadge.mockClear();
    if (messagesApi.totalUnreadCount) messagesApi.totalUnreadCount.value = 100;
    await nextTick();
    await nextTick();
    expect(setTabBarBadge).toHaveBeenCalledTimes(1);
    expect(setTabBarBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: CHAT_TAB_INDEX, text: "99+" })
    );
    expect(removeTabBarBadge).not.toHaveBeenCalled();
  });
});

describe("useUnreadBadge：CHAT_TAB_INDEX 真相源", () => {
  it("消息 tab 索引从 appTabs（config/navigation.ts 唯一真相源）推导，顺序调整红点自动跟随", () => {
    expect(CHAT_TAB_INDEX).toBe(
      Math.max(0, appTabs.findIndex((tab) => tab.id === "chat"))
    );
    expect(CHAT_TAB_INDEX).toBeGreaterThanOrEqual(0);
    expect(appTabs[CHAT_TAB_INDEX]?.id).toBe("chat");
  });
});
