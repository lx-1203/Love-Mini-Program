<script setup lang="ts">
/**
 * Admin v2 VIP 套餐只读说明页（商业模式「商业运营」域）。
 *
 * 数据来源说明：
 * 经检索后端代码（apps/api/src/main/java/com/campuslove/api），当前「套餐配置」以
 * 客户端 VIP 配置驱动，<b>不存在套餐列表管理端点</b>：
 * - VIP 相关端点仅：GET /api/v1/vip/bills（客户端账单）、POST /api/v1/vip/auto-renew（自动续费）、
 *   POST /api/v1/vip/promo-codes/validate|redeem（兑换码）、POST /api/v1/vip/red-packets（红包）
 * - 账单实体 VipBill.planId 仅存套餐标识（monthly/quarterly/yearly），无套餐价格表实体
 *
 * 因此本页不做接口请求，仅展示套餐结构与配置方式的静态说明，供运营参考；
 * 待后端补充套餐管理端点（如 GET/PUT /api/v1/admin/business/vip/plans）后，
 * 可在此页接入真实数据。
 *
 * 套餐定价/配置（示例占位，实际以客户端 vipConfig 为准）：
 * - 月度套餐 monthly：约 ¥18/月
 * - 季度套餐 quarterly：约 ¥45/季
 * - 年度套餐 yearly：约 ¥128/年
 */

/** 套餐说明行 */
interface PlanInfo {
  /** 套餐 ID（对应 VipBill.planId） */
  id: string;
  /** 套餐名称 */
  name: string;
  /** 参考价格（示例值） */
  price: string;
  /** 权益说明 */
  benefits: string;
}

/** 套餐说明数据（占位说明，非接口数据） */
const plans: PlanInfo[] = [
  {
    id: "monthly",
    name: "月度套餐",
    price: "约 ¥18 / 月",
    benefits: "解锁全部高级功能，月付灵活",
  },
  {
    id: "quarterly",
    name: "季度套餐",
    price: "约 ¥45 / 季",
    benefits: "月度价格基础上享折扣，更适合长期体验",
  },
  {
    id: "yearly",
    name: "年度套餐",
    price: "约 ¥128 / 年",
    benefits: "性价比最高，含全部 VIP 权益",
  },
];

/** 配置方式说明列表 */
const configNotes: string[] = [
  "套餐由客户端 VIP 配置驱动（定价、周期、权益），后端账单仅记录 planId 冗余字段",
  "账单金额以「分」为单位存储，本页展示为参考人民币金额",
  "套餐变更 / 新增套餐需修改客户端 vip 配置，并确保账单侧 planId 保持一致",
  "支持自动续费（POST /api/v1/vip/auto-renew），由用户主动开启",
  "运营发放的兑换码（优惠码管理）可抵扣套餐金额：AMOUNT 满减 / PERCENT 百分比折扣",
];
</script>

<template>
  <view class="vip-plans-page">
    <view class="page-header">
      <text class="page-title">VIP 套餐</text>
      <text class="page-subtitle">套餐结构说明（只读，套餐由客户端 VIP 配置驱动）</text>
    </view>

    <!-- 功能状态说明：VIP 会员暂缓上线 -->
    <view class="planned-notice" role="status">
      <text class="planned-notice-text">
        该功能规划中，VIP 会员暂缓上线；当前页面仅展示套餐结构占位说明，不做任何接口请求。
      </text>
    </view>

    <!-- 数据来源说明 -->
    <view class="notice-box">
      <text class="notice-title">数据来源说明</text>
      <text class="notice-text">
        当前后端未提供套餐列表管理端点（无 GET /api/v1/vip/plans 或类似接口），
        套餐由客户端 VIP 配置驱动，此处展示为占位说明页；待后端补充套餐管理端点后可接入真实数据。
      </text>
    </view>

    <!-- 套餐列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">套餐 ID</th>
            <th scope="col">套餐名称</th>
            <th scope="col">参考价格</th>
            <th scope="col">权益说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in plans" :key="plan.id">
            <td class="key-cell">{{ plan.id }}</td>
            <td class="plan-name">{{ plan.name }}</td>
            <td class="price-cell">{{ plan.price }}</td>
            <td>{{ plan.benefits }}</td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 配置方式说明 -->
    <view class="config-section">
      <text class="section-title">配置方式说明</text>
      <view v-for="(note, idx) in configNotes" :key="idx" class="note-item">
        <text class="note-index">{{ idx + 1 }}</text>
        <text class="note-text">{{ note }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.vip-plans-page {
  max-width: 1000px;
}

.planned-notice {
  background: var(--admin-color-warning-soft);
  border-left: 3px solid var(--admin-color-warning);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
}

.planned-notice-text {
  font-size: var(--admin-font-md);
  color: var(--admin-color-warning);
  line-height: 1.6;
}

.notice-box {
  background: var(--admin-color-info-soft);
  border-left: 3px solid var(--admin-color-info);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg);
  margin-bottom: var(--admin-space-xxl);
}

.notice-title {
  display: block;
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-info);
  margin-bottom: var(--admin-space-xs);
}

.notice-text {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  line-height: 1.6;
}

.key-cell {
  font-weight: 500;
  color: var(--admin-color-text-primary);
  white-space: nowrap;
}

.plan-name {
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.price-cell {
  font-weight: 600;
  color: var(--admin-color-danger);
  white-space: nowrap;
}

.config-section {
  margin-top: var(--admin-space-xxxl);
}

.section-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-lg);
}

.note-item {
  display: flex;
  gap: var(--admin-space-md);
  padding: var(--admin-space-md) 0;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.note-index {
  flex-shrink: 0;
  width: var(--admin-space-xxl);
  height: var(--admin-space-xxl);
  border-radius: 50%;
  background: var(--admin-color-primary-soft);
  color: var(--admin-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--admin-font-md);
  font-weight: 600;
}

.note-text {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  line-height: 1.6;
}
</style>
