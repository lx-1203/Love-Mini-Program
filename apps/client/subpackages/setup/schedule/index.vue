<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import AppShell from "../../../src/components/layout/AppShell.vue";
import SectionCard from "../../../src/components/common/SectionCard.vue";
import { clientApi } from "../../../src/services/api";
import { useProfileStore } from "../../../src/stores/profile";
import { useSessionStore } from "../../../src/stores/session";
import type { components } from "../../../src/services/generated/api-types";

type ScheduleBlock = components["schemas"]["ScheduleBlock"];

const COLOR_POOL = ["#5B8FF9", "#61DDAA", "#F6BD16", "#E8684A", "#6DC8EC", "#9270CA"];

const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const userId = computed(() => sessionStore.userSession?.userId ?? "mock-user");

const weekDays = ["周一", "周二", "周三", "周四", "周五"];
const periods = Array.from({ length: 12 }, (_, i) => i + 1);

const ROW_H = 80; // rpx per period row

const selectedDay = ref(0);
const showForm = ref(false);
const editingBlockId = ref<string | null>(null);

const form = reactive({
  weekday: weekDays[0]!,
  startPeriod: 1,
  endPeriod: 2,
  courseName: "",
  location: "",
});

function pickColor(blockId: string) {
  const hash = blockId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLOR_POOL[hash % COLOR_POOL.length]!;
}

const dayBlocks = computed<ScheduleBlock[]>(() => {
  const all = profileStore.scheduleProfile?.courseBlocks ?? [];
  return all.filter((b) => b.weekday === weekDays[selectedDay.value]);
});

function parsePeriod(start: string, end: string): { s: number; e: number } {
  const sNum = parseInt(start.split(":")[0] ?? "1", 10) || 1;
  const eNum = parseInt(end.split(":")[0] ?? "2", 10) || 2;
  return { s: Math.max(1, Math.min(12, sNum)), e: Math.max(sNum, Math.min(12, eNum)) };
}

function blockStyle(block: ScheduleBlock) {
  const { s, e } = parsePeriod(block.start, block.end);
  return {
    top: `${(s - 1) * ROW_H}rpx`,
    height: `${(e - s + 1) * ROW_H}rpx`,
    backgroundColor: pickColor(block.id),
  };
}

onMounted(async () => {
  await profileStore.load();
});

function selectDay(index: number) {
  selectedDay.value = index;
}

function openAddForm() {
  editingBlockId.value = null;
  form.weekday = weekDays[selectedDay.value]!;
  form.startPeriod = 1;
  form.endPeriod = 2;
  form.courseName = "";
  form.location = "";
  showForm.value = true;
}

function openEditForm(block: ScheduleBlock) {
  editingBlockId.value = block.id;
  form.weekday = block.weekday;
  const { s, e } = parsePeriod(block.start, block.end);
  form.startPeriod = s;
  form.endPeriod = e;
  form.courseName = block.label;
  form.location = "";
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingBlockId.value = null;
}

async function saveBlock() {
  const payload = {
    weekday: form.weekday,
    start: `${String(form.startPeriod).padStart(2, "0")}:00`,
    end: `${String(form.endPeriod).padStart(2, "0")}:00`,
    label: form.courseName,
    location: form.location || null,
  };

  try {
    if (editingBlockId.value) {
      await clientApi.updateCourseBlock(userId.value, editingBlockId.value, payload);
    } else {
      await clientApi.addCourseBlock(userId.value, payload);
    }
    await profileStore.load();
    closeForm();
  } catch (_e) {
    uni.showToast({ title: "操作失败，请重试", icon: "none" });
  }
}

async function deleteBlock(blockId: string) {
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: "确认删除",
      content: "删除后不可恢复，确认删除该课程？",
      success: (r) => resolve(r.confirm),
    });
  });
  if (!res) return;

  try {
    await clientApi.deleteCourseBlock(userId.value, blockId);
    await profileStore.load();
    uni.showToast({ title: "已删除", icon: "success" });
  } catch (_e) {
    uni.showToast({ title: "删除失败，请重试", icon: "none" });
  }
}

function periodLabel(p: number) {
  if (p === 1) return "早 8:00";
  if (p === 5) return "午 12:00";
  if (p === 9) return "晚 16:00";
  return "";
}
</script>

<template>
  <AppShell title="课表编辑" subtitle="设置每周课程安排，驱动智能匹配推荐。">
    <!-- 星期选择器 -->
    <view class="week-selector">
      <view
        v-for="(day, idx) in weekDays"
        :key="day"
        class="week-tab"
        :class="{ active: selectedDay === idx }"
        @click="selectDay(idx)"
      >
        {{ day }}
      </view>
    </view>

    <!-- 时段网格 -->
    <SectionCard :title="weekDays[selectedDay] + ' 课程'" compact>
      <view v-if="dayBlocks.length === 0" class="empty-hint">
        暂无课程，点击下方 + 按钮添加
      </view>
      <view class="grid-wrap" v-else>
        <!-- 横线标记 -->
        <view class="period-column">
          <view
            v-for="p in periods"
            :key="p"
            class="period-row"
          >
            <text class="period-num">{{ p }}</text>
            <text v-if="periodLabel(p)" class="period-time">{{ periodLabel(p) }}</text>
          </view>
        </view>
        <!-- 课程块 -->
        <view class="blocks-column">
          <view
            v-for="block in dayBlocks"
            :key="block.id"
            class="block-card"
            :style="blockStyle(block)"
            @click="openEditForm(block)"
          >
            <text class="block-label">{{ block.label }}</text>
            <text class="block-period">第{{ parsePeriod(block.start, block.end).s }}-{{ parsePeriod(block.start, block.end).e }}节</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 浮动添加按钮 -->
    <view class="fab" @click="openAddForm">
      <text class="fab-text">+</text>
    </view>

    <!-- 表单蒙层 -->
    <view v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <view class="modal-card">
        <text class="modal-title">{{ editingBlockId ? "编辑课程" : "添加课程" }}</text>

        <text class="field-label">星期</text>
        <view class="day-picker">
          <view
            v-for="day in weekDays"
            :key="day"
            class="day-option"
            :class="{ selected: form.weekday === day }"
            @click="form.weekday = day"
          >{{ day }}</view>
        </view>

        <text class="field-label">起始节次</text>
        <view class="number-picker">
          <view
            v-for="n in 12"
            :key="'s'+n"
            class="num-option"
            :class="{ selected: form.startPeriod === n }"
            @click="form.startPeriod = n"
          >{{ n }}</view>
        </view>

        <text class="field-label">结束节次</text>
        <view class="number-picker">
          <view
            v-for="n in 12"
            :key="'e'+n"
            class="num-option"
            :class="{ selected: form.endPeriod === n }"
            @click="form.endPeriod = n"
          >{{ n }}</view>
        </view>

        <text class="field-label">课程名称</text>
        <input
          v-model="form.courseName"
          class="text-input"
          maxlength="20"
          placeholder="如：高等数学"
        />

        <text class="field-label">上课地点（选填）</text>
        <input
          v-model="form.location"
          class="text-input"
          maxlength="30"
          placeholder="如：教学楼A-301"
        />

        <view class="modal-actions">
          <button v-if="editingBlockId" class="btn-delete" @click="deleteBlock(editingBlockId!)">
            删除
          </button>
          <view class="action-right">
            <button class="btn-cancel" @click="closeForm">取消</button>
            <button
              class="btn-save"
              :disabled="!form.courseName.trim() || form.startPeriod > form.endPeriod"
              @click="saveBlock"
            >
              保存
            </button>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.week-selector {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  overflow-x: auto;
}

.week-tab {
  padding: 14rpx 28rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-app-page);
  white-space: nowrap;

  &.active {
    color: #fff;
    background: var(--td-brand-color-7);
  }
}

.grid-wrap {
  display: flex;
  position: relative;
  min-height: 960rpx; // 12 * 80
}

.period-column {
  width: 120rpx;
  flex-shrink: 0;
}

.period-row {
  display: flex;
  align-items: flex-start;
  height: 80rpx;
  padding: 4rpx 8rpx;
  border-bottom: 1px solid var(--td-border-level-1-color);
  box-sizing: border-box;
}

.period-num {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--td-text-color-placeholder);
}

.period-time {
  margin-left: 6rpx;
  font-size: 18rpx;
  color: var(--td-text-color-placeholder);
}

.blocks-column {
  flex: 1;
  position: relative;
}

.block-card {
  position: absolute;
  left: 8rpx;
  right: 8rpx;
  border-radius: 14rpx;
  padding: 12rpx 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4rpx;
  box-sizing: border-box;
  overflow: hidden;
}

.block-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}

.block-period {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.empty-hint {
  text-align: center;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: var(--td-text-color-placeholder);
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 120rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 999px;
  background: var(--td-brand-color-7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.18);
  z-index: 99;
}

.fab-text {
  font-size: 44rpx;
  color: #fff;
  line-height: 1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.modal-card {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 36rpx 32rpx 50rpx;
  overflow-y: auto;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 28rpx;
}

.field-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-top: 20rpx;
  margin-bottom: 10rpx;
}

.day-picker,
.number-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.day-option,
.num-option {
  padding: 10rpx 18rpx;
  border-radius: 14rpx;
  font-size: 24rpx;
  background: var(--td-bg-app-page);
  color: var(--td-text-color-secondary);

  &.selected {
    background: var(--td-brand-color-1);
    color: var(--td-brand-color-7);
    font-weight: 600;
  }
}

.text-input {
  width: 100%;
  height: 80rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background: var(--td-bg-app-page);
  font-size: 26rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 36rpx;
}

.action-right {
  display: flex;
  gap: 16rpx;
  margin-left: auto;
}

.btn-cancel,
.btn-save,
.btn-delete {
  border: 0;
  border-radius: 18rpx;
  padding: 18rpx 32rpx;
  font-size: 26rpx;
  font-weight: 600;
}

.btn-cancel {
  background: var(--td-bg-app-page);
  color: var(--td-text-color-secondary);
}

.btn-save {
  background: var(--td-brand-color-7);
  color: #fff;

  &[disabled] {
    opacity: 0.4;
  }
}

.btn-delete {
  background: #fff;
  color: #e34d59;
  border: 1px solid #e34d59;
}
</style>