import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
}));

import { useVillageStore, formatRelativeTime } from "../../stores/village";

describe("village store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchPosts
  // ------------------------------------------------------------------
  it("fetchPosts loads posts and categories from mock data", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.categories.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("fetchPosts filters by category", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-sincere" });

    expect(store.posts.every((p) => p.categoryId === "cat-sincere")).toBe(true);
    expect(store.posts.length).toBeGreaterThan(0);
  });

  it("fetchPosts filters by keyword", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ keyword: "徒步" });

    expect(
      store.posts.every(
        (p) =>
          p.title.includes("徒步") || p.content.includes("徒步")
      )
    ).toBe(true);
  });

  it("fetchPosts sorts by hot (likes descending)", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ sortBy: "hot" });

    // 修复（严格模式 noUncheckedIndexedAccess）：store.posts[i - 1] / [i] 索引访问返回 T | undefined，
    // 循环边界 i < length 已确保不越界，此处使用非空断言 ! 简化类型。
    for (let i = 1; i < store.posts.length; i++) {
      expect(store.posts[i - 1]!.likes).toBeGreaterThanOrEqual(
        store.posts[i]!.likes
      );
    }
  });

  // ------------------------------------------------------------------
  // Phase Feedback4：三 Tab 过滤语义
  // ------------------------------------------------------------------
  it("fetchPosts with cat-following returns only followed posts", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-following" });

    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.posts.every((p) => p.isFollowed)).toBe(true);
  });

  it("fetchPosts with cat-samecity filters by city", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-samecity", city: "南京" });

    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.posts.every((p) => p.city === "南京")).toBe(true);
  });

  it("fetchPosts with cat-samecity and no city returns all posts (fallback)", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-samecity" });

    // 未选城市时兜底展示全部，避免同城 Tab 空态
    expect(store.posts.length).toBeGreaterThan(0);
  });

  it("fetchPosts with cat-discover alumni sub-tab returns only alumni posts", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-discover", discoverSub: "alumni" });

    expect(store.posts.length).toBeGreaterThan(0);
    expect(store.posts.every((p) => p.isAlumni)).toBe(true);
  });

  it("fetchPosts with cat-discover buddy sub-tab returns only buddy posts", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-discover", discoverSub: "buddy" });

    expect(store.posts.length).toBeGreaterThan(0);
    expect(
      store.posts.every(
        (p) =>
          (p.buddyTags && p.buddyTags.length > 0) ||
          p.tags.some((tag) => tag.includes("搭子"))
      )
    ).toBe(true);
  });

  it("fetchPosts with cat-discover all sub-tab returns all posts", async () => {
    const store = useVillageStore();
    await store.fetchPosts({ categoryId: "cat-discover", discoverSub: "all" });

    expect(store.posts.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  // createPost – success
  // ------------------------------------------------------------------
  it("createPost adds a new post to the top of the list", async () => {
    const store = useVillageStore();
    await store.fetchPosts();
    const beforeCount = store.posts.length;

    const newPost = await store.createPost({
      categoryId: "cat-interest",
      title: "测试帖子",
      content: "这是一条测试帖子的内容",
      tags: ["#测试"],
    });

    expect(store.posts.length).toBe(beforeCount + 1);
    // 修复（严格模式 noUncheckedIndexedAccess）：store.posts[0] 索引访问返回 T | undefined，
    // 前面 length 断言已确保非空，此处使用非空断言 ! 简化类型。
    expect(store.posts[0]!.id).toBe(newPost.id);
    expect(store.posts[0]!.content).toBe("这是一条测试帖子的内容");
    expect(store.posts[0]!.likes).toBe(0);
    expect(store.posts[0]!.comments).toBe(0);
  });

  // ------------------------------------------------------------------
  // createPost – empty content check
  // ------------------------------------------------------------------
  it("createPost throws when content is empty", async () => {
    const store = useVillageStore();

    await expect(
      store.createPost({
        categoryId: "cat-interest",
        title: "",
        content: "",
      })
    ).rejects.toThrow("帖子内容不能为空");
  });

  // ------------------------------------------------------------------
  // createPost – content length check
  // ------------------------------------------------------------------
  it("createPost throws when content exceeds max length", async () => {
    const store = useVillageStore();

    const tooLong = "a".repeat(501);
    await expect(
      store.createPost({
        categoryId: "cat-interest",
        title: "",
        content: tooLong,
      })
    ).rejects.toThrow("帖子内容不能超过500字");
  });

  // ------------------------------------------------------------------
  // createPost – image count limit
  // ------------------------------------------------------------------
  it("createPost throws when images exceed max count", async () => {
    const store = useVillageStore();

    const tooManyImages = Array.from({ length: 10 }, (_, i) => `img-${i}`);
    await expect(
      store.createPost({
        categoryId: "cat-interest",
        title: "",
        content: "有效内容",
        images: tooManyImages,
      })
    ).rejects.toThrow("图片数量不能超过9张");
  });

  // ------------------------------------------------------------------
  // createPost – missing category
  // ------------------------------------------------------------------
  it("createPost throws when categoryId is empty", async () => {
    const store = useVillageStore();

    await expect(
      store.createPost({
        categoryId: "",
        title: "",
        content: "有效内容",
      })
    ).rejects.toThrow("请选择帖子分类");
  });

  // ------------------------------------------------------------------
  // likePost – toggle behavior
  // ------------------------------------------------------------------
  it("likePost toggles isLiked and increments/decrements likes", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    // 修复（严格模式 noUncheckedIndexedAccess）：store.posts[0] 索引访问返回 T | undefined，
    // 测试场景已通过 fetchPosts 加载非空数据，此处使用非空断言 ! 简化类型。
    const post = store.posts[0]!;
    const initialLikes = post.likes;
    const initialIsLiked = post.isLiked;

    // first call: toggle
    await store.likePost(post.id);
    const toggledPost = store.posts.find((p) => p.id === post.id)!;
    expect(toggledPost.isLiked).toBe(!initialIsLiked);
    expect(toggledPost.likes).toBe(
      initialIsLiked ? initialLikes - 1 : initialLikes + 1
    );

    // second call: toggle back
    await store.likePost(post.id);
    const revertedPost = store.posts.find((p) => p.id === post.id)!;
    expect(revertedPost.isLiked).toBe(initialIsLiked);
    expect(revertedPost.likes).toBe(initialLikes);
  });

  it("likePost throws when postId is empty", async () => {
    const store = useVillageStore();
    await expect(store.likePost("")).rejects.toThrow("帖子 ID 无效");
  });

  it("likePost throws when post does not exist", async () => {
    const store = useVillageStore();
    await store.fetchPosts();
    await expect(store.likePost("nonexistent-post")).rejects.toThrow(
      "帖子不存在"
    );
  });

  // ------------------------------------------------------------------
  // commentPost – success
  // ------------------------------------------------------------------
  it("commentPost adds a comment and increments post comment count", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    // 修复（严格模式 noUncheckedIndexedAccess）：store.posts[0] 同上，使用非空断言 !。
    const post = store.posts[0]!;
    const initialCommentCount = post.comments;
    const initialCommentsLength = store.comments.length;

    const newComment = await store.commentPost(post.id, "测试评论内容");
    expect(newComment).toBeDefined();
    expect(store.comments.length).toBe(initialCommentsLength + 1);
    expect(store.posts.find((p) => p.id === post.id)!.comments).toBe(
      initialCommentCount + 1
    );
  });

  // ------------------------------------------------------------------
  // commentPost – empty content check
  // ------------------------------------------------------------------
  it("commentPost throws when content is empty", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    await expect(
      store.commentPost(store.posts[0]!.id, "")
    ).rejects.toThrow("评论内容不能为空");
  });

  it("commentPost throws when content is whitespace only", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    await expect(
      store.commentPost(store.posts[0]!.id, "   ")
    ).rejects.toThrow("评论内容不能为空");
  });

  // ------------------------------------------------------------------
  // fetchComments
  // ------------------------------------------------------------------
  it("fetchComments only returns comments for the given post", async () => {
    const store = useVillageStore();
    await store.fetchComments("post-1");

    expect(store.comments.length).toBeGreaterThan(0);
    expect(store.comments.every((c) => c.postId === "post-1")).toBe(true);
  });

  // ------------------------------------------------------------------
  // filteredPosts getter
  // ------------------------------------------------------------------
  it("filteredPosts returns all posts when no filters provided", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    const result = store.filteredPosts();
    expect(result.length).toBe(store.posts.length);
  });

  it("filteredPosts filters by category", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    const result = store.filteredPosts({ categoryId: "cat-mask" });
    expect(result.every((p) => p.categoryId === "cat-mask")).toBe(true);
  });

  it("filteredPosts excludes cat-all filter", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    const result = store.filteredPosts({ categoryId: "cat-all" });
    expect(result.length).toBe(store.posts.length);
  });

  it("filteredPosts filters by keyword", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    const result = store.filteredPosts({ keyword: "火锅" });
    expect(
      result.every(
        (p) =>
          p.title.includes("火锅") || p.content.includes("火锅")
      )
    ).toBe(true);
  });

  it("filteredPosts sorts by hot descending", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    const result = store.filteredPosts({ sortBy: "hot" });
    // 修复（严格模式 noUncheckedIndexedAccess）：result[i - 1] / [i] 索引访问返回 T | undefined，
    // 循环边界 i < length 已确保不越界，此处使用非空断言 ! 简化类型。
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.likes).toBeGreaterThanOrEqual(result[i]!.likes);
    }
  });

  // ------------------------------------------------------------------
  // followUser
  // ------------------------------------------------------------------
  it("followUser toggles isFollowed flag by userId", async () => {
    const store = useVillageStore();
    await store.fetchPosts();

    // 修复（严格模式 noUncheckedIndexedAccess）：store.posts[0] 索引访问返回 T | undefined，
    // 测试场景已通过 fetchPosts 加载非空数据，此处使用非空断言 ! 简化类型。
    const post = store.posts[0]!;
    const userId = post.author.userId;
    const initialFollowed = post.isFollowed;

    await store.followUser(userId);
    expect(store.posts.find((p) => p.author.userId === userId)!.isFollowed).toBe(
      !initialFollowed
    );

    await store.followUser(userId);
    expect(store.posts.find((p) => p.author.userId === userId)!.isFollowed).toBe(
      initialFollowed
    );
  });

  // ------------------------------------------------------------------
  // formatRelativeTime utility
  // ------------------------------------------------------------------
  it("formatRelativeTime returns 刚刚活跃 for recent timestamps", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("刚刚活跃");
  });
});