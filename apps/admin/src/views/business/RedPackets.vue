<script setup lang="ts">
/**
 * Admin v2 VIP 红包管理视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - 分页列表：红包 ID / 发送者 ID / 总金额（分转元）/ 总个数 / 已领取 / 剩余个数 /
 *   已领金额（分转元）/ 状态 / 创建时间
 * - 筛选：状态（PENDING/EXPIRED/DEPLETED）下拉 + 创建时间范围（createdAtFrom/To）+ 分页
 *
 * 对应后端 com.campuslove.api.admin.AdminVipController：
 *   - GET /api/v1/admin/business/vip/red-packets
 * 金额单位：分（totalAmount/claimedAmount），展示时转元。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  listRedPackets,
  type VipRedPacketView,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";
import { DEFAULT_PAGE_SIZE } from "../../utils/constants";

/** 红包列表数据 */
const packets = ref<VipRedPacketView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 错误信息 */
const errorMsg = ref("");

/** 状态筛选（空串=全部） */
const statusFilter = ref("");
/** 创建起始时间 */
const createdAtFrom = ref("");
/** 创建结束时间 */
const createdAtTo = ref("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

// 请求竞态防护
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 红包状态选项 */
const STATUS_OPTIONS = [
  { value: "PENDING", label: "待领取" },
  { value: "EXPIRED", label: "已过期" },
  { value: "DEPLETED", label: "已抢完" },
];

/** 状态文案 */
function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((o) => o.value === status);
  return found ? found.label : status;
}

/** 状态徽章 class 后缀 */
function statusBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "status-pending";
    case "EXPIRED":
      return "status-expired";
    case "DEPLETED":
      return "status-depleted";
    default:
      return "status-unknown";
  }
}

/** 红包类型文案 */
function typeLabel(type: string): string {
  return type === "LUCKY" ? "拼手气" : "普通";
}

/** 分转元展示（保留两位小数） */
function formatYuan(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return (cents / 100).toFixed(2);
}

/** 剩余个数 = 总个数 - 已领取个数 */
function remainingCount(packet: VipRedPacketView): number {
  return packet.totalCount - packet.claimedCount;
}

/**
 * 拉取红包列表。
 */
async function fetchPackets() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listRedPackets({
      status: statusFilter.value || undefined,
      createdAtFrom: createdAtFrom.value || undefined,
      createdAtTo: createdAtTo.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== reqSeq) return;
    packets.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载红包记录失败";
    packets.value = [];
    total.value = 0;
    totalPages.value = 1;
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
    }
  }
}

/** 查询（防抖） */
function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    page.value = 1;
    fetchPackets();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchPackets();
}

/** 重置筛选并刷新 */
function handleReset() {
  statusFilter.value = "";
  createdAtFrom.value = "";
  createdAtTo.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchPackets();
}

onMounted(() => {
  fetchPackets();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});
</script>

<template>
  <view class="red-packets-page">
    <view class="page-header">
      <text class="page-title">红包管理</text>
      <text class="page-subtitle">查询 VIP 用户发布的红包记录与领取情况</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <select v-model="statusFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部状态</option>
        <option v-for="o in STATUS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-model="createdAtFrom" class="search-input date-input" type="date" @change="scheduleSearch" />
      <text class="range-sep">至</text>
      <input v-model="createdAtTo" class="search-input date-input" type="date" @change="scheduleSearch" />
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="ghost-button" @click="handleReset">重置</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchPackets" />

    <!-- 红包列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">红包 ID</th>
            <th scope="col">发送者 ID</th>
            <th scope="col">类型</th>
            <th scope="col">总金额（元）</th>
            <th scope="col">总个数</th>
            <th scope="col">已领取</th>
            <th scope="col">剩余个数</th>
            <th scope="col">已领金额（元）</th>
            <th scope="col">状态</th>
            <th scope="col">创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="packets.length === 0">
            <td colspan="10" class="empty-cell">暂无红包数据</td>
          </tr>
          <tr v-for="packet in packets" :key="packet.id">
            <td>{{ packet.id }}</td>
            <td>{{ packet.senderId }}</td>
            <td>{{ typeLabel(packet.type) }}</td>
            <td class="amount-cell">{{ formatYuan(packet.totalAmount) }}</td>
            <td>{{ packet.totalCount }}</td>
            <td>{{ packet.claimedCount }}</td>
            <td class="remaining-cell">{{ remainingCount(packet) }}</td>
            <td>{{ formatYuan(packet.claimedAmount) }}</td>
            <td>
              <span class="status-badge" :class="statusBadgeClass(packet.status)">
                {{ statusLabel(packet.status) }}
              </span>
            </td>
            <td class="time-cell">{{ formatDateTime(packet.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </view>

    <Pagination
      v-model:page="page"
      :total-pages="totalPages"
      :total="total"
      :disabled="loading"
      @change="handlePageChange"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.red-packets-page {
  max-width: 1400px;
}

.date-input {
  width: 140px;
}

.range-sep {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-quaternary);
}

.amount-cell {
  font-weight: 600;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.remaining-cell {
  font-weight: 600;
  color: var(--admin-color-primary);
}

.time-cell {
  color: var(--admin-color-text-quaternary);
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-pending {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-expired {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
}

.status-depleted {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.status-unknown {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
}
</style>
