<script setup lang="ts">
/**
 * Admin v2 角色管理视图（eladmin 风格「系统管理 → 角色管理」）。
 *
 * 功能：
 * - 角色列表：name / code / dataScope / description / enabled / createdAt
 * - 新增/编辑弹窗：name / code / dataScope / description / enabled
 * - 删除角色（内置角色 SUPER_ADMIN/ADMIN 等后端返回 409，透出错误提示）
 * - 「分配菜单」弹窗：菜单树 checkbox 勾选（勾选子节点联动父节点），
 *   打开时调用 getRoleMenuIds(id) 回显，保存调用 assignRoleMenus(id, checkedIds)
 */
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listMenus,
  getRoleMenuIds,
  assignRoleMenus,
  type RoleView,
  type RoleUpsertRequest,
  type MenuTreeNode,
} from "../../api/system";
import { ApiError } from "../../api/http";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";
import { formatDateTime } from "../../utils/format";

const { t } = useI18n();

// ===== 角色列表 =====
const roles = ref<RoleView[]>([]);
const loading = ref(false);
const errorMsg = ref("");

async function fetchRoles() {
  loading.value = true;
  errorMsg.value = "";
  try {
    roles.value = await listRoles();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("roles.loadFailed");
    roles.value = [];
  } finally {
    loading.value = false;
  }
}

/** 数据范围文案 */
function dataScopeLabel(scope: string): string {
  switch (scope) {
    case "ALL":
      return t("roles.dataScopeAll");
    case "DEPT":
      return t("roles.dataScopeDept");
    case "CUSTOM":
      return t("roles.dataScopeCustom");
    default:
      return scope || "-";
  }
}

// ===== 新增/编辑弹窗 =====
interface RoleForm {
  name: string;
  code: string;
  dataScope: string;
  description: string;
  enabled: boolean;
}

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingId = ref<number | null>(null);
const saving = ref(false);
const formError = ref("");

const form = ref<RoleForm>({
  name: "",
  code: "",
  dataScope: "ALL",
  description: "",
  enabled: true,
});

/** 数据范围候选（eladmin 约定） */
const DATA_SCOPES: { value: string; labelKey: string }[] = [
  { value: "ALL", labelKey: "roles.dataScopeAll" },
  { value: "DEPT", labelKey: "roles.dataScopeDept" },
  { value: "CUSTOM", labelKey: "roles.dataScopeCustom" },
];

function openCreate() {
  form.value = { name: "", code: "", dataScope: "ALL", description: "", enabled: true };
  formMode.value = "create";
  editingId.value = null;
  formError.value = "";
  formVisible.value = true;
}

function openEdit(role: RoleView) {
  form.value = {
    name: role.name,
    code: role.code,
    dataScope: role.dataScope || "ALL",
    description: role.description ?? "",
    enabled: role.enabled,
  };
  formMode.value = "edit";
  editingId.value = role.id;
  formError.value = "";
  formVisible.value = true;
}

function closeForm() {
  if (saving.value) return;
  formVisible.value = false;
}

async function handleSubmit() {
  if (saving.value) return;
  if (!form.value.name.trim()) {
    formError.value = t("roles.nameRequired");
    return;
  }
  if (!form.value.code.trim()) {
    formError.value = t("roles.codeRequired");
    return;
  }

  const payload: RoleUpsertRequest = {
    name: form.value.name.trim(),
    code: form.value.code.trim().toUpperCase(),
    dataScope: form.value.dataScope,
    description: form.value.description.trim() || undefined,
    enabled: form.value.enabled,
  };

  saving.value = true;
  formError.value = "";
  try {
    if (formMode.value === "create") {
      await createRole(payload);
    } else if (editingId.value !== null) {
      await updateRole(editingId.value, payload);
    }
    formVisible.value = false;
    await fetchRoles();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("roles.saveFailed");
  } finally {
    saving.value = false;
  }
}

// ===== 删除确认 =====
const deleteVisible = ref(false);
const deleteTarget = ref<RoleView | null>(null);
const deleting = ref(false);

function askDelete(role: RoleView) {
  deleteTarget.value = role;
  deleteVisible.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteRole(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchRoles();
  } catch (err) {
    // 内置角色（SUPER_ADMIN/ADMIN 等）后端返回 409，透出错误信息
    errorMsg.value = err instanceof ApiError ? err.message : t("roles.deleteFailed");
    deleteVisible.value = false;
  } finally {
    deleting.value = false;
  }
}

// ===== 分配菜单弹窗（checkbox 树，勾选联动父子） =====
const assignVisible = ref(false);
const assignRole = ref<RoleView | null>(null);
/** 完全选中的菜单节点 id 集合 */
const checkedIds = ref<Set<number>>(new Set());
const menuTree = ref<MenuTreeNode[]>([]);
const assignLoading = ref(false);
const savingAssign = ref(false);
const assignError = ref("");

/** 收集节点及全部后代 id */
function collectIds(node: MenuTreeNode): number[] {
  const ids = [node.id];
  for (const child of node.children ?? []) {
    ids.push(...collectIds(child));
  }
  return ids;
}

/**
 * 节点渲染状态：
 * - checked：无子节点时被勾选，或有子节点且全部子节点 checked
 * - indeterminate：部分子节点 checked（半选，父节点联动）
 * - unchecked：未勾选
 */
function nodeState(node: MenuTreeNode): "checked" | "unchecked" | "indeterminate" {
  const children = node.children ?? [];
  if (children.length === 0) {
    return checkedIds.value.has(node.id) ? "checked" : "unchecked";
  }
  const childStates = children.map((child) => nodeState(child));
  if (childStates.every((state) => state === "checked")) return "checked";
  if (childStates.every((state) => state === "unchecked")) return "unchecked";
  return "indeterminate";
}

/** 勾选/取消勾选节点（携带全部后代联动，父节点状态由子节点推导） */
function toggleNode(node: MenuTreeNode): void {
  const ids = collectIds(node);
  const next = new Set(checkedIds.value);
  if (nodeState(node) === "checked") {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  checkedIds.value = next;
}

/** 收集所有「完全选中」状态的节点 id（不含半选父节点） */
function collectCheckedIds(nodes: MenuTreeNode[], out: number[]): number[] {
  for (const node of nodes) {
    if (nodeState(node) === "checked") {
      out.push(node.id);
    }
    collectCheckedIds(node.children ?? [], out);
  }
  return out;
}

/** 打开分配菜单弹窗：加载菜单树 + 回显已分配菜单 */
async function openAssign(role: RoleView) {
  assignRole.value = role;
  assignVisible.value = true;
  assignLoading.value = true;
  assignError.value = "";
  checkedIds.value = new Set();
  try {
    const [menus, assignedIds] = await Promise.all([listMenus(), getRoleMenuIds(role.id)]);
    menuTree.value = menus;
    checkedIds.value = new Set(assignedIds);
  } catch (err) {
    assignError.value = err instanceof ApiError ? err.message : t("roles.assignLoadFailed");
    menuTree.value = [];
  } finally {
    assignLoading.value = false;
  }
}

function closeAssign() {
  if (savingAssign.value) return;
  assignVisible.value = false;
  assignRole.value = null;
}

/** 保存菜单分配 */
async function confirmAssign() {
  const role = assignRole.value;
  if (!role || savingAssign.value) return;
  savingAssign.value = true;
  assignError.value = "";
  try {
    const checked: number[] = collectCheckedIds(menuTree.value, []);
    await assignRoleMenus(role.id, checked);
    assignVisible.value = false;
    assignRole.value = null;
  } catch (err) {
    assignError.value = err instanceof ApiError ? err.message : t("roles.assignSaveFailed");
  } finally {
    savingAssign.value = false;
  }
}

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <view class="roles-page">
    <view class="page-header">
      <text class="page-title">{{ t("roles.title") }}</text>
      <text class="page-subtitle">{{ t("roles.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" @click="openCreate">{{ t("roles.createButton") }}</button>
      <button class="secondary-button" :disabled="loading" @click="fetchRoles">{{ t("common.refresh") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchRoles" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("roles.columnId") }}</th>
            <th scope="col">{{ t("roles.columnName") }}</th>
            <th scope="col">{{ t("roles.columnCode") }}</th>
            <th scope="col">{{ t("roles.columnDataScope") }}</th>
            <th scope="col">{{ t("roles.columnDescription") }}</th>
            <th scope="col">{{ t("roles.columnStatus") }}</th>
            <th scope="col">{{ t("roles.columnCreatedAt") }}</th>
            <th scope="col">{{ t("roles.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="roles.length === 0">
            <td colspan="8" class="empty-row">{{ t("roles.noData") }}</td>
          </tr>
          <tr v-for="role in roles" :key="role.id">
            <td>{{ role.id }}</td>
            <td>{{ role.name }}</td>
            <td class="text-mono">{{ role.code }}</td>
            <td>{{ dataScopeLabel(role.dataScope) }}</td>
            <td>{{ role.description ?? "-" }}</td>
            <td>
              <span class="status-badge" :class="role.enabled ? 'status-active' : 'status-disabled'">
                {{ role.enabled ? t("roles.statusEnabled") : t("roles.statusDisabled") }}
              </span>
            </td>
            <td>{{ formatDateTime(role.createdAt) }}</td>
            <td>
              <view class="action-cell">
                <button class="action-button edit" @click="openEdit(role)">{{ t("roles.actionEdit") }}</button>
                <button class="action-button handle" @click="openAssign(role)">{{ t("roles.actionAssign") }}</button>
                <button class="action-button delete" @click="askDelete(role)">{{ t("roles.actionDelete") }}</button>
              </view>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 新增/编辑角色弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal">
        <text class="modal-title">{{ formMode === "create" ? t("roles.createTitle") : t("roles.editTitle") }}</text>

        <view class="form-row">
          <text class="form-label">{{ t("roles.nameLabel") }} <text class="required">*</text></text>
          <input v-model="form.name" class="form-input" type="text" :placeholder="t('roles.namePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("roles.codeLabel") }} <text class="required">*</text></text>
          <input v-model="form.code" class="form-input" type="text" :placeholder="t('roles.codePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("roles.dataScopeLabel") }}</text>
          <select v-model="form.dataScope" class="filter-select">
            <option v-for="scope in DATA_SCOPES" :key="scope.value" :value="scope.value">
              {{ t(scope.labelKey) }}
            </option>
          </select>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("roles.descriptionLabel") }}</text>
          <textarea v-model="form.description" class="form-textarea" :placeholder="t('roles.descriptionPlaceholder')" />
        </view>

        <view class="form-row">
          <label class="radio-item">
            <input v-model="form.enabled" type="checkbox" />
            <text>{{ t("roles.enabledLabel") }}</text>
          </label>
        </view>

        <text v-if="formError" class="modal-error">{{ formError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="saving" @click="handleSubmit">
            {{ saving ? t("roles.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 分配菜单弹窗 -->
    <view v-if="assignVisible" class="modal-mask" @click.self="closeAssign">
      <view class="modal modal-assign">
        <text class="modal-title">{{ t("roles.assignTitle", { name: assignRole?.name ?? "" }) }}</text>
        <text class="modal-hint">{{ t("roles.assignHint") }}</text>

        <text v-if="assignError" class="modal-error">{{ assignError }}</text>
        <text v-if="assignLoading" class="assign-loading">{{ t("roles.assignLoading") }}</text>

        <view v-else class="menu-tree">
          <view v-for="node in menuTree" :key="node.id" class="tree-node">
            <label class="tree-checkbox">
              <input
                type="checkbox"
                :checked="nodeState(node) === 'checked'"
                :indeterminate.prop="nodeState(node) === 'indeterminate'"
                @change="toggleNode(node)"
              />
              <text class="tree-label">{{ node.title }}</text>
              <text v-if="node.children && node.children.length > 0" class="tree-children-count">
                {{ t("roles.childrenCount", { n: node.children.length }) }}
              </text>
            </label>
            <view v-if="node.children && node.children.length > 0" class="tree-children">
              <label v-for="child in node.children" :key="child.id" class="tree-checkbox tree-checkbox--child">
                <input
                  type="checkbox"
                  :checked="nodeState(child) === 'checked'"
                  :indeterminate.prop="nodeState(child) === 'indeterminate'"
                  @change="toggleNode(child)"
                />
                <text class="tree-label">{{ child.title }}</text>
              </label>
            </view>
          </view>
          <text v-if="menuTree.length === 0" class="assign-empty">{{ t("roles.assignEmpty") }}</text>
        </view>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="savingAssign" @click="closeAssign">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="savingAssign || assignLoading" @click="confirmAssign">
            {{ savingAssign ? t("roles.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('roles.deleteTitle')"
      :message="t('roles.deleteMessage', { name: deleteTarget?.name ?? '' })"
      :danger="true"
      :confirming="deleting"
      :confirm-text="t('roles.deleteButton')"
      @confirm="confirmDelete"
      @cancel="deleteVisible = false"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.roles-page {
  max-width: 1200px;
}

.required {
  color: var(--admin-color-danger);
}

.modal-assign {
  width: 520px;
  max-width: 92%;
}

.modal-error {
  display: block;
  font-size: var(--admin-font-sm);
  color: var(--admin-color-danger);
  margin-bottom: var(--admin-space-md);
}

.assign-loading {
  display: block;
  padding: var(--admin-space-xxl) 0;
  text-align: center;
  color: var(--admin-color-text-quaternary);
}

.assign-empty {
  display: block;
  padding: var(--admin-space-xxl) 0;
  text-align: center;
  color: var(--admin-color-text-quaternary);
}

.menu-tree {
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-md);
  padding: var(--admin-space-md);
  margin-bottom: var(--admin-space-lg);
}

.tree-checkbox {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-xxs) 0;
  cursor: pointer;
  font-size: var(--admin-font-lg);
}

.tree-checkbox--child {
  padding-left: var(--admin-space-xxl);
}

.tree-label {
  color: var(--admin-color-text-primary);
}

.tree-children-count {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-quaternary);
}
</style>
