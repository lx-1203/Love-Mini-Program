<script setup lang="ts">
/**
 * 虚拟滚动列表组件。
 *
 * 设计目标：
 * - 基于uni-app <scroll-view> 实现定高虚拟滚动，兼容 H5 与 mp-weixin 双端；
 * - 通过监听 scroll-view 的 scroll 事件计算可见区间，仅渲染可见项 + 上下各 3 项缓冲，
 *   大幅减少 DOM 节点数量，提升长列表性能（如村口帖子流、喜欢列表）。
 *
 * 兼容性说明（mp-weixin）：
 * - 不使用 :hover 伪类（mp-weixin 不支持）；
 * - 不使用 * 通配符选择器、:nth-child(n+X) 等复杂选择器（WXSS 支持有限）；
 * - transform 使用 translate3d 触发 GPU 加速，避免在低端机上卡顿；
 * - scroll-view 为 mp-weixin 原生组件，scroll 事件返回 detail.scrollTop 可靠。
 *
 * 使用方式：
 *   <VirtualList
 *     :items="posts"
 *     :item-height="120"
 *     :height="600"
 *     key-field="id"
 *     @scrolltolower="loadMore"
 *     @scrolltoupper="refresh"
 *   >
 *     <template #default="{ item, index }">
 *       <view>{{ item.title }} ({{ index }})</view>
 *     </template>
 *   </VirtualList>
 */
import { ref, computed } from "vue";

/* ============================================================
 * Props 定义
 * ============================================================ */

/** 列表项类型：宽松约束为带任意属性的对象，调用方通过插槽消费具体字段 */
type VirtualListItem = Record<string, unknown>;

interface Props {
  /** 列表数据源 */
  items: VirtualListItem[];
  /** 单项高度（px），定高虚拟滚动依赖此值计算可见区间 */
  itemHeight: number;
  /** 容器可视高度（px），用于计算可见项数量 */
  height: number;
  /** 主键字段名，用于 v-for key 优化；默认 'id' */
  keyField?: string;
  /** 触底距离阈值（px），距底部小于该值时触发 scrolltolower 事件；默认 50 */
  lowerThreshold?: number;
  /** 触顶距离阈值（px），距顶部小于该值时触发 scrolltoupper 事件；默认 0 */
  upperThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  keyField: "id",
  lowerThreshold: 50,
  upperThreshold: 0,
});

/* ============================================================
 * Emits 定义
 * ============================================================ */

const emit = defineEmits<{
  /** 滚动到底部时触发，用于加载更多 */
  (e: "scrolltolower"): void;
  /** 滚动到顶部时触发，用于下拉刷新 */
  (e: "scrolltoupper"): void;
}>();

/* ============================================================
 * 虚拟滚动核心逻辑
 * ============================================================ */

/** 当前 scroll-view 的 scrollTop（px），由 scroll 事件实时更新 */
const scrollTop = ref<number>(0);

/** 上下缓冲项数：在可见区间外多渲染 3 项，避免快速滚动时出现白屏 */
const BUFFER_COUNT = 3;

/**
 * 可见区间起始索引（含缓冲）。
 * 计算：当前 scrollTop 对应的项索引 - BUFFER_COUNT，下限 0。
 */
const startIndex = computed<number>(() => {
  const rawStart = Math.floor(scrollTop.value / props.itemHeight) - BUFFER_COUNT;
  return Math.max(0, rawStart);
});

/**
 * 可见区间结束索引（含缓冲）。
 * 计算：当前 scrollTop 对应的项索引 + 可见项数 + BUFFER_COUNT，上限 items.length。
 */
const endIndex = computed<number>(() => {
  const visibleCount = Math.ceil(props.height / props.itemHeight);
  const currentIndex = Math.floor(scrollTop.value / props.itemHeight);
  const rawEnd = currentIndex + visibleCount + BUFFER_COUNT;
  return Math.min(props.items.length, rawEnd);
});

/** 实际渲染的可见项切片（含缓冲） */
const visibleItems = computed<VirtualListItem[]>(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

/** 可见项在原数组中的起始索引（用于在插槽中传递正确的 index） */
const startOffset = computed<number>(() => startIndex.value);

/**
 * 可见区块的垂直偏移量（px）。
 * 通过 transform translateY 将可见项整体下移到正确位置，
 * 占位空白区由内部 padding-top 撑开，确保滚动条与实际滚动位置匹配。
 */
const offsetY = computed<number>(() => {
  return startIndex.value * props.itemHeight;
});

/**
 * 列表总高度（px）。
 * 通过在 scroll-view 内部设置一个等高占位容器，使 scroll-view 拥有正确的滚动范围。
 */
const totalHeight = computed<number>(() => {
  return props.items.length * props.itemHeight;
});

/**
 * 容器样式：固定高度 + 隐藏滚动条（H5 端通过 ::-webkit-scrollbar 隐藏）。
 * mp-weixin 端 scroll-view 默认不显示滚动条，无需额外处理。
 */
const containerStyle = computed<string>(() => {
  return `height: ${props.height}px;`;
});

/**
 * 获取列表项的唯一 key。
 * 若配置的 keyField 在 item 上不存在，则回退到 index，避免 Vue 警告。
 *
 * @param item    列表项数据
 * @param index   在 visibleItems 中的相对索引
 * @returns 用于 v-for key 的值
 */
function getItemKey(item: VirtualListItem, index: number): string | number {
  const val = item[props.keyField];
  if (val !== undefined && val !== null) {
    return val as string | number;
  }
  // 回退到全局唯一索引（startOffset + 相对索引），保证 key 稳定
  return startOffset.value + index;
}

/* ============================================================
 * 滚动事件处理
 * ============================================================ */

/**
 * scroll-view 的 scroll 事件类型（结构化类型，兼容 H5 与 mp-weixin）。
 * detail.scrollTop: 垂直滚动位置
 * detail.scrollHeight: 滚动内容总高度
 * detail.deltaY: 垂直滚动增量（mp-weixin 支持）
 */
interface ScrollViewScrollEvent {
  detail: {
    scrollTop: number;
    scrollLeft?: number;
    scrollHeight: number;
    scrollWidth?: number;
    deltaX?: number;
    deltaY?: number;
  };
}

/**
 * 处理 scroll-view 的 scroll 事件。
 *
 * 行为：
 * 1. 更新 scrollTop 响应式变量，触发可见区间重新计算；
 * 2. 距底部小于 lowerThreshold 时触发 scrolltolower 事件；
 * 3. 距顶部小于等于 upperThreshold 时触发 scrolltoupper 事件。
 *
 * 注意：scroll 事件触发频率较高，computed 缓存可避免重复计算可见区间。
 *
 * @param e scroll 事件对象
 */
function onScroll(e: ScrollViewScrollEvent): void {
  const { scrollTop: st, scrollHeight } = e.detail;
  scrollTop.value = st;

  // 触底判断：内容总高度 - 当前滚动位置 - 容器高度 < 阈值
  // 容器高度通过 props.height 获取（与 scroll-view 实际高度一致）
  if (scrollHeight - st - props.height < props.lowerThreshold) {
    emit("scrolltolower");
  }

  // 触顶判断：scrollTop 小于等于阈值时触发
  if (st <= props.upperThreshold) {
    emit("scrolltoupper");
  }
}
</script>

<template>
  <!--
    虚拟滚动容器：
    - scroll-view 提供原生滚动能力（H5 渲染为 div，mp-weixin 渲染为原生组件）；
    - :scroll-y="true" 启用纵向滚动；
    - @scroll 监听滚动事件，实时更新 scrollTop；
    - 容器高度通过 props.height 设置，确保可见项数量计算正确。
  -->
  <scroll-view
    class="virtual-list"
    :style="containerStyle"
    :scroll-y="true"
    :scroll-with-animation="false"
    @scroll="onScroll"
  >
    <!--
      占位容器：高度等于列表总高度，撑开 scroll-view 的可滚动范围。
      内部使用绝对定位 + transform 偏移可见项，避免 DOM 顺序与渲染位置耦合。
    -->
    <view class="virtual-list__phantom" :style="{ height: totalHeight + 'px' }">
      <!--
        可见项容器：通过 transform translateY 偏移到正确位置。
        translate3d 触发 GPU 加速，在 mp-weixin 低端机上滚动更流畅。
      -->
      <view
        class="virtual-list__visible"
        :style="{ transform: `translate3d(0, ${offsetY}px, 0)` }"
      >
        <!--
          遍历可见项，通过 #default 插槽将 item 与全局 index 传递给消费者。
          key 优先使用 keyField 对应的值，缺失时回退到全局索引。
        -->
        <view
          v-for="(item, idx) in visibleItems"
          :key="getItemKey(item, idx)"
          class="virtual-list__item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item" :index="startOffset + idx" />
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
/* 虚拟滚动容器：占满父级宽度，高度由 inline style 控制 */
.virtual-list {
  width: 100%;
  position: relative;
  /* 隐藏 H5 端滚动条，与 mp-weixin 默认行为保持一致 */
  overflow: hidden;
}

/* 占位容器：撑开可滚动范围，绝对定位避免影响布局流 */
.virtual-list__phantom {
  position: relative;
  width: 100%;
}

/* 可见项容器：通过 transform 偏移定位，开启 GPU 加速 */
.virtual-list__visible {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  will-change: transform;
}

/* 单项容器：定高，避免高度计算偏差导致可见区间错位 */
.virtual-list__item {
  width: 100%;
  box-sizing: border-box;
}
</style>
