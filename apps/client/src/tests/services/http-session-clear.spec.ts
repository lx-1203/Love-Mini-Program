import { describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEYS,
  DEVICE_SCOPED_STORAGE_KEYS,
  USER_SCOPED_STORAGE_KEYS,
} from "../../constants/storage-keys";

/**
 * 会话结束清理（P1 修复 1 + 2，2026-10-31）。
 *
 * 修复前：
 * 1. clearTokens() 只删 AUTH_TOKEN / REFRESH_TOKEN 两枚键，登出与 401 强制下线
 *    都不动其余用户级键 ⇒ 共享设备上下一账号继承上一账号的未发送草稿、
 *    搜索历史、隐藏消息 ID、已看卡片记录、签到缓存、定位城市、会话持久化字段。
 * 2. clearAllCaches() 只在 setToken 里调用，clearTokens 不调 ⇒ 401 弹回登录页后，
 *    fetchWithStaleWhileRevalidate 走「有过期旧值 → 先返回旧值」分支，
 *    login/guest 页会闪现上一账号的余额/消息/资料。
 *
 * 手法：桩 globalThis.uni 的 storage API（含 getStorageInfoSync，用于按前缀枚举
 * 分会话复合键），断言 removeStorageSync 的**具体键名**（而非调用次数），
 * 并用真实的 utils/cache-ttl 模块验证 stale 回读被掐断。
 */

const storage = new Map<string, unknown>();

/** removeStorageSync 实际收到的键名序列 */
const removed: string[] = [];

(globalThis as Record<string, unknown>).uni = {
  setStorageSync: (key: string, value: unknown) => {
    storage.set(key, value);
  },
  getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
  removeStorageSync: (key: string) => {
    removed.push(key);
    storage.delete(key);
  },
  // 真实 uni 提供全量键名枚举；分会话草稿键只能靠它清掉
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()), currentSize: 0, limitSize: 0 }),
  showToast: () => {},
  reLaunch: () => {},
  request: () => ({ abort: () => {} }),
};

import { clearTokens } from "../../services/http";
import { fetchWithStaleWhileRevalidate } from "../../utils/cache-ttl";

/** 预置一份「上一账号」的本地存储（键名与真实写入方一致） */
function seedPreviousUserStorage(): void {
  storage.clear();
  removed.length = 0;
  storage.set(STORAGE_KEYS.AUTH_TOKEN, "jwt-previous");
  storage.set(STORAGE_KEYS.REFRESH_TOKEN, "refresh-previous");
  // 用户级（audit 点名的 6 个键）
  storage.set(STORAGE_KEYS.CHAT_DRAFT, "草稿-裸键");
  storage.set(STORAGE_KEYS.DELETED_MESSAGE_IDS, ["m-1", "m-2"]);
  storage.set(STORAGE_KEYS.DISCOVER_SWIPE_HISTORY, ["u-9"]);
  storage.set(STORAGE_KEYS.SEARCH_HISTORY, ["前任", "同校"]);
  storage.set(STORAGE_KEYS.VILLAGE_POST_DRAFT, { title: "未发布帖子" });
  storage.set(STORAGE_KEYS.NEARBY_CITY, "杭州市");
  // 用户级（本次收编进登记表的其他真实写入键）
  storage.set(STORAGE_KEYS.CHAT_MESSAGE_STATUS, '{"m-3":"failed"}');
  storage.set(STORAGE_KEYS.DISCOVER_DAILY_RECORD, '{"date":"2026-10-31","viewedCards":["u-7"]}');
  storage.set(STORAGE_KEYS.ASSISTANT_ACTIVITY_NOTIFY, [{ id: "n-1" }]);
  storage.set(STORAGE_KEYS.SESSION_PERSISTED_FIELDS, '{"profileBackgroundUrl":"/media/bg.png"}');
  storage.set(STORAGE_KEYS.VILLAGE_PUBLISH_DRAFT, { content: "未发布" });
  storage.set(STORAGE_KEYS.TABBAR_CHAT_UNREAD, 12);
  storage.set(STORAGE_KEYS.KICKED_DEVICES, ["dev-1"]);
  storage.set(STORAGE_KEYS.USER_IDENTITY, "student");
  storage.set(STORAGE_KEYS.PRIVACY_SETTINGS, { whoCanSeeSchedule: "friends" });
  storage.set(STORAGE_KEYS.CHECKIN_LAST_DATE, "2026-10-30");
  storage.set(STORAGE_KEYS.CHECKIN_CONSECUTIVE_DAYS, 7);
  storage.set(STORAGE_KEYS.USER_CACHE, { nickname: "上一账号" });
  // 分会话复合键：chat-session/index.vue 的 CHAT_DRAFT_PREFIX + 会话 ID
  storage.set("chat-session-draft:s-1", "草稿-会话1");
  storage.set("chat-session-draft:s-2", "草稿-会话2");
  // 前缀之外的相似键：证明按前缀精确匹配，而非 uni.clearStorage 一把梭
  storage.set("chat:draftx", "哨兵键不应被误删");
  // 设备级（跨账号保留）
  storage.set(STORAGE_KEYS.THEME_MODE, "dark");
  storage.set(STORAGE_KEYS.LOCALE, "zh-CN");
  storage.set(STORAGE_KEYS.WEEKLY_SCHEDULE_ENABLED, "1");
  storage.set(STORAGE_KEYS.UNLOCK_GUIDE_SHOWN, true);
  storage.set(STORAGE_KEYS.VILLAGE_LAST_CHANNEL, "hot");
  storage.set(STORAGE_KEYS.DND_SETTING, { start: "23:00" });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("会话结束清理：用户级本地存储（P1 修复 1）", () => {
  it("clearTokens 移除 audit 点名的账号数据键（按具体键名断言）", () => {
    seedPreviousUserStorage();
    clearTokens();

    for (const key of [
      STORAGE_KEYS.CHAT_DRAFT,
      STORAGE_KEYS.DELETED_MESSAGE_IDS,
      STORAGE_KEYS.DISCOVER_SWIPE_HISTORY,
      STORAGE_KEYS.SEARCH_HISTORY,
      STORAGE_KEYS.VILLAGE_POST_DRAFT,
      STORAGE_KEYS.NEARBY_CITY,
    ]) {
      expect(removed, `应移除用户级键 ${key}`).toContain(key);
      expect(storage.has(key), `${key} 应已从存储消失`).toBe(false);
    }
  });

  it("clearTokens 同时移除登记后自动落入清单的其他真实写入键", () => {
    seedPreviousUserStorage();
    clearTokens();

    for (const key of [
      STORAGE_KEYS.CHAT_MESSAGE_STATUS,
      STORAGE_KEYS.DISCOVER_DAILY_RECORD,
      STORAGE_KEYS.ASSISTANT_ACTIVITY_NOTIFY,
      STORAGE_KEYS.SESSION_PERSISTED_FIELDS,
      STORAGE_KEYS.VILLAGE_PUBLISH_DRAFT,
      STORAGE_KEYS.TABBAR_CHAT_UNREAD,
      STORAGE_KEYS.KICKED_DEVICES,
      STORAGE_KEYS.USER_IDENTITY,
      STORAGE_KEYS.PRIVACY_SETTINGS,
      STORAGE_KEYS.CHECKIN_LAST_DATE,
      STORAGE_KEYS.CHECKIN_CONSECUTIVE_DAYS,
      STORAGE_KEYS.USER_CACHE,
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]) {
      expect(removed, `应移除用户级键 ${key}`).toContain(key);
    }
  });

  it("分会话聊天草稿按前缀整族清除（精确键删除覆盖不到 chat-session-draft:{id}）", () => {
    seedPreviousUserStorage();
    clearTokens();

    expect(removed).toContain("chat-session-draft:s-1");
    expect(removed).toContain("chat-session-draft:s-2");
    expect(storage.has("chat-session-draft:s-1")).toBe(false);
    expect(storage.has("chat-session-draft:s-2")).toBe(false);
    // 相似但不同前缀的键不受波及
    expect(storage.has("chat:draftx")).toBe(true);
  });

  it("设备级偏好跨账号保留，不得被顺手清掉", () => {
    seedPreviousUserStorage();
    clearTokens();

    for (const key of DEVICE_SCOPED_STORAGE_KEYS) {
      expect(removed, `设备级键 ${key} 不应被清除`).not.toContain(key);
    }
    expect(storage.get(STORAGE_KEYS.THEME_MODE)).toBe("dark");
    expect(storage.get(STORAGE_KEYS.UNLOCK_GUIDE_SHOWN)).toBe(true);
  });

  /**
   * 「靠构造覆盖而非靠记得」的机制断言：
   * STORAGE_KEYS 的每一个值必须落在两侧之一——被清（用户级）或显式豁免（设备级）。
   * 新增 key 未登记豁免清单时默认落入用户级（漏清的方向天然是安全侧），
   * 而「两侧都不登记」或「两侧都登记」会被本用例抓到。
   */
  it("STORAGE_KEYS 全量值要么被清除要么被显式豁免（无第三态）", () => {
    const allValues = Object.values(STORAGE_KEYS) as string[];
    const partition = new Set<string>([
      ...USER_SCOPED_STORAGE_KEYS,
      ...DEVICE_SCOPED_STORAGE_KEYS,
    ]);
    for (const value of allValues) {
      expect(partition.has(value), `${value} 未落入用户级/设备级任一清单`).toBe(true);
    }
    // 两份清单必须互斥，否则「豁免」会被派生逻辑吃掉
    for (const value of DEVICE_SCOPED_STORAGE_KEYS) {
      expect(USER_SCOPED_STORAGE_KEYS).not.toContain(value);
    }
  });

  it("清理清单由 STORAGE_KEYS 派生：清单里没有硬编码漏项，陌生键也不被误伤", () => {
    seedPreviousUserStorage();
    storage.set("brand:new-account-only-key", "x");
    clearTokens();

    // 派生清单 == STORAGE_KEYS 全量减去设备级豁免，逐项核对
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      if (storage.has(key)) {
        expect(removed, `用户级键 ${key} 应被移除`).toContain(key);
      }
    }
    // 未登记的陌生键不动（清理由登记表驱动，不是 uni.clearStorage 全清）
    expect(removed).not.toContain("brand:new-account-only-key");
    expect(storage.has("brand:new-account-only-key")).toBe(true);
  });
});

describe("会话结束清理：TTL 缓存不再被 stale 回读（P1 修复 2）", () => {
  it("clearTokens 后 stale-while-revalidate 不得返回上一账号的旧载荷", async () => {
    seedPreviousUserStorage();
    const cacheKey = "wallet:balance";
    const previousUserPayload = { nickname: "上一账号", balance: 999 };

    // 上一账号会话期内写入缓存
    await fetchWithStaleWhileRevalidate(cacheKey, 1, async () => previousUserPayload);
    // 让条目过期（过期后 SWR 直接返回旧值——正是 401 弹跳后闪回旧数据的路径）
    await sleep(10);

    clearTokens();

    const freshUserPayload = { nickname: "新账号", balance: 0 };
    const fetcher = vi.fn(async () => freshUserPayload);
    const result = await fetchWithStaleWhileRevalidate(cacheKey, 30_000, fetcher);

    // 修复前：result === previousUserPayload（clearTokens 未清 TTL 缓存）
    expect(result).toBe(freshUserPayload);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("clearTokens 移除 token 并清空 TTL 缓存中其他键（含未过期条目）", async () => {
    seedPreviousUserStorage();
    const profilePayload = { nickname: "上一账号" };
    await fetchWithStaleWhileRevalidate("profile:basic", 60_000, async () => profilePayload);

    clearTokens();

    expect(storage.has(STORAGE_KEYS.AUTH_TOKEN)).toBe(false);
    const fresh = { nickname: "新账号" };
    const result = await fetchWithStaleWhileRevalidate("profile:basic", 60_000, async () => fresh);
    expect(result).toBe(fresh);
  });
});
