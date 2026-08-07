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
    errorMsg.value = err instanceof ApiError ? err.message : "加载菜单列表失败";
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
    formError.value = "菜单标题不能为空";
    return;
  }
  if (!form.value.name.trim()) {
    formError.value = "路由名称（name）不能为空";
    return;
  }
  if (!form.value.path.trim()) {
    formError.value = "路由路径（path）不能为空";
    return;
  }
  if (form.value.menuType === "MENU" && !form.value.component.trim()) {
    formError.value = "菜单类型必须填写组件路径";
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
    formError.value = err instanceof ApiError ? err.message : "保存失败，请重试";
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
    errorMsg.value = err instanceof ApiError ? err.message : "删除失败，请重试";
    deleteVisible.value = false;
  } finally {
    deleting.value = false;
  }
}

/** 菜单类型徽章文案 */
function typeLabel(node: MenuTreeNode): string {
  if (node.menuType === "DIR") return "目录";
  if (node.menuType === "MENU") return "菜单";
  return "按钮";
}

onMounted(() => {
  fetchMenus();
});
</script>

<template>
  <view class="menus-page">
    <view class="page-header">
      <text class="page-title">菜单管理</text>
      <text class="page-subtitle">配置后台菜单树与路由（顶级目录 → 子菜单）</text>
    </view>

    <view class="toolbar">
      <button class="primary-button" @click="openCreateTop">新增顶级菜单</button>
      <button class="secondary-button" :disabled="loading" @click="fetchMenus">刷新</button>
    </view>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="fetchMenus" />

    <view class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">菜单标题</th>
            <th scope="col">类型</th>
            <th scope="col">路由名称</th>
            <th scope="col">路由路径</th>
            <th scope="col">组件</th>
            <th scope="col">图标</th>
            <th scope="col">排序</th>
            <th scope="col">权限标识</th>
            <th scope="col">状态</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="empty-row">加载中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="empty-row">暂无菜单，点击「新增顶级菜单」创建</td>
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
                {{ row.node.hidden ? "隐藏" : "显示" }}
              </span>
            </td>
            <td>
              <view class="action-cell">
                <button class="action-button edit" @click="openEdit(row.node)">编辑</button>
                <button v-if="row.node.menuType === 'DIR'" class="action-button handle" @click="openCreateChild(row.node)">
                  新增子菜单
                </button>
                <button class="action-button delete" @click="askDelete(row.node)">删除</button>
              </view>
            </td>
          </tr>
        </tbody>
      </table>
    </view>

    <!-- 新增/编辑菜单弹窗 -->
    <view v-if="formVisible" class="modal-mask" @click.self="closeForm">
      <view class="modal modal-wide">
        <text class="modal-title">{{ formMode === "create" ? "新增菜单" : "编辑菜单" }}</text>

        <!-- 菜单类型切换（DIR / MENU） -->
        <view class="form-row">
          <text class="form-label">菜单类型</text>
          <view class="role-options">
            <button
              class="role-option"
              :class="{ 'role-option--active': form.menuType === 'DIR' }"
              @click="switchType('DIR')"
            >
              目录（分组）
            </button>
            <button
              class="role-option"
              :class="{ 'role-option--active': form.menuType === 'MENU' }"
              @click="switchType('MENU')"
            >
              菜单（页面）
            </button>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">菜单标题 <text class="required">*</text></text>
          <input v-model="form.title" class="form-input" type="text" placeholder="如：系统管理" />
        </view>

        <view class="form-row">
          <text class="form-label">路由名称 name <text class="required">*</text></text>
          <input v-model="form.name" class="form-input" type="text" placeholder="如：Menus（唯一）" />
        </view>

        <view class="form-row">
          <text class="form-label">路由路径 path <text class="required">*</text></text>
          <input v-model="form.path" class="form-input" type="text" placeholder="如：/system/menus" />
        </view>

        <view v-if="form.menuType === 'MENU'" class="form-row">
          <text class="form-label">组件路径 <text class="required">*</text></text>
          <input v-model="form.component" class="form-input" type="text" placeholder="如：views/system/Menus.vue" />
          <text class="modal-hint">目录类型无需填写组件路径</text>
        </view>

        <view class="form-row">
          <text class="form-label">图标</text>
          <input v-model="form.icon" class="form-input" type="text" placeholder="图标标识（可选）" />
        </view>

        <view class="form-row">
          <text class="form-label">排序号</text>
          <input v-model.number="form.sort" class="form-input" type="number" placeholder="0" />
        </view>

        <view class="form-row">
          <text class="form-label">权限标识</text>
          <input v-model="form.permission" class="form-input" type="text" placeholder="如：system:menu:add（可选）" />
        </view>

        <view class="form-row">
          <label class="radio-item">
            <input v-model="form.hidden" type="checkbox" />
            <text>在侧边栏隐藏该菜单</text>
          </label>
        </view>

        <text v-if="formError" class="modal-error">{{ formError }}</text>

        <view class="modal-actions">
          <button class="ghost-button" :disabled="saving" @click="closeForm">取消</button>
          <button class="primary-button" :disabled="saving" @click="handleSubmit">
            {{ saving ? "保存中..." : "保存" }}
          </button>
        </view>
      </view>
    </view>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-model:visible="deleteVisible"
      title="删除菜单"
      :message="`确定要删除菜单「${deleteTarget?.title ?? ''}」吗？目录下存在子菜单时后端将拒绝删除。`"
      :danger="true"
      :confirming="deleting"
      confirm-text="删除"
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
