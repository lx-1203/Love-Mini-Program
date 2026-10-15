<script setup lang="ts">
/**
 * 数据域横幅：让管理员随时看得见「我是谁、能看到哪些人的数据、能不能改」。
 *
 * 为什么需要它：三级角色与圈层绑定此前只存在于后端，界面上没有任何地方说明
 * 当前账号的可见范围，运营只能靠点一次吃 403 来理解权限边界。
 * 空校区的 ADMIN/AUDITOR 在后端是 fail-closed（读不到任何校区数据），
 * 这里也必须显式显示「未绑定管辖范围」，不能显示成空白让人误判成全局可见。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../stores/session";

const { t } = useI18n();
const sessionStore = useSessionStore();

const role = computed(() => String(sessionStore.user?.role || "").toUpperCase());

const roleLabel = computed(() => {
  switch (role.value) {
    case "SUPER_ADMIN":
      return t("scopeBanner.roleSuper");
    case "AUDITOR":
      return t("scopeBanner.roleAuditor");
    case "ADMIN":
      return t("scopeBanner.roleCampusAdmin");
    default:
      return role.value || t("scopeBanner.roleUnknown");
  }
});

const scopeLabel = computed(() => {
  if (role.value === "SUPER_ADMIN") return t("scopeBanner.scopeAll");
  const campus = String(sessionStore.user?.campusName || "").trim();
  return campus || t("scopeBanner.scopeUnbound");
});
</script>

<template>
  <div class="scope-banner" role="status">
    <span class="scope-banner__item">
      {{ t("scopeBanner.identity") }}：<b>{{ roleLabel }}</b>
    </span>
    <span class="scope-banner__sep">·</span>
    <span class="scope-banner__item">
      {{ t("scopeBanner.dataScope") }}：<b>{{ scopeLabel }}</b>
    </span>
    <span class="scope-banner__sep">·</span>
    <span
      class="scope-banner__item"
      :class="{ 'scope-banner__item--ro': !sessionStore.canWrite }"
    >{{ sessionStore.canWrite ? t("scopeBanner.canWrite") : t("scopeBanner.readOnly") }}</span>
  </div>
</template>

<style scoped>
.scope-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--admin-space-sm);
  margin: 0 0 var(--admin-space-md);
  padding: 8px 12px;
  background: var(--admin-color-bg-tertiary);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-md);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-secondary);
}
.scope-banner__item b {
  color: var(--admin-color-text-primary);
  font-weight: 600;
}
.scope-banner__sep {
  color: var(--admin-color-text-tertiary);
}
.scope-banner__item--ro {
  color: var(--admin-color-warning, #9a6b15);
}
</style>
