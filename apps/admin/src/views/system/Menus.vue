<script setup lang="ts">
/**
 * Admin v2 菜单管理视图（eladmin 风格「系统管理 → 菜单管理」）。
 *
 * 功能：
 * - 树形表格展示菜单（顶级目录 → 子菜单，两级缩进）
 * - 新增顶级菜单 / 新增子菜单 / 编辑 / 删除
 * - 表单字段：parentId / title / name / path / component / icon /
 *   sort / hidden / menuType（DIR=目录 / MENU=菜单 切换）
 *
 * 说明：
 * - 删除存在子菜单的目录时后端返回 409，错误信息直接透出提示；
 * - menuType=DIR 时 component 字段无意义（目录不注册路由），表单隐藏该输入。
 */
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  listMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  type MenuTreeNode,
  type MenuUpsertRequest,
} from "../../api/system";
import { ApiError } from "../../api/http";
import ConfirmDialog from "../../components/ConfirmDialog.vue";
import ErrorState from "../../components/ErrorState.vue";

const { t } = useI18n();

// ===== 列表数据 =====
const menuTree = ref<MenuTreeNode[]>([]);
const loading = ref(false);
const errorMsg = ref("");

/** 展平后的表格行（含缩进层级，支持任意深度，页面按两级展示） */
interface MenuRow {
  node: MenuTreeNode;
  depth: number;
}

function flattenTree(nodes: MenuTreeNode[], depth: number, out: MenuRow[]): MenuRow[] {
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.children && node.children.length > 0) {
      flattenTree(node.children, depth + 1, out);
    }
  }
  return out;
}

const rows = computed<MenuRow[]>(() => flattenTree(menuTree.value, 0, []));

/** 拉取菜单树 */
async function fetchMenus() {
  loading.value = true;
  errorMsg.value = "";
  try {
    menuTree.value = await listMenus();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : t("menus.loadFailed");
    menuTree.value = [];
  } finally {
    loading.value = false;
  }
}

// ===== 新增/编辑弹窗 =====
interface MenuForm {
  parentId: number | null;
  title: string;
  name: string;
  path: string;
  component: string;
  icon: string;
  sort: number;
  hidden: boolean;
  permission: string;
  menuType: "DIR" | "MENU";
}

const formVisible = ref(false);
const formMode = ref<"create" | "edit">("create");
/** 编辑中的菜单 id（create 模式为 null） */
const editingId = ref<number | null>(null);
const saving = ref(false);
const formError = ref("");

const form = ref<MenuForm>({
  parentId: null,
  title: "",
  name: "",
  path: "",
  component: "",
  icon: "",
  sort: 0,
  hidden: false,
  permission: "",
  menuType: "DIR",
});

/** 打开新增顶级菜单弹窗（parentId=null，默认目录类型） */
function openCreateTop() {
  form.value = {
    parentId: null,
    title: "",
    name: "",
    path: "",
    component: "",
    icon: "",
    sort: 0,
    hidden: false,
    permission: "",
    menuType: "DIR",
  };
  formMode.value = "create";
  editingId.value = null;
  formError.value = "";
  formVisible.value = true;
}

/** 打开新增子菜单弹窗（parent 为父级节点，默认菜单类型） */
function openCreateChild(parent: MenuTreeNode) {
  form.value = {
    parentId: parent.id,
    title: "",
    name: "",
    path: "",
    component: "",
    icon: "",
    sort: 0,
    hidden: false,
    permission: "",
    menuType: "MENU",
  };
  formMode.value = "create";
  editingId.value = null;
  formError.value = "";
  formVisible.value = true;
}

/** 打开编辑弹窗（回显节点数据） */
function openEdit(node: MenuTreeNode) {
  form.value = {
    parentId: node.parentId,
    title: node.title,
    name: node.name,
    path: node.path,
    component: node.component ?? "",
    icon: node.icon ?? "",
    sort: node.sort,
    hidden: node.hidden,
    permission: node.permission ?? "",
    menuType: node.menuType === "MENU" ? "MENU" : "DIR",
  };
  formMode.value = "edit";
  editingId.value = node.id;
  formError.value = "";
  formVisible.value = true;
}

function closeForm() {
  if (saving.value) return;
  formVisible.value = false;
}

/** 菜单类型切换（DIR/MENU） */
function switchType(type: "DIR" | "MENU") {
  form.value.menuType = type;
}

/** 提交新增/编辑 */
async function handleSubmit() {
  if (saving.value) return;
  // 基础校验（title/name/path 必填；MENU 类型 component 必填）
  if (!form.value.title.trim()) {
    formError.value = t("menus.titleRequired");
    return;
  }
  if (!form.value.name.trim()) {
    formError.value = t("menus.nameRequired");
    return;
  }
  if (!form.value.path.trim()) {
    formError.value = t("menus.pathRequired");
    return;
  }
  if (form.value.menuType === "MENU" && !form.value.component.trim()) {
    formError.value = t("menus.componentRequired");
    return;
  }

  const payload: MenuUpsertRequest = {
    parentId: form.value.parentId,
    title: form.value.title.trim(),
    name: form.value.name.trim(),
    path: form.value.path.trim(),
    component: form.value.menuType === "MENU" ? form.value.component.trim() : null,
    icon: form.value.icon.trim() || null,
    sort: form.value.sort,
    hidden: form.value.hidden,
    permission: form.value.permission.trim() || null,
    menuType: form.value.menuType,
  };

  saving.value = true;
  formError.value = "";
  try {
    if (formMode.value === "create") {
      await createMenu(payload);
    } else if (editingId.value !== null) {
      await updateMenu(editingId.value, payload);
    }
    formVisible.value = false;
    await fetchMenus();
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : t("menus.saveFailed");
  } finally {
    saving.value = false;
  }
}

// ===== 删除确认 =====
const deleteVisible = ref(false);
const deleteTarget = ref<MenuTreeNode | null>(null);
const deleting = ref(false);

function askDelete(node: MenuTreeNode) {
  deleteTarget.value = node;
  deleteVisible.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;
  deleting.value = true;
  try {
    await deleteMenu(target.id);
    deleteVisible.value = false;
    deleteTarget.value = null;
    await fetchMenus();
  } catch (err) {
    // 存在子菜单等冲突时后端返回 409，透出后端错误信息
    errorMsg.value = err instanceof ApiError ? err.message : t("menus.deleteFailed");
    deleteVisible.value = false;
  } finally {
    deleting.value = false;
  }
}

/** 菜单类型徽章文案 */
function typeLabel(node: MenuTreeNode): string {
  if (node.menuType === "DIR") return t("menus.typeDir");
  if (node.menuType === "MENU") return t("menus.typeMenu");
  return t("menus.typeButton");
}

onMounted(() => {
  fetchMenus();
});
</script>

<template>
  <view class="menus-page">
    <view class="page-header">
      <text class="page-title">{{ t("menus.title") }}</text>
      <text class="page-subtitle">{{ t("menus.subtitle") }}</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" @click="openCreateTop">{{ t("menus.createTopButton") }}</button>
      <button class="secondary-button" :disabled="loading" @click="fetchMenus">{{ t("common.refresh") }}</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchMenus" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">{{ t("menus.columnId") }}</th>
            <th scope="col">{{ t("menus.columnTitle") }}</th>
            <th scope="col">{{ t("menus.columnType") }}</th>
            <th scope="col">{{ t("menus.columnName") }}</th>
            <th scope="col">{{ t("menus.columnPath") }}</th>
            <th scope="col">{{ t("menus.columnComponent") }}</th>
            <th scope="col">{{ t("menus.columnIcon") }}</th>
            <th scope="col">{{ t("menus.columnSort") }}</th>
            <th scope="col">{{ t("menus.columnPermission") }}</th>
            <th scope="col">{{ t("menus.columnStatus") }}</th>
            <th scope="col">{{ t("menus.columnActions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="empty-row">{{ t("common.loading") }}</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="empty-row">{{ t("menus.noData") }}</td>
          </tr>
          <tr v-for="row in rows" :key="row.node.id" class="menu-row">
            <td>{{ row.node.id }}</td>
            <td>
              <span class="tree-title" :style="{ paddingLeft: row.depth * 24 + 'px' }">
                <text v-if="row.depth > 0" class="tree-indent">└ </text>
                {{ row.node.title }}
              </span>
            </td>
            <td>
              <span class="type-badge" :class="row.node.menuType === 'DIR' ? 'type-badge--dir' : 'type-badge--menu'">
                {{ typeLabel(row.node) }}
              </span>
            </td>
            <td class="text-mono">{{ row.node.name }}</td>
            <td class="text-mono">{{ row.node.path }}</td>
            <td class="text-mono">{{ row.node.component ?? "-" }}</td>
            <td>{{ row.node.icon ?? "-" }}</td>
            <td>{{ row.node.sort }}</td>
            <td class="text-mono">{{ row.node.permission ?? "-" }}</td>
            <td>
              <span class="status-badge" :class="row.node.hidden ? 'status-disabled' : 'status-active'">
                {{ row.node.hidden ? t("menus.statusHidden") : t("menus.statusShown") }}
              </span>
            </td>
            <td>
              <view class="action-cell">
                <button class="action-button edit" @click="openEdit(row.node)">{{ t("menus.actionEdit") }}</button>
                <button v-if="row.node.menuType === 'DIR'" class="action-button handle" @click="openCreateChild(row.node)">
                  {{ t("menus.actionCreateChild") }}
                </button>
                <button class="action-button delete" @click="askDelete(row.node)">{{ t("menus.actionDelete") }}</button>
              </view>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 新增/编辑菜单弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal modal-wide">
        <text class="modal-title">{{ formMode === "create" ? t("menus.createTitle") : t("menus.editTitle") }}</text>

        <!-- 菜单类型切换（DIR / MENU） -->
        <view class="form-row">
          <text class="form-label">{{ t("menus.menuTypeLabel") }}</text>
          <view class="role-options">
            <button
              class="role-option"
              :class="{ 'role-option--active': form.menuType === 'DIR' }"
              @click="switchType('DIR')"
            >
              {{ t("menus.dirOption") }}
            </button>
            <button
              class="role-option"
              :class="{ 'role-option--active': form.menuType === 'MENU' }"
              @click="switchType('MENU')"
            >
              {{ t("menus.menuOption") }}
            </button>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.titleLabel") }} <text class="required">*</text></text>
          <input v-model="form.title" class="form-input" type="text" :placeholder="t('menus.titlePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.nameLabel") }} <text class="required">*</text></text>
          <input v-model="form.name" class="form-input" type="text" :placeholder="t('menus.namePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.pathLabel") }} <text class="required">*</text></text>
          <input v-model="form.path" class="form-input" type="text" :placeholder="t('menus.pathPlaceholder')" />
        </view>

        <view v-if="form.menuType === 'MENU'" class="form-row">
          <text class="form-label">{{ t("menus.componentLabel") }} <text class="required">*</text></text>
          <input v-model="form.component" class="form-input" type="text" :placeholder="t('menus.componentPlaceholder')" />
          <text class="modal-hint">{{ t("menus.componentHint") }}</text>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.iconLabel") }}</text>
          <input v-model="form.icon" class="form-input" type="text" :placeholder="t('menus.iconPlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.sortLabel") }}</text>
          <input v-model.number="form.sort" class="form-input" type="number" :placeholder="t('menus.sortPlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t("menus.permissionLabel") }}</text>
          <input v-model="form.permission" class="form-input" type="text" :placeholder="t('menus.permissionPlaceholder')" />
        </view>

        <view class="form-row">
          <label class="radio-item">
            <input v-model="form.hidden" type="checkbox" />
            <text>{{ t("menus.hideInSidebar") }}</text>
          </label>
        </view>

        <text v-if="formError" class="modal-error">{{ formError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">{{ t("common.cancel") }}</button>
          <button class="primary-button" :disabled="saving" @click="handleSubmit">
            {{ saving ? t("menus.saving") : t("common.save") }}
          </button>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      :title="t('menus.deleteTitle')"
      :message="t('menus.deleteMessage', { title: deleteTarget?.title ?? '' })"
      :danger="true"
      :confirming="deleting"
      :confirm-text="t('menus.deleteButton')"
      @confirm="confirmDelete"
      @cancel="deleteVisible = false"
    />
  </view>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.menus-page {
  max-width: 1400px;
}

.modal-wide {
  width: 560px;
  max-width: 92%;
}

.required {
  color: var(--admin-color-danger);
}

.tree-title {
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.tree-indent {
  color: var(--admin-color-text-placeholder);
}

.type-badge {
  display: inline-block;
  padding: var(--admin-space-xs) var(--admin-space-sm);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  font-weight: 500;
}

.type-badge--dir {
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
}

.type-badge--menu {
  background: var(--admin-color-info-soft);
  color: var(--admin-color-info);
}

.role-options {
  display: flex;
  gap: var(--admin-space-sm);
}

.role-option {
  flex: 1;
  height: 36px;
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-container);
  cursor: pointer;
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
}

.role-option--active {
  border-color: var(--admin-color-primary);
  background: var(--admin-color-primary-soft);
  color: var(--admin-color-primary);
  font-weight: 600;
}

.modal-error {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-danger);
}
</style>
