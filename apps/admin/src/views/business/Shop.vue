<script setup lang="ts">
/**
 * Admin v2 积分商城管理视图（商业模式「商业运营」域）。
 *
 * 功能：
 * - 分页列表：ID / 标题 / 分类 / 积分价格（分转元）/ 划线价（分转元）/ 库存 / 已售 /
 *   上架状态 / 校区 / 排序
 * - 筛选：标题关键字 + 分类（ticket/food/goods/creative）下拉 + 上架状态下拉 + 分页
 * - 操作：
 *   - 「新增 / 编辑」弹窗：title / category / priceCents / originalPrice / imageUrl /
 *     description / stock / sortOrder / campusName → createShopItem / updateShopItem
 *   - 「上架 / 下架」：publishShopItem / unpublishShopItem
 *   - 「删除」：ConfirmDialog 二次确认后 deleteShopItem
 *
 * 对应后端 com.campuslove.api.admin.AdminShopController：
 *   - GET/POST /api/v1/admin/business/shop
 *   - PUT/DELETE /api/v1/admin/business/shop/{id}
 *   - POST /api/v1/admin/business/shop/{id}/publish|unpublish
 *
 * 金额单位：priceCents/originalPrice 以「分」存储，前端展示/录入统一转元。
 */
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import {
  listShopItems,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  publishShopItem,
  unpublishShopItem,
  type ShopItemView,
  type ShopItemRequest,
} from "../../api/business";
import { ApiError } from "../../api/http";
import Pagination from "../../components/Pagination.vue";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { DEFAULT_PAGE_SIZE, TOAST_DURATION_MS } from "../../utils/constants";

const { t } = useI18n();

/** 商品列表数据 */
const items = ref<ShopItemView[]>([]);
/** 加载中标志 */
const loading = ref(false);
/** 列表错误信息 */
const errorMsg = ref("");
/** 操作成功轻提示 */
const toastMessage = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** 标题关键字筛选 */
const keywordQuery = ref("");
/** 分类筛选（空串=全部） */
const categoryFilter = ref("");
/** 上架状态筛选（空串=全部） */
const publishedFilter = ref("");

/** 当前页码（1-based） */
const page = ref(1);
/** 每页大小 */
const pageSize = ref(DEFAULT_PAGE_SIZE);
/** 总记录数 */
const total = ref(0);
/** 总页数 */
const totalPages = ref(1);

/** 新增/编辑弹窗状态 */
const editorVisible = ref(false);
/** 编辑模式：null=新增，非 null=编辑该商品 */
const editingItem = ref<ShopItemView | null>(null);
const formTitle = ref("");
const formCategory = ref("goods");
const formPriceYuan = ref("");
const formOriginalPriceYuan = ref("");
const formImageUrl = ref("");
const formDescription = ref("");
const formStock = ref(-1);
const formSortOrder = ref(0);
const formCampusName = ref("");
const saving = ref(false);
const modalError = ref("");

/** 删除确认弹窗状态 */
const deleteVisible = ref(false);
const deleteTarget = ref<ShopItemView | null>(null);
const deleting = ref(false);

/** 上架/下架操作中标志（按商品 ID 记录，禁用对应按钮防连点） */
const togglingId = ref<number | null>(null);

// 请求竞态防护
let reqSeq = 0;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** 商品分类选项 */
const CATEGORY_OPTIONS = [
  { value: "ticket", label: "门票" },
  { value: "food", label: "美食" },
  { value: "goods", label: "商品" },
  { value: "creative", label: "文创" },
];

/** 分类文案 */
function categoryLabel(category: string): string {
  const found = CATEGORY_OPTIONS.find((o) => o.value === category);
  return found ? found.label : category;
}

/** 库存展示：-1=不限 */
function stockLabel(stock: number): string {
  return stock === -1 ? "不限" : String(stock);
}

/** 分转元展示（保留两位小数） */
function formatYuan(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "-";
  return (cents / 100).toFixed(2);
}

/** 轻提示（3 秒自动消失） */
function showToast(msg: string) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = msg;
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
    toastTimer = null;
  }, TOAST_DURATION_MS);
}

/**
 * 拉取商品列表。
 */
async function fetchItems() {
  loading.value = true;
  errorMsg.value = "";
  const seq = ++reqSeq;
  try {
    const result = await listShopItems({
      keyword: keywordQuery.value.trim() || undefined,
      category: categoryFilter.value || undefined,
      published: publishedFilter.value === "" ? undefined : publishedFilter.value === "true",
      page: page.value,
      pageSize: pageSize.value,
    });
    if (seq !== reqSeq) return;
    items.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (err) {
    if (seq !== reqSeq) return;
    errorMsg.value = err instanceof ApiError ? err.message : "加载商城商品失败";
    items.value = [];
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
    fetchItems();
  }, 400);
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
  page.value = 1;
  fetchItems();
}

/** 重置筛选并刷新 */
function handleReset() {
  keywordQuery.value = "";
  categoryFilter.value = "";
  publishedFilter.value = "";
  handleSearch();
}

function handlePageChange() {
  fetchItems();
}

/** 打开新增弹窗（重置表单） */
function openCreate() {
  editingItem.value = null;
  formTitle.value = "";
  formCategory.value = "goods";
  formPriceYuan.value = "";
  formOriginalPriceYuan.value = "";
  formImageUrl.value = "";
  formDescription.value = "";
  formStock.value = -1;
  formSortOrder.value = 0;
  formCampusName.value = "";
  modalError.value = "";
  editorVisible.value = true;
}

/** 打开编辑弹窗（回显当前行数据，分转元） */
function openEdit(item: ShopItemView) {
  editingItem.value = item;
  formTitle.value = item.title;
  formCategory.value = item.category || "goods";
  formPriceYuan.value = item.priceCents != null ? (item.priceCents / 100).toFixed(2) : "";
  formOriginalPriceYuan.value = item.originalPrice != null ? (item.originalPrice / 100).toFixed(2) : "";
  formImageUrl.value = item.imageUrl || "";
  formDescription.value = item.description || "";
  formStock.value = item.stock ?? -1;
  formSortOrder.value = item.sortOrder ?? 0;
  formCampusName.value = item.campusName || "";
  modalError.value = "";
  editorVisible.value = true;
}

function closeEditor() {
  if (saving.value) return;
  editorVisible.value = false;
  editingItem.value = null;
}

/**
 * 提交新增/编辑商品。
 * 前端校验：标题必填；积分价格（元）必填且 ≥0。
 * 金额单位：表单以元录入，提交时转分（×100 取整）。
 */
async function handleSave() {
  if (saving.value) return;
  const title = formTitle.value.trim();
  if (!title) {
    modalError.value = "商品标题不能为空";
    return;
  }
  if (title.length > 128) {
    modalError.value = "商品标题长度须为 1-128 字";
    return;
  }
  const priceYuan = Number(formPriceYuan.value);
  if (!Number.isFinite(priceYuan) || priceYuan < 0) {
    modalError.value = "请输入有效的积分价格（≥0）";
    return;
  }
  const originalPriceYuan = formOriginalPriceYuan.value.trim()
    ? Number(formOriginalPriceYuan.value.trim())
    : null;
  if (originalPriceYuan !== null && (!Number.isFinite(originalPriceYuan) || originalPriceYuan < 0)) {
    modalError.value = "划线价必须为 ≥0 的有效数字";
    return;
  }

  const payload: ShopItemRequest = {
    title,
    category: formCategory.value,
    priceCents: Math.round(priceYuan * 100),
    originalPrice: originalPriceYuan !== null ? Math.round(originalPriceYuan * 100) : undefined,
    imageUrl: formImageUrl.value.trim() || undefined,
    description: formDescription.value.trim() || undefined,
    stock: formStock.value,
    sortOrder: formSortOrder.value,
    campusName: formCampusName.value.trim() || undefined,
  };

  saving.value = true;
  modalError.value = "";
  try {
    if (editingItem.value) {
      await updateShopItem(editingItem.value.id, payload);
      showToast(t("shop.updated"));
    } else {
      await createShopItem(payload);
      showToast(t("shop.created"));
    }
    editorVisible.value = false;
    editingItem.value = null;
    await fetchItems();
  } catch (err) {
    modalError.value = err instanceof ApiError ? err.message : "保存商品失败";
  } finally {
    saving.value = false;
  }
}

/** 上架/下架切换（直接调用对应端点） */
async function handleTogglePublished(item: ShopItemView) {
  if (togglingId.value !== null) return;
  togglingId.value = item.id;
  try {
    if (item.published) {
      await unpublishShopItem(item.id);
      showToast(t("shop.unpublished"));
    } else {
      await publishShopItem(item.id);
      showToast(t("shop.published"));
    }
    await fetchItems();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "操作失败";
  } finally {
    togglingId.value = null;
  }
}

/** 点击删除 → 打开确认弹窗 */
function askDelete(item: ShopItemView) {
  deleteTarget.value = item;
  deleteVisible.value = true;
}

/** 执行删除 */
async function handleDeleteConfirm() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteShopItem(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    showToast(t("shop.deleted"));
    await fetchItems();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "删除失败";
    deleteVisible.value = false;
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  fetchItems();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
});
</script>

<template>
  <view class="shop-page">
    <view class="page-header">
      <text class="page-title">商城管理</text>
      <text class="page-subtitle">维护积分商城商品、上下架与库存</text>
    </view>

    <view v-if="toastMessage" class="toast-message" role="status" aria-live="polite">
      <text>{{ toastMessage }}</text>
    </view>

    <!-- 筛选工具栏 -->
    <view class="toolbar">
      <input
        v-model="keywordQuery"
        class="search-input"
        type="text"
        placeholder="搜索商品标题"
        @keyup.enter="handleSearch"
        @input="scheduleSearch"
      />
      <select v-model="categoryFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部分类</option>
        <option v-for="o in CATEGORY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <select v-model="publishedFilter" class="filter-select" @change="scheduleSearch">
        <option value="">全部状态</option>
        <option value="true">已上架</option>
        <option value="false">已下架</option>
      </select>
      <button class="primary-button" @click="handleSearch">搜索</button>
      <button class="ghost-button" @click="handleReset">重置</button>
      <button class="primary-button" @click="openCreate">新增商品</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchItems" />

    <!-- 商品列表 -->
    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">标题</th>
            <th scope="col">分类</th>
            <th scope="col">积分价格</th>
            <th scope="col">划线价</th>
            <th scope="col">库存</th>
            <th scope="col">已售</th>
            <th scope="col">上架状态</th>
            <th scope="col">校区</th>
            <th scope="col">排序</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="11" class="empty-cell">暂无商品数据</td>
          </tr>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.id }}</td>
            <td class="title-cell" :title="item.title">{{ item.title }}</td>
            <td>
              <span class="category-tag">{{ categoryLabel(item.category) }}</span>
            </td>
            <td class="price-cell">{{ formatYuan(item.priceCents) }}</td>
            <td class="origin-price">{{ item.originalPrice != null ? formatYuan(item.originalPrice) : "-" }}</td>
            <td>{{ stockLabel(item.stock) }}</td>
            <td>{{ item.salesCount }}</td>
            <td>
              <span class="status-badge" :class="item.published ? 'status-on' : 'status-off'">
                {{ item.published ? "已上架" : "已下架" }}
              </span>
            </td>
            <td>{{ item.campusName || "全局" }}</td>
            <td>{{ item.sortOrder }}</td>
            <td class="action-cell">
              <button class="action-button edit" @click="openEdit(item)">编辑</button>
              <button
                class="action-button toggle"
                :disabled="togglingId === item.id"
                @click="handleTogglePublished(item)"
              >
                {{ item.published ? "下架" : "上架" }}
              </button>
              <button class="action-button danger" @click="askDelete(item)">删除</button>
            </td>
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

    <!-- 新增/编辑商品弹窗 -->
    <view v-if="editorVisible" class="modal-mask" @click.self="closeEditor">
      <view class="modal editor-modal">
        <text class="modal-title">{{ editingItem ? `编辑商品 #${editingItem.id}` : "新增商品" }}</text>

        <view class="form-row">
          <text class="form-label">商品标题 *</text>
          <input v-model="formTitle" class="form-input" type="text" maxlength="128" placeholder="请输入商品标题" />
        </view>

        <view class="form-row">
          <text class="form-label">分类</text>
          <select v-model="formCategory" class="form-input form-select">
            <option v-for="o in CATEGORY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </view>

        <view class="form-row">
          <text class="form-label">积分价格（元）*</text>
          <input v-model="formPriceYuan" class="form-input" type="number" min="0" step="0.01" placeholder="如：10" />
        </view>

        <view class="form-row">
          <text class="form-label">划线价（元，可空）</text>
          <input v-model="formOriginalPriceYuan" class="form-input" type="number" min="0" step="0.01" placeholder="如：20" />
        </view>

        <view class="form-row">
          <text class="form-label">图片 URL</text>
          <input v-model="formImageUrl" class="form-input" type="text" placeholder="商品图片地址" />
        </view>

        <view class="form-row">
          <text class="form-label">商品描述</text>
          <textarea v-model="formDescription" class="form-textarea" rows="3" placeholder="商品描述（可选）" />
        </view>

        <view class="form-row">
          <text class="form-label">库存（-1=不限）</text>
          <input v-model.number="formStock" class="form-input" type="number" />
        </view>

        <view class="form-row">
          <text class="form-label">排序权重（越小越靠前）</text>
          <input v-model.number="formSortOrder" class="form-input" type="number" />
        </view>

        <view class="form-row">
          <text class="form-label">所属校区（可空=全局商品）</text>
          <input v-model="formCampusName" class="form-input" type="text" placeholder="如：南京大学" />
        </view>

        <text v-if="modalError" class="modal-error">{{ modalError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeEditor">取消</button>
          <button class="primary-button" :disabled="saving" @click="handleSave">
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="'删除商品'"
      :message="deleteTarget ? `确定要删除商品「${deleteTarget.title}」吗？此操作不可撤销。` : ''"
      :danger="true"
      :confirming="deleting"
      @confirm="handleDeleteConfirm"
      @cancel="deleteTarget = null"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.shop-page {
  max-width: 1400px;
}

.title-cell {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.category-tag {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  border-radius: var(--admin-radius-sm);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.price-cell {
  font-weight: 600;
  color: var(--admin-color-danger);
  white-space: nowrap;
}

.origin-price {
  color: var(--admin-color-text-quaternary);
  text-decoration: line-through;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-md);
  border-radius: var(--admin-space-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.status-on {
  background: var(--admin-color-success-soft);
  color: var(--admin-color-success);
}

.status-off {
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-tertiary);
}

.action-cell {
  white-space: nowrap;
}

.action-button.edit {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.action-button.edit:hover {
  background: var(--admin-color-info-softer);
}

.action-button.toggle {
  background: var(--admin-color-warning-soft);
  color: var(--admin-color-warning);
}

.action-button.toggle:hover {
  background: var(--admin-color-warning-softer);
}

.action-button.toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.danger {
  background: var(--admin-color-danger-soft);
  color: var(--admin-color-danger);
}

.action-button.danger:hover {
  background: var(--admin-color-danger-softer);
}

.toast-message {
  padding: var(--admin-space-md-sm) var(--admin-space-lg);
  background: var(--admin-color-success-soft);
  border-left: 3px solid var(--admin-color-success);
  border-radius: var(--admin-radius-sm);
  color: var(--admin-color-success);
  font-size: var(--admin-font-md);
  margin-bottom: var(--admin-space-lg);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: var(--admin-color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-xl);
  padding: var(--admin-space-xxl);
  max-width: 90%;
}

.editor-modal {
  width: 460px;
  max-height: 85vh;
  overflow-y: auto;
}

.modal-title {
  display: block;
  font-size: var(--admin-font-xxl);
  font-weight: 600;
  margin-bottom: var(--admin-space-lg);
  color: var(--admin-color-text-primary);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xxs);
  margin-bottom: var(--admin-space-lg);
}

.form-label {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

.form-input {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
}

.form-select {
  background: var(--admin-color-bg-container);
}

.form-textarea {
  padding: var(--admin-space-md-sm) var(--admin-space-sm);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-lg);
  resize: vertical;
  font-family: inherit;
}

.modal-error {
  display: block;
  font-size: var(--admin-font-md);
  color: var(--admin-color-danger);
  margin-bottom: var(--admin-space-md);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--admin-space-sm);
}
</style>
