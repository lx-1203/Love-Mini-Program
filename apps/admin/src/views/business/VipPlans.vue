<script setup lang="ts">
/**
 * Admin v2 VIP 套餐只读说明页（商业模式「商业运营」域）。
 *
 * 数据来源说明：
 * 经检索后端代码（apps/api/src/main/java/com/campuslove/api），当前「套餐配置」以
 * 客户端 VIP 配置驱动，<b>不存在套餐列表管理端点</b>：
 * - VIP 相关端点仅：GET /api/v1/vip/bills（客户端账单）、POST /api/v1/vip/auto-renew（自动续费）、
 *   POST /api/v1/vip/promo-codes/validate|redeem（兑换码）
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
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
const plans = computed<PlanInfo[]>(() => [
  {
    id: "monthly",
    name: t("vipPlans.planMonthly"),
    price: t("vipPlans.priceMonthly"),
    benefits: t("vipPlans.benefitsMonthly"),
  },
  {
    id: "quarterly",
    name: t("vipPlans.planQuarterly"),
    price: t("vipPlans.priceQuarterly"),
    benefits: t("vipPlans.benefitsQuarterly"),
  },
  {
    id: "yearly",
    name: t("vipPlans.planYearly"),
    price: t("vipPlans.priceYearly"),
    benefits: t("vipPlans.benefitsYearly"),
  },
]);

/** 配置方式说明列表 */
const configNotes = computed<string[]>(() => [
  t("vipPlans.configNote1"),
  t("vipPlans.configNote2"),
  t("vipPlans.configNote3"),
  t("vipPlans.configNote4"),
  t("vipPlans.configNote5"),
]);
</script>

<template>
  <view class="vip-plans-page">
    <view class="page-header">
      <text class="page-title">{{ t("vipPlans.title") }}</text>
      <text class="page-subtitle">{{ t("vipPlans.subtitle") }}</text>
    </view>

    <!-- 功能状态说明：VIP 会员暂缓上线 -->
    <view class="planned-notice" role="status">
      <text class="planned-notice-text">{{ t("vipPlans.plannedNotice") }}</text>
    </view>

    <!-- 数据来源说明 -->
    <view class="notice-box">
      <text class="notice-title">{{ t("vipPlans.dataSourceTitle") }}</text>
      <text class="notice-text">{{ t("vipPlans.dataSourceText") }}</text>
    </view>

    <!-- 套餐列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("vipPlans.columnPlanId") }}</th>
            <th scope="col">{{ t("vipPlans.columnPlanName") }}</th>
            <th scope="col">{{ t("vipPlans.columnPrice") }}</th>
            <th scope="col">{{ t("vipPlans.columnBenefits") }}</th>
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
      <text class="section-title">{{ t("vipPlans.configTitle") }}</text>
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
