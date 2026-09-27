import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse, compileTemplate } from "vue/compiler-sfc";

/**
 * 村口页（subpackages/village/village/index）契约测试：
 * - MP-R2-VILLAGE-INDEX-012：兴趣圈精选话题失败渲染提示条 + 重试（穿透 TTL 重跑
 *   loadChannelData）；活动列表补空态 EmptyState（失败不得伪装成空态）。
 * - MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001：帖子标签配色与详情页一致，
 *   统一单色绿（奇偶粉绿分支已删）。
 */

const indexSource = readFileSync(
  resolve(__dirname, "../../subpackages/village/village/index.vue"),
  "utf-8"
);
const postCardSource = readFileSync(
  resolve(__dirname, "../../components/village/PostCard.vue"),
  "utf-8"
);
const detailSource = readFileSync(
  resolve(__dirname, "../../subpackages/village/village/detail.vue"),
  "utf-8"
);

function templateBlock(source: string): string {
  const { descriptor } = parse(source);
  return descriptor.template?.content ?? "";
}

describe("村口页模板可编译", () => {
  it("index.vue 模板通过 Vue 编译器（v-if/v-else-if 链合法）", () => {
    const { descriptor } = parse(indexSource);
    const result = compileTemplate({
      id: "village-index",
      filename: "index.vue",
      source: descriptor.template?.content ?? "",
    });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain("circleErrorMessage");
  });
});

describe("村口页兴趣圈精选话题失败态（MP-R2-VILLAGE-INDEX-012）", () => {
  const template = templateBlock(indexSource);

  it("circle store 错误文案进模板（不复用 villageStore.errorMessage）", () => {
    expect(indexSource).toContain("errorMessage: circleErrorMessage");
    expect(template).toContain('v-else-if="circleErrorMessage"');
    expect(template).toContain("{{ circleErrorMessage }}");
  });

  it("提示条挂在精选列表之后，重试走 onRefresh → loadChannelData(force=true)", () => {
    const listAt = template.indexOf('v-if="currentTopics.length > 0"');
    const barAt = template.indexOf('v-else-if="circleErrorMessage"');
    expect(listAt).toBeGreaterThan(-1);
    expect(barAt).toBeGreaterThan(listAt);
    const bar = template.slice(barAt, barAt + 700);
    expect(bar).toContain("@tap=\"onRefresh\"");
    expect(bar).toContain("t('common.retry')");
    expect(indexSource).toContain("await loadChannelData(currentChannelId.value, true)");
  });
});

describe("村口页活动频道空态（MP-R2-VILLAGE-INDEX-012）", () => {
  const template = templateBlock(indexSource);

  it("活动卡列表有 v-if，EmptyState 以 v-else-if 兜底且排除加载中/失败", () => {
    expect(template).toContain('v-if="activities.length > 0"');
    const emptyAt = template.indexOf(
      'v-else-if="!activityStore.loading && !activityStore.errorMessage"'
    );
    expect(emptyAt).toBeGreaterThan(-1);
    expect(template.slice(emptyAt - 60, emptyAt + 200)).toContain("<EmptyState");
    expect(template.slice(emptyAt, emptyAt + 200)).toContain("nearby.activitiesEmpty");
  });
});

describe("村口页标签配色与详情页一致（MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001）", () => {
  it("PostCard 渲染函数中标签恒为单色绿，无奇偶索引/粉色分支", () => {
    // 模板注释（修复说明引用原 tagIdx 配色）编译成 comment VNode 会污染渲染码，先剥离
    const { descriptor } = parse(postCardSource);
    const result = compileTemplate({
      id: "post-card",
      filename: "PostCard.vue",
      source: (descriptor.template?.content ?? "").replace(/<!--[\s\S]*?-->/g, ""),
    });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain("post-card__tag post-card__tag--green");
    expect(result.code).not.toContain("tagIdx");
    expect(result.code).not.toContain("pink");
  });

  it("详情页标签同为单色绿（无粉色分支）", () => {
    const detailTemplate = templateBlock(detailSource);
    expect(detailTemplate).toContain('class="post-tag press-feedback"');
    expect(detailTemplate).not.toContain("pink");
    expect(detailSource).toContain("color: $green-primary;");
  });
});
