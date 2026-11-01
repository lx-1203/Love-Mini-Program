import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 页面级静态契约 · 第 2 批（R7-D，round-6 F-7「静态即可」的 9 页）。
 *
 * <p>这些页的判据是「守卫句顺序 / 取数入口唯一 / 模板绑哪枚状态」——静态源码契约
 * 就能证（readFileSync + 位置断言），挂载反而贵 3–4 倍（F-7 实测口径）。形态照抄
 * pages/daily-question-page.spec.ts / guest-landing-pairs.spec.ts：引标识符/条件原文，
 * 行号只作阅读提示（重排不失效，判据锚在文本与相对顺序上）。</p>
 *
 * <p>这 9 页此前是 F-1 账上的「46 页业务判点空白」成员（其中数页只有风格/命名类 spec）。
 * 每页的判点都从当轮源码现读现钉，不是从上一轮报告转抄。</p>
 */

const SRC = resolve(__dirname, "../..");
const src = (rel: string): string => readFileSync(resolve(SRC, rel), "utf8");

describe("第 2 批静态契约：9 页守卫顺序与取数入口", () => {
  // 1) 发现页：额度早退在动作派发之前
  describe("pages/discover/index.vue", () => {
    const page = src("pages/discover/index.vue");
    it("额度用尽的早退在 beginCheck（喜欢/打招呼派发）之前，且 toast 后必须 return", () => {
      const guard = page.indexOf("if (discoverStore.isLimitReached)");
      const toast = page.indexOf('uni.showToast({ title: t("discover.card.quotaExhaustedTitle")');
      const ret = page.indexOf("return;", toast);
      const dispatch = page.indexOf("matchStore.beginCheck(", toast);
      expect(guard).toBeGreaterThan(-1);
      expect(toast).toBeGreaterThan(guard);
      expect(ret).toBeGreaterThan(toast);
      expect(dispatch).toBeGreaterThan(ret);
    });
    it("额度状态是渲染依据之一（quotaExhausted 分支在卡片标题里，不是只有 toast）", () => {
      expect(page).toContain("discoverStore.quotaExhausted");
    });
  });

  // 2) 搜索页：深链参数与历史区块的渲染条件
  describe("subpackages/tools/search/index.vue", () => {
    const page = src("subpackages/tools/search/index.vue");
    it("onLoad 消费深链 options?.keyword（带词进页即搜，无词走 init）", () => {
      expect(page).toMatch(/onLoad\(\(options\)/);
      expect(page).toContain("options?.keyword");
      expect(page).toContain("searchStore.searchByTerm(keyword)");
      expect(page).toContain("searchStore.init()");
    });
    it("历史区块只在有历史时渲染（v-if 判 length，空态判 hot+history 双空）", () => {
      expect(page).toContain('v-if="searchStore.history.length > 0"');
      expect(page).toContain("searchStore.hotSearches.length === 0 && searchStore.history.length === 0");
    });
  });

  // 3) 浏览历史页：重试入口清错重拉 + 离开取消
  describe("subpackages/discover-extra/discover/history.vue", () => {
    const page = src("subpackages/discover-extra/discover/history.vue");
    it("重试走唯一取数入口 discoverStore.fetchCards（网络错误后的可重试入口，R4 修复物）", () => {
      expect(page).toContain("function handleRetry()");
      const retry = page.indexOf("function handleRetry()");
      const fetch = page.indexOf("discoverStore.fetchCards()", retry);
      expect(fetch).toBeGreaterThan(-1);
    });
    it("onUnload 调 discoverStore.dispose()（R4-00158：清定时器/请求资源，不许静默漂没）", () => {
      expect(page).toMatch(/onUnload\(\(\) => \{\s*discoverStore\.dispose\(\)/s);
    });
  });

  // 4) 活动详情：onLoad 读 id，取数单入口
  describe("subpackages/tools/activities/detail.vue", () => {
    const page = src("subpackages/tools/activities/detail.vue");
    it("onLoad 消费 options.id 且详情取数只走 activityStore.fetchActivityDetail", () => {
      expect(page).toMatch(/onLoad\(\(options\)/);
      expect(page).toContain("options.id");
      expect(page.match(/fetchActivityDetail\(/g)?.length).toBe(1);
    });
  });

  // 5) 活动列表：守卫 + onShow 重拉
  describe("subpackages/discover/activities/index.vue", () => {
    const page = src("subpackages/discover/activities/index.vue");
    it("usePageAccess 先于 onShow 取数注册（守卫页不许先拉数据）", () => {
      const guard = page.indexOf("usePageAccess({");
      const show = page.indexOf("onShow(() => {");
      expect(guard).toBeGreaterThan(-1);
      expect(show).toBeGreaterThan(guard);
      expect(page).toContain("activityStore.fetchActivities()");
    });
  });

  // 6) 讨论区：守卫 + onShow 取数 + 失败可重试
  describe("subpackages/discussions: subpackages/discover/discussions/index.vue", () => {
    const page = src("subpackages/discover/discussions/index.vue");
    it("usePageAccess(discoverPageRequirements) 在 onShow 之前；失败写 error 供重试", () => {
      const guard = page.indexOf("usePageAccess(discoverPageRequirements)");
      const show = page.indexOf("onShow(() => {");
      expect(guard).toBeGreaterThan(-1);
      expect(show).toBeGreaterThan(guard);
      expect(page).toContain("error.value =");
      expect(page).toContain("t(\"discussions.loadFailed\")");
    });
  });

  // 7) 帮助页：门槛口径不许把「需要登录」带进来（R6 实测两帧 landingMismatch 的修复）
  describe("subpackages/tools/help/index.vue", () => {
    const page = src("subpackages/tools/help/index.vue");
    it("usePageAccess 用 helpPageRequirements（chatPageRequirements 只许出现在注释里的历史说明）", () => {
      expect(page).toContain("usePageAccess(helpPageRequirements)");
      /* 剥注释后再判「不在」——本页注释原文引用过旧实现 usePageAccess(chatPageRequirements)
         作为反面教材，全文判 not.toContain 会把注释当活代码误报。 */
      const noComments = page
        .replace(/\/\*[\s\S]*?\*\//gu, (m) => " ".repeat(m.length))
        .replace(/(^|[^:])\/\/.*$/gmu, "$1");
      expect(noComments).not.toContain("usePageAccess(chatPageRequirements)");
    });
  });

  // 8) 我的任务：签到完成态从真实状态派生 + 离开取消
  describe("subpackages/profile-extra/profile/tasks.vue", () => {
    const page = src("subpackages/profile-extra/profile/tasks.vue");
    it("签到任务完成态从 onShow 拉取的真实签到状态派生（不是本地拍脑袋）", () => {
      expect(page).toContain("onShow(async () => {");
      expect(page).toMatch(/checkin|check-in/iu);
    });
    it("W2-3：离开页面取消在途读请求", () => {
      expect(page).toMatch(/onUnload\(|useAbortOnHide/);
    });
  });

  // 9) 官方客服：守卫 + 排序把 pendingReal 放在 fetched 前（乐观发送不被覆盖）
  describe("subpackages/chat/official-chat/index.vue", () => {
    const page = src("subpackages/chat/official-chat/index.vue");
    it("usePageAccess(officialChatRequirements) 先于取数；合并排序 pendingReal 在前", () => {
      const guard = page.indexOf("usePageAccess(officialChatRequirements)");
      const merge = page.indexOf("messages.value = [...fetched, ...pendingReal].sort(");
      expect(guard).toBeGreaterThan(-1);
      expect(merge).toBeGreaterThan(guard);
      expect(page.indexOf("messages.value = fetched")).toBeGreaterThan(merge);
    });
  });

  it("防空转：9 页源文件都在盘上且非空（掉了先怀疑路径，不是判据）", () => {
    const files = [
      "pages/discover/index.vue",
      "subpackages/tools/search/index.vue",
      "subpackages/discover-extra/discover/history.vue",
      "subpackages/tools/activities/detail.vue",
      "subpackages/discover/activities/index.vue",
      "subpackages/discover/discussions/index.vue",
      "subpackages/tools/help/index.vue",
      "subpackages/profile-extra/profile/tasks.vue",
      "subpackages/chat/official-chat/index.vue",
    ];
    for (const f of files) expect(src(f).length, `${f} 读不到或为空`).toBeGreaterThan(1000);
  });
});
