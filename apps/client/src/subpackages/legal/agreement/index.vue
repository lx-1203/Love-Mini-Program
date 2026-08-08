<script setup lang="ts">
/**
 * 用户协议页面（微信小程序提审合规必备）
 *
 * R4-00050：正文逻辑已收敛到共用组件 LegalTextPage（agreement / privacy 两页
 * 95% 重复代码），本页仅声明文本类型与 i18n key 前缀。
 *
 * - 通过 getLegalText(LegalTextType.USER_AGREEMENT) 从后端 CMS 拉取最新用户协议
 * - 后端不可达 / mock 模式 / 返回空时，回退到 i18n 本地 fallback 文案
 */
import { LegalTextType } from "../../../config/legal-texts";
import LegalTextPage from "../../../components/common/LegalTextPage.vue";
</script>

<template>
  <LegalTextPage
    :legal-type="LegalTextType.USER_AGREEMENT"
    i18n-prefix="legal.userAgreement"
  />
</template>
