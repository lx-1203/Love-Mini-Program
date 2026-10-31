import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, compileScript } from "vue/compiler-sfc";

import zhCN from "../../i18n/locales/zh-CN";

/**
 * 村口「作者删除自己的帖子」链路契约（2026-10-31 补齐用户内容生命周期）。
 *
 * 修的产品缺陷：帖子发出去就永远删不掉——
 * - 后端：`apps/api/.../village/VillageController.java` 此前只有 create/favorite/like/
 *   comment/share，`@DeleteMapping` 仅 `/history`，没有任何删除或撤回帖子的路由；
 * - 前端：既无删除入口也不发 DELETE。
 *
 * 本文件钉三层，逐层可证伪：
 * 1. **API 层**（stores/village/api.ts 走真实实现，只在 `services/http` 的 `request` 上开孔）：
 *    必须发 `DELETE /posts/{id}`——写成 POST/PATCH 就红；
 * 2. **store 层**：成功才从 posts / nearbyPosts / selfPendingPosts / currentPost 四处摘除
 *    （漏一处就是「后端删了界面上还在」）；失败**绝不动列表**且把错误冒泡 + 写 errorMessage
 *    （乐观删除后失败不回滚 / 空 catch 吞错，都在这一层变红）；
 * 3. **页面契约**（subpackages/village/village/detail.vue 源码 + SFC 编译）：
 *    删除项只在 `isOwnPost` 时进操作菜单（举报/复制旁边，同仓既有 per-post 菜单口径）、
 *    删除有二次确认、失败必须 toast 且留在当前页、删除路径里不许出现空 catch。
 *
 * 工程约束（per project_memory）：不用 `catch {}` 空绑定、不用 import.meta.env.DEV。
 */

/** 唯一的后端出口孔：记录调用形态，并按用例切换成功/失败。 */
const requestMock = vi.hoisted(() => vi.fn());
/** useMock() 开关：同一文件里既要跑 real 档也要跑 mock 档分支。 */
const mockFlag = vi.hoisted(() => ({ value: false }));

vi.mock("../../services/http", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, request: requestMock };
});

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => mockFlag.value,
  default: () => mockFlag.value,
}));

const showToast = vi.fn();
(globalThis as any).uni = {
  showToast,
  showModal: vi.fn(async () => ({ confirm: true, cancel: false })),
  showActionSheet: vi.fn(async () => ({ tapIndex: 2 })),
  setClipboardData: vi.fn(),
};

import { useVillageStore } from "../../stores/village";

/** 最小可用的 PostItem（本用例只关心 id 是否从各列表消失） */
function postItem(id: string, authorId = "u-9") {
  return { id, author: { userId: authorId }, title: id, content: id } as any;
}

/** 把同一条帖子铺到 store 的四个承载处 */
function seedFeedWith(store: ReturnType<typeof useVillageStore>, id = "p-1") {
  store.posts = [postItem(id), postItem("p-2")];
  store.nearbyPosts = [postItem(id)];
  store.selfPendingPosts = [postItem(id)];
  store.currentPost = postItem(id);
}

describe("village store - deletePost（real 档）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockFlag.value = false;
  });

  it("发的是 DELETE /posts/{id}（不是 POST/PATCH，路径不得漏 id）", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useVillageStore();
    seedFeedWith(store);

    await store.deletePost("p-1");

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith({
      url: "/posts/p-1",
      method: "DELETE",
    });
  });

  it("删除成功后帖子从 feed、附近动态、待审缓存与详情页一并消失", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useVillageStore();
    seedFeedWith(store);

    await store.deletePost("p-1");

    expect(store.posts.map((p) => p.id)).toEqual(["p-2"]);
    expect(store.nearbyPosts).toHaveLength(0);
    expect(store.selfPendingPosts).toHaveLength(0);
    expect(store.currentPost).toBeNull();
    expect(store.errorMessage).toBeNull();
  });

  it("后端确认失败时帖子必须还在原地（不做乐观删除），且错误冒泡 + 落 errorMessage", async () => {
    requestMock.mockRejectedValue(new Error("无权删除该帖子"));
    const store = useVillageStore();
    seedFeedWith(store);

    await expect(store.deletePost("p-1")).rejects.toThrow("无权删除该帖子");

    // 删除失败后列表一字不动：用户看得见它，才谈得上重试
    expect(store.posts.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    expect(store.nearbyPosts).toHaveLength(1);
    expect(store.selfPendingPosts).toHaveLength(1);
    expect(store.currentPost?.id).toBe("p-1");
    expect(store.errorMessage).toBe("无权删除该帖子");
  });

  it("空 ID 直接拒绝，绝不发请求", async () => {
    const store = useVillageStore();
    seedFeedWith(store);

    await expect(store.deletePost("   ")).rejects.toThrow();
    expect(requestMock).not.toHaveBeenCalled();
    expect(store.posts).toHaveLength(2);
  });

  it("只删目标 id，别人的帖子与自己的其它帖子不受牵连", async () => {
    requestMock.mockResolvedValue(undefined);
    const store = useVillageStore();
    store.posts = [postItem("p-1"), postItem("p-2"), postItem("p-3")];
    store.nearbyPosts = [postItem("p-2")];
    store.selfPendingPosts = [];
    store.currentPost = postItem("p-2");

    await store.deletePost("p-1");

    expect(store.posts.map((p) => p.id)).toEqual(["p-2", "p-3"]);
    expect(store.nearbyPosts).toHaveLength(1);
    expect(store.currentPost?.id).toBe("p-2");
  });
});

describe("village store - deletePost（mock 档演示闭环）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockFlag.value = true;
  });

  it("mock 档不发 HTTP，但仍要把帖子从列表摘掉", async () => {
    const store = useVillageStore();
    seedFeedWith(store);

    await store.deletePost("p-1");

    expect(requestMock).not.toHaveBeenCalled();
    expect(store.posts.map((p) => p.id)).toEqual(["p-2"]);
    expect(store.currentPost).toBeNull();
  });
});

describe("村口详情页删除入口契约（detail.vue）", () => {
  const detailSource = readFileSync(
    resolve(__dirname, "../../subpackages/village/village/detail.vue"),
    "utf-8"
  );

  /** 取 handleDeletePost 函数体（从声明处到下一个顶层函数声明），用于逐段判点。 */
  function deleteHandlerBody(): string {
    const start = detailSource.indexOf("async function handleDeletePost");
    expect(start, "详情页必须有 handleDeletePost 删除处理函数").toBeGreaterThan(-1);
    const rest = detailSource.slice(start + 10);
    const endOffset = rest.search(/\n(?:async )?function \w+/);
    return endOffset > 0 ? detailSource.slice(start, start + 10 + endOffset) : detailSource.slice(start);
  }

  it("SFC 仍可被 Vue 编译器解析（改动没把模板/脚本改坏）", () => {
    const { descriptor, errors } = parse(detailSource);
    expect(errors).toEqual([]);
    // <script setup> 的内容落在 descriptor.scriptSetup，不在 descriptor.script：
    // 只看 .script 会让这条判点对任何 SFC 都恒红（真实删除函数在 387 行，确实存在）。
    const scriptBodies = [descriptor.script?.content ?? "", descriptor.scriptSetup?.content ?? ""].join("\n");
    expect(scriptBodies).toContain("handleDeletePost");
    // setup 脚本编译通过 = 新增的 const/await 没有语法问题
    expect(() =>
      compileScript(descriptor, { id: "village-detail-delete" })
    ).not.toThrow();
  });

  it("删除项挂在既有 per-post 菜单里，且只对作者本人出现", () => {
    // 既有菜单口径：复制 / 举报 之后追加删除（同仓点状菜单，不新开弹窗）
    const gateRe =
      /isOwnPost\.value\s*\?\s*t\(\s*"village\.detail\.deleteAction"\s*\)\s*:\s*""/u;
    expect(detailSource).toMatch(gateRe);
    const actionsIdx = detailSource.indexOf("const deleteLabel");
    const reportIdx = detailSource.indexOf('const reportLabel = t("village.detail.reportAction")');
    expect(actionsIdx).toBeGreaterThan(-1);
    expect(reportIdx).toBeGreaterThan(-1);
    // 删除项与举报在同一份 actions 列表里（不是另起一个入口）
    expect(detailSource.slice(actionsIdx, actionsIdx + 400)).toContain("actions");
  });

  it("删除前二次确认，取消则不发请求", () => {
    const body = deleteHandlerBody();
    expect(body).toContain("uni.showModal");
    expect(body).toContain('t("village.detail.deleteConfirmContent")');
    expect(body).toContain("if (!confirmed) return");
  });

  it("删除走 store，成功后回村口列表", () => {
    const body = deleteHandlerBody();
    expect(body).toContain("await villageStore.deletePost(post.id)");
    expect(body).toContain('t("village.detail.deleteSuccess")');
    expect(body).toContain("goBack()");
  });

  it("删除失败必须可见：toast 后端文案或兜底文案，且不得离开页面", () => {
    const body = deleteHandlerBody();
    const catchIdx = body.lastIndexOf("catch (error");
    expect(catchIdx, "删除调用必须有带绑定的 catch").toBeGreaterThan(-1);
    const catchBlock = body.slice(catchIdx);
    expect(catchBlock).toContain("uni.showToast");
    expect(catchBlock).toContain("villageStore.errorMessage");
    expect(catchBlock).toContain('t("village.detail.deleteFailed")');
    // 失败路径里不得出现 goBack()/navigateBack：帖子还在，页面必须留在原地可重试
    expect(catchBlock).not.toContain("goBack(");
    expect(catchBlock).not.toContain("navigateBack");
  });

  it("删除路径零空 catch（本仓反复复发的静默缺陷形态）", () => {
    expect(deleteHandlerBody()).not.toMatch(/catch\s*\{\s*\}/u);
    expect(deleteHandlerBody()).not.toMatch(/catch\s*\(\s*_?\w*\s*\)\s*\{\s*\}/u);
  });

  it("文案全部走 i18n：zh-CN 语言包里有删除相关键，且非空", () => {
    const detail = (
      zhCN as unknown as {
        village: { detail: Record<string, string> };
        storeErrors: { village: Record<string, string> };
      }
    ).village.detail;
    for (const key of [
      "deleteAction",
      "deleteConfirmTitle",
      "deleteConfirmContent",
      "deleteConfirmOk",
      "deleteConfirmCancel",
      "deleteSuccess",
      "deleteFailed",
    ]) {
      expect(detail[key], `village.detail.${key} 必须存在`).toBeTruthy();
      expect(typeof detail[key]).toBe("string");
    }
    expect(
      (
        zhCN as unknown as { storeErrors: { village: Record<string, string> } }
      ).storeErrors.village.deletePostFailed
    ).toBeTruthy();
  });

  it("源码里不硬编码删除文案（R4-batch2：UI 文案一律 t()）", () => {
    const body = deleteHandlerBody();
    expect(body).not.toContain('"确定要删除');
    expect(body).not.toContain('"删除失败');
    expect(body).not.toContain('"已删除"');
  });
});
