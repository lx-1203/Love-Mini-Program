/**
 * Discover Store 筛选相关 Actions
 *
 * 集中维护寻觅页筛选条件（chip / 抽屉 / 高级筛选 / 搜索关键字）的设置与重置。
 *
 * 拆分目的：原 discover/index.ts 单文件 1021 行，违反单一职责原则。
 * 拆分后筛选相关 action 独立成文件，便于维护与测试。
 *
 * 注意：本文件中所有 action 函数均使用 `this: DiscoverStoreThis` 显式声明
 * this 类型，因为 Pinia Option API 的 this 类型推断在拆分到独立文件后失效。
 */

import type { RecommendationFilter } from "../../../services/generated/api-types-supplement";
import {
  EMPTY_RECOMMENDATION_FILTER,
  SEARCH_DEBOUNCE_MS,
} from "../constants";
import { timers } from "../timers";
import type { DiscoverStoreThis } from "../store-type";

/**
 * 设置筛选条件并刷新推荐列表
 *
 * Phase C 说明：此方法仅更新 activeFilter（chip ID）用于 UI 高亮，
 * 不直接修改 recommendationFilter 对象。chip 与 recommendationFilter 解耦：
 * chip 是快捷预设，recommendationFilter 是抽屉中的详细筛选。
 *
 * @param filterId - 筛选 ID（nearby/all/age18-25/match-priority）
 */
export function setFilter(this: DiscoverStoreThis, filterId: string): void {
  this.activeFilter = filterId;
  // 切换筛选后重新加载推荐卡片
  void this.fetchCards();
}

/**
 * 设置推荐筛选条件对象（Phase C 新增）。
 *
 * 由筛选抽屉组件（H-07 + M-16）调用：用户在抽屉中调整筛选项后，
 * 点击「应用筛选」按钮，将完整的 RecommendationFilter 对象传入。
 * 调用后立即刷新推荐列表（fetchCards 会读取 recommendationFilter 透传给 API）。
 *
 * 设计权衡：使用整体替换而非逐字段更新，确保调用方对状态有完整控制，
 * 避免部分字段残留导致筛选逻辑混乱。
 *
 * 功能6：同步更新 advancedFilter state，保持两者一致性。
 *
 * @param filter - 完整的推荐筛选条件对象
 */
export function setRecommendationFilter(
  this: DiscoverStoreThis,
  filter: RecommendationFilter
): void {
  // 浅拷贝避免外部引用变更污染 store 状态
  this.recommendationFilter = { ...filter };
  // 功能6：同步更新 advancedFilter state（仅提取高级字段）
  this.advancedFilter = {
    gender: filter.gender,
    ageMin: filter.ageMin,
    ageMax: filter.ageMax,
    schools: filter.schools ? [...filter.schools] : undefined,
    distanceMax: filter.distanceMax,
    interests: filter.interests ? [...filter.interests] : undefined,
    onlineOnly: filter.onlineOnly,
  };
  void this.fetchCards();
}

/**
 * 重置所有筛选字段为 undefined/空（Phase C 新增）。
 *
 * 清空 recommendationFilter 的所有字段（身高范围、学历、感情状态、
 * 籍贯省市、未来城市、关键字），等价于「不限」状态。
 * 调用后立即刷新推荐列表。
 *
 * 注意：仅重置 recommendationFilter，不影响 activeFilter（chip 高亮），
 * chip 状态由页面层单独管理（与抽屉筛选语义解耦）。
 */
export function resetFilter(this: DiscoverStoreThis): void {
  this.recommendationFilter = { ...EMPTY_RECOMMENDATION_FILTER };
  // 功能6：同步重置高级筛选状态
  this.advancedFilter = { ...EMPTY_RECOMMENDATION_FILTER };
  void this.fetchCards();
}

/**
 * 功能6：设置高级筛选条件（仅更新高级字段）。
 *
 * 由 AdvancedFilter 组件通过 emit "update:modelValue" 调用，
 * 用户在抽屉中调整高级筛选项（性别/年龄/学校/距离/兴趣/在线状态）后，
 * 将完整的高级筛选对象传入。
 *
 * 设计说明：
 * - 仅更新 recommendationFilter 中的高级字段（gender/ageMin/ageMax/
 *   schools/distanceMax/interests/onlineOnly），保留基础筛选字段不变
 * - 同步更新 advancedFilter state，供组件双向绑定
 * - 调用后立即刷新推荐列表（fetchCards 会读取 recommendationFilter
 *   透传给 API）
 *
 * 错误处理：参数为空对象时直接返回，避免清空已有筛选。
 *
 * @param filter - 高级筛选条件对象（仅含高级字段）
 */
export function setAdvancedFilter(
  this: DiscoverStoreThis,
  filter: RecommendationFilter
): void {
  // 参数校验：filter 必须为对象
  if (!filter || typeof filter !== "object") {
    console.warn("[DiscoverStore] setAdvancedFilter: 无效的 filter 参数");
    return;
  }

  // 提取高级筛选字段（仅这些字段属于高级筛选范畴）
  const advancedFields: RecommendationFilter = {
    gender: filter.gender,
    ageMin: filter.ageMin,
    ageMax: filter.ageMax,
    schools: filter.schools ? [...filter.schools] : undefined,
    distanceMax: filter.distanceMax,
    interests: filter.interests ? [...filter.interests] : undefined,
    onlineOnly: filter.onlineOnly,
  };

  // 同步更新 advancedFilter state（独立 slice）
  this.advancedFilter = { ...advancedFields };

  // 合并到 recommendationFilter（保留基础筛选字段，覆盖高级字段）
  this.recommendationFilter = {
    ...this.recommendationFilter,
    ...advancedFields,
  };

  // 触发推荐列表刷新
  void this.fetchCards();
}

/**
 * 功能6：重置高级筛选条件（仅清空高级字段）。
 *
 * 由 AdvancedFilter 组件通过 emit "reset" 调用，
 * 清空所有高级筛选字段（性别/年龄/学校/距离/兴趣/在线状态），
 * 保留基础筛选字段不变。
 *
 * 设计说明：
 * - 仅重置 recommendationFilter 中的高级字段
 * - 同步重置 advancedFilter state
 * - 调用后立即刷新推荐列表
 */
export function resetAdvancedFilter(this: DiscoverStoreThis): void {
  // 重置 advancedFilter state 为空对象（所有高级字段为 undefined）
  this.advancedFilter = { ...EMPTY_RECOMMENDATION_FILTER };

  // 从 recommendationFilter 中移除高级字段（保留基础筛选字段）
  this.recommendationFilter = {
    ...this.recommendationFilter,
    gender: undefined,
    ageMin: undefined,
    ageMax: undefined,
    schools: undefined,
    distanceMax: undefined,
    interests: undefined,
    onlineOnly: undefined,
  };

  // 触发推荐列表刷新
  void this.fetchCards();
}

/**
 * 打开筛选抽屉（Phase C 新增）。
 *
 * 设置 isFilterDrawerOpen = true，驱动筛选抽屉组件（H-07）渲染。
 * 抽屉内部通过 v-model 或 @close 监听关闭事件。
 */
export function openFilterDrawer(this: DiscoverStoreThis): void {
  this.isFilterDrawerOpen = true;
}

/**
 * 关闭筛选抽屉（Phase C 新增）。
 *
 * 设置 isFilterDrawerOpen = false，触发抽屉的 leave transition。
 * 不自动应用筛选：用户若取消选择，已修改的 recommendationFilter
 * 不会生效（需调用 setRecommendationFilter 才会更新）。
 */
export function closeFilterDrawer(this: DiscoverStoreThis): void {
  this.isFilterDrawerOpen = false;
}

/**
 * 设置搜索关键字（带 300ms 防抖，避免快速输入触发频繁刷新）
 * @param keyword - 搜索关键字（用户昵称/标签/学校）
 */
export function setSearchKeyword(
  this: DiscoverStoreThis,
  keyword: string
): void {
  this.searchKeyword = keyword;
  if (timers.searchDebounceTimer) {
    clearTimeout(timers.searchDebounceTimer);
  }
  timers.searchDebounceTimer = setTimeout(() => {
    timers.searchDebounceTimer = null;
    void this.fetchCards();
  }, SEARCH_DEBOUNCE_MS);
}
