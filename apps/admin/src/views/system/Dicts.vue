<script setup lang="ts">
/**
 * Admin v2 数据字典视图（eladmin 风格「系统管理 → 字典管理」）。
 *
 * 功能：
 * - 字典列表：name / code / description / itemCount
 * - 新增/编辑/删除字典
 * - 点击字典行展开「条目管理」子区域：
 *   条目表格（label / value / sort / enabled）+ 新增/编辑/删除条目
 *   （listDictItemsByCode 回显，createDictItem / updateDictItem / deleteDictItem 操作）
 */
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  listDicts,
  createDict,
  updateDict,
  deleteDict,
  listDictItemsByCode,
  createDictItem,
  updateDictItem,
  deleteDictItem,
  type DictView,
  type DictItemView,
  type DictUpsertRequest,
  type DictItemUpsertRequest,
} from "../../api/system";
import { ApiError } from "../../api/http";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";

const { t } = useI18n();

// ===== 字典列表 =====
const dicts = ref<DictView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

async function fetchDicts() {
  loading.value = true;
  errorMsg.value = "";
  try {
    dicts.value = await listDicts();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("dicts.loadFailed");
    dicts.value = [];
  } finally {
    loading.value = false;
  }
}

// ===== 字典新增/编辑弹窗 =====
interface DictForm {
  name: string;
  code: string;
  description: string;
}

const dictFormVisible = ref(false);
const dictFormMode = ref<"create" | "edit">("create");
const dictEditingId = ref<number | null>(null);
const dictSaving = ref(false);
const dictFormError = ref("");

const dictForm = ref<DictForm>({ name: "", code: "", description: "" });

function openDictCreate() {
  dictForm.value = { name: "", code: "", description: "" };
  dictFormMode.value = "create";
  dictEditingId.value = null;
  dictFormError.value = "";
  dictFormVisible.value = true;
}

function openDictEdit(dict: DictView) {
  dictForm.value = { name: dict.name, code: dict.code, description: dict.description ?? "" };
  dictFormMode.value = "edit";
  dictEditingId.value = dict.id;
  dictFormError.value = "";
  dictFormVisible.value = true;
}

function closeDictForm() {
  if (dictSaving.value) return;
  dictFormVisible.value = false;
}

async function handleDictSubmit() {
  if (dictSaving.value) return;
  if (!dictForm.value.name.trim()) {
    dictFormError.value = t("dicts.nameRequired");
    return;
  }
  if (!dictForm.value.code.trim()) {
    dictFormError.value = t("dicts.codeRequired");
    return;
  }

  const payload: DictUpsertRequest = {
    name: dictForm.value.name.trim(),
    code: dictForm.value.code.trim(),
    description: dictForm.value.description.trim() || undefined,
  };

  dictSaving.value = true;
  dictFormError.value = "";
  try {
    if (dictFormMode.value === "create") {
      await createDict(payload);
    } else if (dictEditingId.value !== null) {
      await updateDict(dictEditingId.value, payload);
    }
    dictFormVisible.value = false;
    await fetchDicts();
  } catch (err) {
    dictFormError.value = err instanceof ApiError ? err.message : t("dicts.saveFailed");
  } finally {
    dictSaving.value = false;
  }
}

// ===== 字典删除确认 =====
const dictDeleteVisible = ref(false);
const dictDeleteTarget = ref<DictView | null>(null);
const dictDeleting = ref(false);

function askDictDelete(dict: DictView) {
  dictDeleteTarget.value = dict;
  dictDeleteVisible.value = true;
}

async function confirmDictDelete() {
  const target = dictDeleteTarget.value;
  if (!target || dictDeleting.value) return;
  dictDeleting.value = true;
  try {
    await deleteDict(target.id);
    dictDeleteVisible.value = false;
    dictDeleteTarget.value = null;
    if (expandedDictId.value === target.id) {
      expandedDictId.value = null;
      items.value = [];
    }
    await fetchDicts();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("dicts.deleteFailed");
    dictDeleteVisible.value = false;
  } finally {
    dictDeleting.value = false;
  }
}

// ===== 行内展开「条目管理」 =====
const expandedDictId = ref<number | null>(null);
const expandedDict = ref<DictView | null>(null);
const items = ref<DictItemView[]>([]);
const itemsLoading = ref(false);
const itemsError = ref("");

/** 点击行切换展开状态（展开时加载条目） */
function toggleExpand(dict: DictView) {
  if (expandedDictId.value === dict.id) {
    expandedDictId.value = null;
    expandedDict.value = null;
    items.value = [];
    return;
  }
  expandedDictId.value = dict.id;
  expandedDict.value = dict;
  loadItems(dict);
}

/** 加载当前展开字典的条目 */
async function loadItems(dict: DictView) {
  itemsLoading.value = true;
  itemsError.value = "";
  try {
    items.value = await listDictItemsByCode(dict.code);
  } catch (err) {
    itemsError.value = err instanceof ApiError ? err.message : t("dicts.itemsLoadFailed");
    items.value = [];
  } finally {
    itemsLoading.value = false;
  }
}

// ===== 条目新增/编辑弹窗 =====
interface DictItemForm {
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
}

const itemFormVisible = ref(false);
const itemFormMode = ref<"create" | "edit">("create");
const itemEditingId = ref<number | null>(null);
const itemSaving = ref(false);
const itemFormError = ref("");

const itemForm = ref<DictItemForm>({ label: "", value: "", sort: 0, enabled: true });

/** 打开新增条目弹窗（绑定当前展开的字典） */
function openItemCreate() {
  itemForm.value = { label: "", value: "", sort: 0, enabled: true };
  itemFormMode.value = "create";
  itemEditingId.value = null;
  itemFormError.value = "";
  itemFormVisible.value = true;
}

function openItemEdit(item: DictItemView) {
  itemForm.value = { label: item.label, value: item.value, sort: item.sort, enabled: item.enabled };
  itemFormMode.value = "edit";
  itemEditingId.value = item.id;
  itemFormError.value = "";
  itemFormVisible.value = true;
}

function closeItemForm() {
  if (itemSaving.value) return;
  itemFormVisible.value = false;
}

async function handleItemSubmit() {
  const dict = expandedDict.value;
  if (!dict || itemSaving.value) return;
  if (!itemForm.value.label.trim()) {
    itemFormError.value = t("dicts.itemLabelRequired");
    return;
  }
  if (!itemForm.value.value.trim()) {
    itemFormError.value = t("dicts.itemValueRequired");
    return;
  }

  const payload: DictItemUpsertRequest = {
    label: itemForm.value.label.trim(),
    value: itemForm.value.value.trim(),
    sort: itemForm.value.sort,
    enabled: itemForm.value.enabled,
  };

  itemSaving.value = true;
  itemFormError.value = "";
  try {
    if (itemFormMode.value === "create") {
      await createDictItem(dict.id, payload);
    } else if (itemEditingId.value !== null) {
      await updateDictItem(itemEditingId.value, payload);
    }
    itemFormVisible.value = false;
    await loadItems(dict);
    await fetchDicts(); // 刷新 itemCount
  } catch (err) {
    itemFormError.value = err instanceof ApiError ? err.message : t("dicts.saveFailed");
  } finally {
    itemSaving.value = false;
  }
}

// ===== 条目删除确认 =====
const itemDeleteVisible = ref(false);
const itemDeleteTarget = ref<DictItemView | null>(null);
const itemDeleting = ref(false);

function askItemDelete(item: DictItemView) {
  itemDeleteTarget.value = item;
  itemDeleteVisible.value = true;
}

async function confirmItemDelete() {
  const target = itemDeleteTarget.value;
  const dict = expandedDict.value;
  if (!target || !dict || itemDeleting.value) return;
  itemDeleting.value = true;
  try {
    await deleteDictItem(target.id);
    itemDeleteVisible.value = false;
    itemDeleteTarget.value = null;
    await loadItems(dict);
    await fetchDicts();
  } catch (err) {
    itemsError.value = err instanceof ApiError ? err.message : t("dicts.deleteFailed");
    itemDeleteVisible.value = false;
  } finally {
    itemDeleting.value = false;
  }
}

onMounted(() => {
  fetchDicts();
});
</script>

<template>
  <view class="dicts-page">
    <view class="page-header">
      <text class="page-title">{{ t("dicts.title") }}</text>
      <text class="page-subtitle">{{ t("dicts.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" @click="openDictCreate">{{ t("dicts.createButton") }}</button>
      <button class="secondary-button" :disabled="loading" @click="fetchDicts">{{ t("common.refresh") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchDicts" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("dicts.columnId") }}</th>
            <th scope="col">{{ t("dicts.columnName") }}</th>
            <th scope="col">{{ t("dicts.columnCode") }}</th>
            <th scope="col">{{ t("dicts.columnDescription") }}</th>
            <th scope="col">{{ t("dicts.columnItemCount") }}</th>
            <th scope="col">{{ t("dicts.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="dicts.length === 0">
            <td colspan="6" class="empty-row">{{ t("dicts.noData") }}</td>
          </tr>
          <template v-for="dict in dicts" :key="dict.id">
            <!-- 字典行（点击展开/收起条目管理） -->
            <tr class="clickable-row" @click="toggleExpand(dict)">
              <td>{{ dict.id }}</td>
              <td>{{ dict.name }}</td>
              <td class="text-mono">{{ dict.code }}</td>
              <td>{{ dict.description ?? "-" }}</td>
              <td>
                <span class="item-count-badge">{{ dict.itemCount }}</span>
              </td>
              <td class="action-cell" @click.stop>
                <button class="action-button edit" @click="openDictEdit(dict)">{{ t("dicts.actionEdit") }}</button>
                <button class="action-button delete" @click="askDictDelete(dict)">{{ t("dicts.actionDelete") }}</button>
              </td>
            </tr>
            <!-- 条目管理子区域（展开行） -->
            <tr v-if="expandedDictId === dict.id" class="expand-row">
              <td colspan="6">
                <view class="items-panel">
                  <view class="items-header">
                    <text class="items-title">
                      {{ t("dicts.itemsTitle", { name: expandedDict?.name ?? "", code: expandedDict?.code ?? "" }) }}
                    </text>
                    <button class="primary-button items-add" @click="openItemCreate">{{ t("dicts.addItemButton") }}</button>
                  </view>

                  <text v-if="itemsError" class="items-error">{{ itemsError }}</text>
                  <text v-if="itemsLoading" class="items-tip">{{ t("dicts.itemsLoading") }}</text>

                  <view v-else class="items-table-container">
                    <table class="data-table items-table">
                      <thead>
                        <tr>
                          <th scope="col">{{ t("dicts.columnItemId") }}</th>
                          <th scope="col">{{ t("dicts.columnItemName") }}</th>
                          <th scope="col">{{ t("dicts.columnItemValue") }}</th>
                          <th scope="col">{{ t("dicts.columnItemSort") }}</th>
                          <th scope="col">{{ t("dicts.columnItemStatus") }}</th>
                          <th scope="col">{{ t("dicts.columnItemActions") }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="items.length === 0">
                          <td colspan="6" class="empty-row">{{ t("dicts.noItems") }}</td>
                        </tr>
                        <tr v-for="item in items" :key="item.id">
                          <td>{{ item.id }}</td>
                          <td>{{ item.label }}</td>
                          <td class="text-mono">{{ item.value }}</td>
                          <td>{{ item.sort }}</td>
                          <td>
                            <span class="status-badge" :class="item.enabled ? 'status-active' : 'status-disabled'">
                              {{ item.enabled ? t("dicts.statusEnabled") : t("dicts.statusDisabled") }}
                            </span>
                          </td>
                          <td>
                            <view class="action-cell">
                              <button class="action-button edit" @click="openItemEdit(item)">{{ t("dicts.actionEdit") }}</button>
                              <button class="action-button delete" @click="askItemDelete(item)">{{ t("dicts.actionDelete") }}</button>
                            </view>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </view>
                </view>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </view>

    <!-- 字典新增/编辑弹窗 -->
    <view v-if="dictFormVisible" class="modal-mask" @click.self="closeDictForm">
      <view class="modal">
        <text class="modal-title">
          {{ dictFormMode === "create" ? t("dicts.createDictTitle") : t("dicts.editDictTitle") }}
        </text>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.nameLabel") }} <text class="required">*</text></text>
          <input v-model="dictForm.name" class="form-input" type="text" :placeholder="t('dicts.namePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.codeLabel") }} <text class="required">*</text></text>
          <input v-model="dictForm.code" class="form-input" type="text" :placeholder="t('dicts.codePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.descriptionLabel") }}</text>
          <textarea v-model="dictForm.description" class="form-textarea" :placeholder="t('dicts.descriptionPlaceholder')" />
        </view>

        <text v-if="dictFormError" class="modal-error">{{ dictFormError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="dictSaving" @click="closeDictForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="dictSaving" @click="handleDictSubmit">
            {{ dictSaving ? t("dicts.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 条目新增/编辑弹窗 -->
    <view v-if="itemFormVisible" class="modal-mask" @click.self="closeItemForm">
      <view class="modal">
        <text class="modal-title">
          {{ itemFormMode === "create" ? t("dicts.createItemTitle") : t("dicts.editItemTitle") }}
        </text>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.itemNameLabel") }} <text class="required">*</text></text>
          <input v-model="itemForm.label" class="form-input" type="text" :placeholder="t('dicts.itemNamePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.itemValueLabel") }} <text class="required">*</text></text>
          <input v-model="itemForm.value" class="form-input" type="text" :placeholder="t('dicts.itemValuePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("dicts.itemSortLabel") }}</text>
          <input v-model.number="itemForm.sort" class="form-input" type="number" :placeholder="t('dicts.itemSortPlaceholder')" />
        </view>

        <view class="form-row">
          <label class="radio-item">
            <input v-model="itemForm.enabled" type="checkbox" />
            <text>{{ t("dicts.itemEnabledLabel") }}</text>
          </label>
        </view>

        <text v-if="itemFormError" class="modal-error">{{ itemFormError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="itemSaving" @click="closeItemForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="itemSaving" @click="handleItemSubmit">
            {{ itemSaving ? t("dicts.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 字典删除确认 -->
    <ConfirmDialog
      v-model:visible="dictDeleteVisible"
      :title="t('dicts.deleteDictTitle')"
      :message="t('dicts.deleteDictMessage', { name: dictDeleteTarget?.name ?? '' })"
      :danger="true"
      :confirming="dictDeleting"
      :confirm-text="t('dicts.deleteButton')"
      @confirm="confirmDictDelete"
      @cancel="dictDeleteVisible = false"
    />

    <!-- 条目删除确认 -->
    <ConfirmDialog
      v-model:visible="itemDeleteVisible"
      :title="t('dicts.deleteItemTitle')"
      :message="t('dicts.deleteItemMessage', { label: itemDeleteTarget?.label ?? '' })"
      :danger="true"
      :confirming="itemDeleting"
      :confirm-text="t('dicts.deleteButton')"
      @confirm="confirmItemDelete"
      @cancel="itemDeleteVisible = false"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.dicts-page {
  max-width: 1100px;
}

.required {
  color: var(--admin-color-danger);
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: var(--admin-color-bg-subtle);
}

.expand-row td {
  background: var(--admin-color-bg-subtle);
  padding: var(--admin-space-lg) var(--admin-space-xl);
}

.items-panel {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg);
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--admin-space-lg);
}

.items-title {
  font-size: var(--admin-font-xl);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.items-add {
  padding: var(--admin-space-sm) var(--admin-space-lg);
  font-size: var(--admin-font-md);
}

.items-tip {
  display: block;
  padding: var(--admin-space-lg) 0;
  text-align: center;
  color: var(--admin-color-text-quaternary);
}

.items-error {
  display: block;
  color: var(--admin-color-danger);
  font-size: var(--admin-font-sm);
  margin-bottom: var(--admin-space-md);
}

.items-table-container {
  overflow-x: auto;
}

.items-table th,
.items-table td {
  padding: var(--admin-space-sm) var(--admin-space-md);
}

.item-count-badge {
  display: inline-block;
  min-width: 24px;
  text-align: center;
  padding: var(--admin-space-xxs) var(--admin-space-sm);
  border-radius: var(--admin-space-md);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.modal-error {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-danger);
}
</style>
