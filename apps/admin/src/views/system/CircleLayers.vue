```vue
<script setup lang="ts">
/**
 * Admin v2 圈层管理视图（RBAC 三级圈层 - Frame 01/08）。
 *
 * 功能：
 * - 三级圈层结构图（L1 公司 / L2 区域 / L3 学校）按色阶展示
 * - 圈层 CRUD（创建/编辑/删除/启用停用）
 * - 圈层下钻（Frame 04/05）：点圈层显示其下属所有用户
 * - 调阅证据（Frame 09）：跳转举报管理
 */
import { ref, computed, onMounted } from "vue";
import {
  listAllLayers,
  buildLayerTree,
  getLayerDescendants,
  getUsersInCircle,
  type CircleLayer,
  type CircleLevel,
  type CircleUser,
} from "../../api/circle";
import ErrorState from "../../components/ErrorState.vue";
import { useRequestRace } from "../../composables/useRequestRace";

// 圈层扁平列表（用于详情与下钻）
const allLayers = ref<CircleLayer[]>([]);
const loading = ref(false);
const errorMsg = ref("");

// 树形结构
const treeData = computed(() => buildLayerTree(allLayers.value));

// 选中的圈层
const selectedLayer = ref<CircleLayer | null>(null);
const descendants = ref<CircleLayer[]>([]);
const usersInCircle = ref<CircleUser[]>([]);
const detailLoading = ref(false);

// 圈层级别筛选
const levelFilter = ref<CircleLevel | 0>(0); // 0=全部

// 过滤后的树
const filteredTree = computed(() => {
  if (!levelFilter.value) return treeData.value;
  const lvl = levelFilter.value;
  const filterByLevel = (nodes: CircleLayer[]): CircleLayer[] => {
    const result: CircleLayer[] = [];
    for (const n of nodes) {
      if (n.level === lvl) {
        result.push(n);
      } else if (n.children && n.children.length > 0) {
        const filtered = filterByLevel(n.children);
        if (filtered.length > 0) {
          result.push({ ...n, children: filtered });
        }
      }
    }
    return result;
  };
  return filterByLevel(treeData.value);
});

const { nextSeq, isStale } = useRequestRace();

onMounted(() => {
  void loadAll();
});

async function loadAll() {
  loading.value = true;
  errorMsg.value = "";
  const seq = nextSeq();
  try {
    const result = await listAllLayers();
    if (isStale(seq)) return;
    allLayers.value = result;
  } catch (e: unknown) {
    if (isStale(seq)) return;
    errorMsg.value = e instanceof Error ? e.message : "加载圈层失败";
  } finally {
    if (!isStale(seq)) loading.value = false;
  }
}

async function selectLayer(layer: CircleLayer) {
  selectedLayer.value = layer;
  detailLoading.value = true;
  try {
    const [desc, users] = await Promise.all([
      getLayerDescendants(layer.id).catch(() => []),
      getUsersInCircle(layer.id).catch(() => []),
    ]);
    descendants.value = desc;
    usersInCircle.value = users;
  } finally {
    detailLoading.value = false;
  }
}

function badgeText(level: CircleLevel): string {
  return level === 1 ? "L1 公司" : level === 2 ? "L2 区域" : "L3 学校";
}

function levelBadgeClass(level: CircleLevel): string {
  return `layer-badge layer-badge--lv${level}`;
}
</script>

<template>
  <div class="circle-page">
    <div class="page-header">
      <h1 class="page-title">RBAC 三级圈层</h1>
      <p class="page-subtitle">
        校园恋爱管理后台 · L1 公司 / L2 区域 / L3 学校 · 管辖范围前缀匹配
      </p>
    </div>

    <!-- 三级管理圈层总览（design Frame 08：cobalt 由深到浅三道色阶 + 管辖内容可见性表） -->
    <div class="grade-card">
      <div class="grade-card__header">
        <h2 class="grade-card__title">管理员等级 · 三级管理圈层</h2>
        <span class="grade-card__note">三级管理圈层（上层可下钻查看下层全部内容）</span>
      </div>
      <div class="grade-bars">
        <div class="grade-bar grade-bar--l1">
          <span class="grade-bar__name">公司管理级</span>
          <span class="grade-bar__desc">全平台最高权限 · 可下钻查看所有区域与学校</span>
        </div>
        <div class="grade-bar grade-bar--l2">
          <span class="grade-bar__name">区域管理</span>
          <span class="grade-bar__desc">如华北 / 华东 / 华南 · 可见本区域全部学校、用户与内容</span>
        </div>
        <div class="grade-bar grade-bar--l3">
          <span class="grade-bar__name">学校管理</span>
          <span class="grade-bar__desc">各大高校各派一名管理员 · 仅可见本校用户与内容</span>
        </div>
      </div>
      <div class="grade-table-header">管辖内容可见性（举报时可直接调阅用户产生内容）</div>
      <table class="grade-table">
        <thead>
          <tr>
            <th>层级</th>
            <th>可见用户范围</th>
            <th>聊天内容</th>
            <th>上传图片</th>
            <th>帖子</th>
            <th>临时聊天</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="grade-table__level grade-table__level--l1">公司管理级</td>
            <td>全平台全部用户</td>
            <td>✓ 全量</td><td>✓ 全量</td><td>✓ 全量</td><td>✓ 全量</td>
          </tr>
          <tr>
            <td class="grade-table__level grade-table__level--l2">区域管理</td>
            <td>本区域用户</td>
            <td>✓ 本区域</td><td>✓ 本区域</td><td>✓ 本区域</td><td>✓ 本区域</td>
          </tr>
          <tr>
            <td class="grade-table__level grade-table__level--l3">学校管理</td>
            <td>本校用户</td>
            <td>✓ 本校</td><td>✓ 本校</td><td>✓ 本校</td><td>✓ 本校</td>
          </tr>
        </tbody>
      </table>
      <p class="grade-footnote">
        层级可见性：公司级 &gt; 区域级 &gt; 学校级。上层管理员默认可下钻查看其下级圈层内全部用户产生的聊天内容、上传图片、帖子与临时聊天，便于举报时直接调阅取证。
      </p>
    </div>

    <div class="toolbar">
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': levelFilter === 0 }"
        @click="levelFilter = 0"
      >全部</button>
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': levelFilter === 1 }"
        @click="levelFilter = 1"
      >L1 公司</button>
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': levelFilter === 2 }"
        @click="levelFilter = 2"
      >L2 区域</button>
      <button
        class="filter-btn"
        :class="{ 'filter-btn--active': levelFilter === 3 }"
        @click="levelFilter = 3"
      >L3 学校</button>
      <button class="refresh-btn" @click="loadAll">刷新</button>
    </div>

    <ErrorState v-if="errorMsg" :message="errorMsg" @retry="loadAll" />

    <div v-else class="circle-layout">
      <!-- 左侧：圈层结构树 -->
      <div class="circle-tree-panel">
        <h2 class="panel-title">圈层结构图</h2>
        <div v-if="loading" class="loading-tip">加载中...</div>
        <div v-else-if="filteredTree.length === 0" class="empty-tip">暂无圈层数据</div>
        <div v-else class="tree-list">
          <div
            v-for="node in filteredTree"
            :key="node.id"
            class="tree-node"
          >
            <div
              class="tree-node__row"
              :class="{ 'tree-node__row--selected': selectedLayer?.id === node.id }"
              :style="{ borderLeftColor: node.color }"
              @click="selectLayer(node)"
            >
              <span :class="levelBadgeClass(node.level)">{{ badgeText(node.level) }}</span>
              <span class="tree-node__name">{{ node.name }}</span>
              <span class="tree-node__path">{{ node.circlePath }}</span>
            </div>
            <div v-if="node.children && node.children.length > 0" class="tree-children">
              <div
                v-for="child in node.children"
                :key="child.id"
                class="tree-node tree-node--child"
              >
                <div
                  class="tree-node__row"
                  :class="{ 'tree-node__row--selected': selectedLayer?.id === child.id }"
                  :style="{ borderLeftColor: child.color }"
                  @click="selectLayer(child)"
                >
                  <span :class="levelBadgeClass(child.level)">{{ badgeText(child.level) }}</span>
                  <span class="tree-node__name">{{ child.name }}</span>
                  <span class="tree-node__path">{{ child.circlePath }}</span>
                </div>
                <div v-if="child.children && child.children.length > 0" class="tree-children">
                  <div
                    v-for="grand in child.children"
                    :key="grand.id"
                    class="tree-node tree-node--grand"
                  >
                    <div
                      class="tree-node__row"
                      :class="{ 'tree-node__row--selected': selectedLayer?.id === grand.id }"
                      :style="{ borderLeftColor: grand.color }"
                      @click="selectLayer(grand)"
                    >
                      <span :class="levelBadgeClass(grand.level)">{{ badgeText(grand.level) }}</span>
                      <span class="tree-node__name">{{ grand.name }}</span>
                      <span class="tree-node__path">{{ grand.circlePath }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：圈层详情 -->
      <div class="circle-detail-panel">
        <h2 class="panel-title">圈层详情</h2>
        <div v-if="!selectedLayer" class="empty-tip">← 请选择左侧圈层查看详情</div>
        <div v-else class="detail-content">
          <div class="detail-header">
            <div>
              <span :class="levelBadgeClass(selectedLayer.level)">
                {{ badgeText(selectedLayer.level) }}
              </span>
              <h3 class="detail-name">{{ selectedLayer.name }}</h3>
              <p class="detail-path">圈层路径：<code>{{ selectedLayer.circlePath }}</code></p>
              <p class="detail-color">色阶：<span :style="{ color: selectedLayer.color, fontWeight: 600 }">{{ selectedLayer.color }}</span></p>
              <p class="detail-status">
                状态：
                <span :class="['status-tag', selectedLayer.status === 'active' ? 'status-tag--ok' : 'status-tag--off']">
                  {{ selectedLayer.status === 'active' ? '启用' : '停用' }}
                </span>
              </p>
            </div>
          </div>

          <!-- 下属圈层 -->
          <section class="detail-section">
            <h4>下属圈层（Frame 04）</h4>
            <div v-if="detailLoading" class="loading-tip">加载中...</div>
            <div v-else-if="descendants.length === 0" class="empty-tip">无下属圈层</div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>级别</th>
                  <th>圈层</th>
                  <th>路径</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in descendants" :key="d.id">
                  <td><span :class="levelBadgeClass(d.level)">{{ badgeText(d.level) }}</span></td>
                  <td>{{ d.name }}</td>
                  <td><code>{{ d.circlePath }}</code></td>
                  <td>
                    <span :class="['status-tag', d.status === 'active' ? 'status-tag--ok' : 'status-tag--off']">
                      {{ d.status === 'active' ? '启用' : '停用' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 圈层用户 -->
          <section class="detail-section">
            <h4>管辖用户（Frame 05）</h4>
            <div v-if="detailLoading" class="loading-tip">加载中...</div>
            <div v-else-if="usersInCircle.length === 0" class="empty-tip">无管辖用户</div>
            <table v-else class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>昵称</th>
                  <th>角色</th>
                  <th>学校</th>
                  <th>圈层路径</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in usersInCircle" :key="u.id">
                  <td>{{ u.id }}</td>
                  <td>{{ u.nickname || u.openid.slice(0, 12) }}</td>
                  <td><span class="role-tag">{{ u.role || 'USER' }}</span></td>
                  <td>{{ u.campusName || '—' }}</td>
                  <td><code>{{ u.circlePath || '—' }}</code></td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.circle-page {
  padding: var(--admin-space-section);
  background: var(--admin-color-bg-page);
  min-height: 100vh;
}

.toolbar {
  display: flex;
  gap: var(--admin-space-sm);
  margin-bottom: var(--admin-space-lg);
  align-items: center;
}

.filter-btn {
  padding: 6px 14px;
  border-radius: var(--admin-radius-md);
  border: 1px solid var(--admin-color-border);
  background: white;
  font-size: var(--admin-font-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn--active {
  background: var(--admin-color-primary);
  color: white;
  border-color: var(--admin-color-primary);
}

.refresh-btn {
  margin-left: auto;
  padding: 6px 14px;
  border-radius: var(--admin-radius-md);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  cursor: pointer;
  font-size: var(--admin-font-sm);
}

.circle-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: var(--admin-space-xl);
}

.circle-tree-panel,
.circle-detail-panel {
  background: var(--admin-color-bg-container);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-xl);
  box-shadow: var(--admin-shadow-sm);
  min-height: 600px;
}

.panel-title {
  font-size: var(--admin-font-xl);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-lg);
  padding-bottom: var(--admin-space-sm);
  border-bottom: 2px solid var(--admin-color-border-light);
}

.tree-list {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xs);
}

.tree-node__row {
  display: flex;
  align-items: center;
  gap: var(--admin-space-md);
  padding: 10px 12px;
  border-left: 4px solid transparent;
  border-radius: var(--admin-radius-md);
  cursor: pointer;
  transition: background 0.15s;
  background: var(--admin-color-bg-subtle);
}

.tree-node__row:hover {
  background: var(--admin-color-primary-soft);
}

.tree-node__row--selected {
  background: var(--admin-color-primary-soft);
  border-left-width: 4px;
}

.tree-children {
  margin-left: 28px;
  margin-top: 4px;
  padding-left: 12px;
  border-left: 2px dashed var(--admin-color-border-light);
}

.tree-node--child .tree-node__row,
.tree-node--grand .tree-node__row {
  background: white;
}

.tree-node__name {
  flex: 1;
  font-size: var(--admin-font-md);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.tree-node__path {
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
  font-family: monospace;
  background: white;
  padding: 2px 8px;
  border-radius: var(--admin-radius-sm);
  border: 1px solid var(--admin-color-border-light);
}

.layer-badge {
  font-size: var(--admin-font-xs);
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--admin-radius-sm);
  color: white;
}

.layer-badge--lv1 { background: #0064e0; }
.layer-badge--lv2 { background: #5b99ef; }
.layer-badge--lv3 { background: #c7def7; color: #1f4d8a; }

.detail-header {
  display: flex;
  align-items: center;
  gap: var(--admin-space-lg);
  margin-bottom: var(--admin-space-xl);
  padding-bottom: var(--admin-space-lg);
  border-bottom: 1px solid var(--admin-color-border-light);
}

.detail-name {
  display: inline-block;
  margin-left: 12px;
  font-size: var(--admin-font-xxl);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  vertical-align: middle;
}

.detail-path,
.detail-color,
.detail-status {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
  margin: 6px 0;
}

.detail-path code,
.detail-color code {
  background: var(--admin-color-bg-subtle);
  padding: 2px 6px;
  border-radius: var(--admin-radius-sm);
  font-family: monospace;
}

.detail-section {
  margin-top: var(--admin-space-xl);
}

.detail-section h4 {
  font-size: var(--admin-font-lg);
  font-weight: 700;
  color: var(--admin-color-text-primary);
  margin-bottom: var(--admin-space-md);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--admin-font-sm);
}

.data-table th {
  text-align: left;
  background: var(--admin-color-bg-subtle);
  color: var(--admin-color-text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--admin-color-border);
}

.data-table td {
  border-bottom: 1px solid var(--admin-color-border-light);
  color: var(--admin-color-text-primary);
}

.data-table code {
  font-family: monospace;
  font-size: var(--admin-font-xs);
  background: var(--admin-color-bg-subtle);
  padding: 2px 6px;
  border-radius: var(--admin-radius-sm);
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: var(--admin-font-xs);
  font-weight: 600;
  border-radius: var(--admin-radius-sm);
}

.status-tag--ok { background: var(--admin-color-success-soft); color: var(--admin-color-success); }
.status-tag--off { background: var(--admin-color-danger-soft); color: var(--admin-color-danger); }

.role-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: var(--admin-font-xs);
  background: var(--admin-color-accent-soft);
  color: var(--admin-color-accent);
  border-radius: var(--admin-radius-sm);
  font-weight: 600;
}

.loading-tip,
.empty-tip {
  text-align: center;
  color: var(--admin-color-text-quaternary);
  padding: var(--admin-space-xxxl);
  font-size: var(--admin-font-md);
}
/* ========== 三级管理圈层总览卡（Frame 08） ========== */

.grade-card {
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
  padding: var(--admin-space-lg) var(--admin-space-xl) var(--admin-space-md);
  margin-bottom: var(--admin-space-xxl);
}

.grade-card__header {
  display: flex;
  align-items: baseline;
  gap: var(--admin-space-md);
  margin-bottom: var(--admin-space-md);
  flex-wrap: wrap;
}

.grade-card__title {
  margin: 0;
  font-size: var(--admin-font-lg);
  font-weight: 600;
  color: var(--admin-color-text-primary);
}

.grade-card__note {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
}

/* 三道逐级缩进色阶层（#0064e0 → #5b99ef → #c7def7） */
.grade-bars {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-sm);
  margin-bottom: var(--admin-space-lg);
}

.grade-bar {
  display: flex;
  align-items: center;
  gap: var(--admin-space-xl);
  height: 44px;
  padding: 0 var(--admin-space-lg);
  border-radius: var(--admin-radius-md);
}

.grade-bar__name {
  font-size: var(--admin-font-lg);
  font-weight: 600;
  white-space: nowrap;
}

.grade-bar__desc {
  font-size: var(--admin-font-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grade-bar--l1 {
  background: #0064e0;
  color: #ffffff;
}

.grade-bar--l1 .grade-bar__desc {
  color: rgba(255, 255, 255, 0.92);
}

.grade-bar--l2 {
  margin-left: var(--admin-space-xxxl);
  background: #5b99ef;
  color: #ffffff;
}

.grade-bar--l2 .grade-bar__desc {
  color: rgba(255, 255, 255, 0.92);
}

.grade-bar--l3 {
  margin-left: calc(var(--admin-space-xxxl) * 2);
  background: #c7def7;
  color: var(--admin-color-text-primary);
}

.grade-bar--l3 .grade-bar__desc {
  color: var(--admin-color-text-secondary);
}

.grade-table-header {
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-secondary);
  margin-bottom: var(--admin-space-sm);
}

.grade-table {
  width: 100%;
  border-collapse: collapse;
}

.grade-table th {
  height: 40px;
  padding: 0 var(--admin-space-lg);
  background: var(--admin-color-bg-subtle);
  font-size: var(--admin-font-sm);
  font-weight: 600;
  color: var(--admin-color-text-secondary);
  text-align: left;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.grade-table td {
  height: 44px;
  padding: 0 var(--admin-space-lg);
  font-size: var(--admin-font-lg);
  color: var(--admin-color-text-primary);
  border-bottom: 1px solid var(--admin-color-bg-page);
}

.grade-table tbody tr:last-child td {
  border-bottom: none;
}

.grade-table__level {
  font-weight: 600;
}

.grade-table__level--l1 {
  color: #0064e0;
}

.grade-table__level--l2 {
  color: #5b99ef;
}

.grade-table__level--l3 {
  color: var(--admin-color-text-primary);
}

/* 勾选标记列绿色（✓ 全量 / 本区域 / 本校） */
.grade-table td:nth-child(n + 3) {
  color: var(--admin-color-success);
}

.grade-footnote {
  margin: var(--admin-space-md) 0 0;
  font-size: var(--admin-font-sm);
  line-height: 20px;
  color: var(--admin-color-text-tertiary);
}
</style>
```
