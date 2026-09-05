<script setup lang="ts">
/**
 * ECharts 柱状趋势图封装（W2 决策：图表库锁定 ECharts）。
 *
 * - 按需引入（core + BarChart + Grid/Tooltip + CanvasRenderer），控制 bundle；
 * - 配色全部取自 admin-tokens 令牌纪律：柱 #0064e0（cobalt 主色）、
 *   网格线 #f1f4f7（bg-page）、轴文字 #8595a4（text-tertiary）；
 * - ResizeObserver 跟随容器自适应，卸载时 dispose 防内存泄漏；
 * - data 为空时由父级渲染 EmptyState，本组件仅负责有数据渲染。
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface TrendPoint {
  date: string;
  count: number;
}

const props = defineProps<{
  /** 趋势数据（date 为 YYYY-MM-DD，count 为当日数值） */
  data: TrendPoint[];
  /** 图表 aria 描述（无障碍） */
  ariaLabel?: string;
}>();

const chartEl = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function renderChart(): void {
  if (!chartEl.value || !chart) return;
  chart.setOption({
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(0, 100, 224, 0.06)" } },
      backgroundColor: "#ffffff",
      borderColor: "#dee3e9",
      textStyle: { color: "#1c1e21", fontSize: 12 },
    },
    xAxis: {
      type: "category",
      data: props.data.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: "#dee3e9" } },
      axisTick: { show: false },
      axisLabel: { color: "#8595a4", fontSize: 12, interval: Math.max(Math.floor(props.data.length / 6) - 1, 0) },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f1f4f7" } },
      axisLabel: { color: "#8595a4", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        data: props.data.map((d) => d.count),
        barMaxWidth: 28,
        itemStyle: { color: "#0064e0", borderRadius: [2, 2, 0, 0] },
      },
    ],
  });
}

onMounted(() => {
  if (!chartEl.value) return;
  chart = echarts.init(chartEl.value);
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartEl.value);
});

watch(
  () => props.data,
  () => renderChart(),
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div
    ref="chartEl"
    class="trend-chart"
    role="img"
    :aria-label="ariaLabel"
  />
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 260px;
}
</style>
