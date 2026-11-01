import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  ACCOUNT_SCOPED_STORES,
  NON_ACCOUNT_STORES,
} from "../../stores/logout-registry";

/**
 * 登出登记表的穷尽性门（第五轮 B 道 FINDING 15 的「默认即安全」那一半）。
 *
 * 存储侧本来就是这形状：`constants/storage-keys.ts` 把「不在设备级清单里的键」一律
 * 当用户级 ⇒ 新增 key 默认被清，漏清方向天然安全。内存侧此前完全没有对应物——
 * 全仓 `$reset` 零命中、四个 store 自带的 `reset()` 也没有登出调用点，于是「新写一个
 * store 忘了考虑登出」不会让任何东西变红。本门补的正是这一条：**新增 store 不登记就红**。
 *
 * 判据来源是盘上的 `defineStore('...')` 声明，不是任何文档清单，也不 import 各 store
 * 本体（import 全体 store 会把这条静态判点变成运行时判点，还得替每个 store 铺好桩）。
 */
const STORES_ROOT = resolve(__dirname, "../../stores");

function collectTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) collectTs(full, out);
    else if (entry.isFile() && full.endsWith(".ts")) out.push(full);
  }
  return out;
}

const storeFiles = collectTs(STORES_ROOT).filter(
  (file) => relative(STORES_ROOT, file) !== "logout-registry.ts"
);

/** 盘上真实存在的 store id（`defineStore` 第一参数，单双引号都认）。 */
const declaredIds = new Map<string, string>();
for (const file of storeFiles) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/defineStore\(\s*["']([^"']+)["']/gu)) {
    declaredIds.set(m[1], relative(STORES_ROOT, file));
  }
}

const registeredIds = ACCOUNT_SCOPED_STORES.map((e) => e.id);
const exemptIds = NON_ACCOUNT_STORES.map((e) => e.id);

describe("登出 store 登记表必须穷尽盘上所有 store", () => {
  it("扫描面非空（防这条门在遍历坏掉时静默变绿）", () => {
    expect(
      declaredIds.size,
      `只解析到 ${declaredIds.size} 个 defineStore ⇒ 遍历或正则失效了`,
    ).toBeGreaterThanOrEqual(25);
  });

  it("每个 store 要么登记复位、要么登记为不跟账号走（新增未登记即红）", () => {
    const unmanaged = [...declaredIds.keys()].filter(
      (id) => !registeredIds.includes(id) && !exemptIds.includes(id)
    );
    expect(
      unmanaged,
      `未登记的 store：\n${unmanaged.map((id) => `${id} @ ${declaredIds.get(id)}`).join("\n")}`,
    ).toEqual([]);
  });

  it("登记表不许指向盘上已不存在的 id（改名或删 store 后必须同步划掉）", () => {
    const stale = [
      ...registeredIds,
      ...exemptIds,
    ].filter((id) => !declaredIds.has(id));
    expect(stale, `登记表里有盘上已不存在的 store id：${stale.join(", ")}`).toEqual([]);
  });

  it("登记复位的每一个 store 都真的实现了 resetForLogout()", () => {
    const missing = ACCOUNT_SCOPED_STORES.filter((entry) => {
      const file = declaredIds.get(entry.id);
      if (!file) return true;
      return !readFileSync(resolve(STORES_ROOT, file), "utf8").includes("resetForLogout");
    }).map((e) => e.id);
    expect(
      missing,
      `登记了但没实现 resetForLogout() 的 store：${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("「不跟账号走」的豁免必须带得出理由（空理由等于免检）", () => {
    for (const exempt of NON_ACCOUNT_STORES) {
      expect(
        exempt.reason.trim().length,
        `${exempt.id} 的豁免理由太短，读者无法反驳 ⇒ 这条豁免不算理由`
      ).toBeGreaterThanOrEqual(12);
    }
  });

  it("登记表的 load 都是惰性函数（模块顶层求值会在 pinia 激活前炸）", () => {
    const registrySrc = readFileSync(
      resolve(STORES_ROOT, "logout-registry.ts"),
      "utf8"
    );
    // 判 registry 本体： ACCOUNT_SCOPED_STORES 数组里只允许出现函数引用，
    // 出现 `useXxxStore()` 这样的调用形态就是初始化期求值。
    const table = registrySrc.slice(
      registrySrc.indexOf("ACCOUNT_SCOPED_STORES"),
      registrySrc.indexOf("NON_ACCOUNT_STORES")
    );
    expect(table).not.toMatch(/load:\s*use[A-Za-z]+Store\(\)/u);
    expect(registeredIds.length).toBeGreaterThanOrEqual(20);
  });
});
