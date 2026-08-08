<script setup lang="ts">
/**
 * HotTopicsSection - 圈子页「热门话题」模块（2026-08-07 设计稿）。
 *
 * 布局：模块标题「热门话题」+ 左侧主话题大卡（封面图 + #标题 + 浏览量）
 *       + 右侧 2×2 四宫格小话题卡；点击任意话题卡进入该话题的帖子列表页。
 *
 * 数据源：
 * - mock 模式：本地常量话题列表（浏览量近似）
 * - real 模式：GET /api/v1/post-tags/popular?limit=5（后端标签聚合）
 *   无封面图的话题使用品牌色渐变占位。
 *
 * mp-weixin 兼容：不使用 :hover 伪类、不使用 backdrop-filter。
 */
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { appEnv } from "../../services/env";
import { request } from "../../services/http";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";

interface HotTopic {
  tagName: string;
  /** 帖子数（前端近似展示浏览量） */
  postCount: number;
  /** 封面图 URL（空串时使用渐变占位） */
  coverUrl: string;
}

const { t } = useI18n();

const topics = ref<HotTopic[]>([]);
const loading = ref(false);

/** 主话题（列表第一项） */
const mainTopic = ref<HotTopic | null>(null);

/** 四宫格话题（列表第 2-5 项） */
const gridTopics = ref<HotTopic[]>([]);

/** 渐变占位色（按索引轮换，无封面图时使用） */
const GRADIENT_PLACEHOLDERS = [
  "linear-gradient(135deg, #3FCF8E 0%, #7CD9A6 100%)",
  "linear-gradient(135deg, #F472B6 0%, #F9A8D4 100%)",
  "linear-gradient(135deg, #FB923C 0%, #FDBA74 100%)",
  "linear-gradient(135deg, #60A5FA 0%, #93C5FD 100%)",
] as const;

/** 话题卡封面样式：有图用图，无图用渐变占位 */
function coverStyle(index: number): string {
  const topic = index === 0 ? mainTopic.value : gridTopics.value[index - 1];
  if (topic?.coverUrl) return `background-image: url('${topic.coverUrl}'); background-size: cover; background-position: center;`;
  return `background: ${GRADIENT_PLACEHOLDERS[index % GRADIENT_PLACEHOLDERS.length]};`;
}

/** 浏览量文案（如 "1.2万"） */
function formatViews(count: number): string {
  if (count >= 10000) {
    const wan = count / 10000;
    return `${wan >= 10 ? Math.round(wan) : wan.toFixed(1)}万`;
  }
  return String(count);
}

/** 进入话题帖子列表页 */
function goTagPosts(tagName: string): void {
  openAppPath(`${ROUTES.VILLAGE.TAG_POSTS}?tagName=${encodeURIComponent(tagName)}`);
}

/** 加载热门话题 */
async function loadTopics(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  try {
    if (appEnv.apiMode === "mock") {
      // Mock 模式：本地话题数据（浏览量近似）
      await new Promise((r) => setTimeout(r, 300));
      const mockTopics: HotTopic[] = [
        { tagName: "女生请回答", postCount: 12800, coverUrl: "" },
        { tagName: "校园日常", postCount: 9600, coverUrl: "" },
        { tagName: "找搭子", postCount: 8200, coverUrl: "" },
        { tagName: "表白墙", postCount: 7400, coverUrl: "" },
        { tagName: "恋爱问答", postCount: 5300, coverUrl: "" },
      ];
      topics.value = mockTopics;
    } else {
      // Real 模式：后端标签聚合接口
      const data = await request<Array<{ tagName: string; postCount: number; coverUrl: string }>>({
        url: "/post-tags/popular?limit=5",
        method: "GET",
      });
      topics.value = data.map((item) => ({
        tagName: item.tagName,
        postCount: item.postCount ?? 0,
        coverUrl: item.coverUrl ?? "",
      }));
    }
    mainTopic.value = topics.value[0] ?? null;
    gridTopics.value = topics.value.slice(1, 5);
  } catch (_error) {
    // 加载失败静默降级：不展示热门话题区（不影响帖子流）
    topics.value = [];
    mainTopic.value = null;
    gridTopics.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadTopics);

defineExpose({ loadTopics });
</script>

<template>
  <view v-if="mainTopic" class="hot-topics">
    <!-- 模块标题 -->
    <text class="hot-topics__title">{{ t('village.hotTopics') }}</text>

    <view class="hot-topics__grid">
      <!-- 左侧主话题大卡 -->
      <view
        class="hot-topics__main press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="`#${mainTopic.tagName}`"
        @tap="goTagPosts(mainTopic.tagName)"
      >
        <view class="hot-topics__main-cover" :style="coverStyle(0)">
          <view class="hot-topics__main-overlay">
            <text class="hot-topics__main-title">#{{ mainTopic.tagName }}</text>
            <text class="hot-topics__main-views">{{ formatViews(mainTopic.postCount) }} {{ t('village.hotTopicViews') }}</text>
          </view>
        </view>
      </view>

      <!-- 右侧 2×2 四宫格小话题卡 -->
      <view class="hot-topics__side">
        <view
          v-for="(topic, idx) in gridTopics" :key="topic.tagName"
          class="hot-topics__small press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="`#${topic.tagName}`"
          @tap="goTagPosts(topic.tagName)"
        >
          <view class="hot-topics__small-cover" :style="coverStyle(idx + 1)" />
          <view class="hot-topics__small-info">
            <text class="hot-topics__small-name">#{{ topic.tagName }}</text>
            <text class="hot-topics__small-views">{{ formatViews(topic.postCount) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.hot-topics {
  margin: 0 var(--sp-7) var(--sp-4);
}

.hot-topics__title {
  display: block;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: var(--sp-3);
}

.hot-topics__grid {
  display: flex;
  gap: var(--sp-3);
}

/* 主话题大卡：占左侧约 55% 高度，与右侧两行等高 */
.hot-topics__main {
  flex: 1.2;
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--s-card-soft);
}

.hot-topics__main-cover {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240rpx;
  display: flex;
  align-items: flex-end;
}

.hot-topics__main-overlay {
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  background: linear-gradient(to top, var(--c-overlay-mid, rgba(15, 23, 42, 0.55)) 0%, var(--c-gradient-mask-transparent, rgba(0, 0, 0, 0)) 100%);
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.hot-topics__main-title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-overlay-text-primary, rgba(255, 255, 255, 0.95));
}

.hot-topics__main-views {
  font-size: var(--fs-xs);
  color: var(--c-overlay-text-secondary, rgba(255, 255, 255, 0.85));
}

/* 右侧 2×2 四宫格 */
.hot-topics__side {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}

.hot-topics__small {
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  display: flex;
  flex-direction: column;
}

.hot-topics__small-cover {
  width: 100%;
  height: 72rpx;
  flex-shrink: 0;
}

.hot-topics__small-info {
  padding: var(--sp-2) var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  flex: 1;
  justify-content: center;
}

.hot-topics__small-name {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-topics__small-views {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}
</style>
