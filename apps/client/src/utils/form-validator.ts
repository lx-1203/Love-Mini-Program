/**
 * 统一表单校验工具
 *
 * 目的：
 * - 提供常用字段校验器（手机号、邮箱、必填、长度、字数范围等）
 * - 提供 validateForm 组合校验入口，一次校验多个字段并返回首个错误
 * - 避免每个页面重复编写正则与 if-else 校验模板
 *
 * mp-weixin 兼容性：
 * - 不使用 optional catch binding
 * - 不使用 import.meta.env
 * - 纯 TS 实现，无平台 API 依赖
 *
 * 用法：
 * ```ts
 * const result = validateForm([
 *   { value: phone.value, rules: [required("请输入手机号"), phone()] },
 *   { value: code.value, rules: [required("请输入验证码"), length(4, 6, "验证码为4-6位")] },
 * ]);
 * if (!result.valid) {
 *   uni.showToast({ title: result.message!, icon: "none" });
 *   return;
 * }
 * ```
 */

/**
 * 校验结果类型
 * - valid: 是否通过校验
 * - message: 失败时的错误文案（valid=true 时为 null）
 */
export interface ValidationResult {
  valid: boolean;
  message: string | null;
}

/**
 * 校验规则函数类型：接收字段值，返回校验结果
 */
export type ValidationRule = (value: string) => ValidationResult;

/**
 * 单个字段的校验配置
 * - value: 字段当前值
 * - rules: 校验规则数组（按顺序执行，首个失败即返回）
 */
export interface FieldRule {
  value: string;
  rules: ValidationRule[];
}

/**
 * 必填校验：去除首尾空格后非空。
 *
 * @param message - 校验失败时的文案，默认"此项为必填项"
 * @returns 校验规则函数
 */
export function required(message = "此项为必填项"): ValidationRule {
  return (value: string): ValidationResult => {
    if (typeof value !== "string" || value.trim().length === 0) {
      return { valid: false, message };
    }
    return { valid: true, message: null };
  };
}

/**
 * 手机号校验：中国大陆 11 位手机号（1[3-9]xxxxxxxxx）。
 *
 * @param message - 校验失败时的文案，默认"请输入正确的手机号"
 * @returns 校验规则函数
 */
export function phone(message = "请输入正确的手机号"): ValidationRule {
  const PHONE_REGEX = /^1[3-9]\d{9}$/;
  return (value: string): ValidationResult => {
    if (!PHONE_REGEX.test(value)) {
      return { valid: false, message };
    }
    return { valid: true, message: null };
  };
}

/**
 * 验证码校验：4-6 位纯数字。
 *
 * @param message - 校验失败时的文案，默认"验证码为4-6位数字"
 * @returns 校验规则函数
 */
export function code(message = "验证码为4-6位数字"): ValidationRule {
  const CODE_REGEX = /^\d{4,6}$/;
  return (value: string): ValidationResult => {
    if (!CODE_REGEX.test(value)) {
      return { valid: false, message };
    }
    return { valid: true, message: null };
  };
}

/**
 * 长度范围校验：字符串长度（不去空格）必须在 [min, max] 范围内。
 *
 * @param min - 最小长度（含）
 * @param max - 最大长度（含）
 * @param message - 校验失败时的文案
 * @returns 校验规则函数
 */
export function length(min: number, max: number, message?: string): ValidationRule {
  return (value: string): ValidationResult => {
    const len = typeof value === "string" ? value.length : 0;
    if (len < min || len > max) {
      return {
        valid: false,
        message: message || `长度需在${min}-${max}之间`,
      };
    }
    return { valid: true, message: null };
  };
}

/**
 * 最大长度校验：字符串长度（不去空格）不能超过 max。
 *
 * @param max - 最大长度（含）
 * @param message - 校验失败时的文案
 * @returns 校验规则函数
 */
export function maxLength(max: number, message?: string): ValidationRule {
  return (value: string): ValidationResult => {
    const len = typeof value === "string" ? value.length : 0;
    if (len > max) {
      return {
        valid: false,
        message: message || `不能超过${max}个字符`,
      };
    }
    return { valid: true, message: null };
  };
}

/**
 * 邮箱校验：标准邮箱格式。
 *
 * @param message - 校验失败时的文案，默认"请输入正确的邮箱"
 * @returns 校验规则函数
 */
export function email(message = "请输入正确的邮箱"): ValidationRule {
  const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return (value: string): ValidationResult => {
    if (!EMAIL_REGEX.test(value)) {
      return { valid: false, message };
    }
    return { valid: true, message: null };
  };
}

/**
 * 微信号校验：字母开头，6-20 位，仅含字母、数字、下划线、减号。
 *
 * @param message - 校验失败时的文案，默认"请输入正确的微信号"
 * @returns 校验规则函数
 */
export function wechatId(message = "请输入正确的微信号"): ValidationRule {
  const WECHAT_REGEX = /^[A-Za-z][A-Za-z0-9_-]{5,19}$/;
  return (value: string): ValidationResult => {
    if (!WECHAT_REGEX.test(value)) {
      return { valid: false, message };
    }
    return { valid: true, message: null };
  };
}

/**
 * 组合校验：按顺序校验多个字段，返回首个失败项。
 *
 * 行为说明：
 * - 遇到首个失败规则即返回，不再继续校验后续字段/规则
 * - 全部通过时返回 { valid: true, message: null }
 *
 * @param fields - 字段校验配置数组
 * @returns 首个失败项的校验结果，或全部通过的结果
 */
export function validateForm(fields: FieldRule[]): ValidationResult {
  for (const field of fields) {
    for (const rule of field.rules) {
      const result = rule(field.value);
      if (!result.valid) {
        return result;
      }
    }
  }
  return { valid: true, message: null };
}

/**
 * 便捷函数：校验表单，失败时直接 toast 提示并返回 false。
 *
 * 用法：
 * ```ts
 * if (!validateFormOrToast([
 *   { value: phone.value, rules: [required("请输入手机号"), phone()] },
 * ])) {
 *   return;
 * }
 * ```
 *
 * @param fields - 字段校验配置数组
 * @returns 校验通过返回 true，失败（已 toast 提示）返回 false
 */
export function validateFormOrToast(fields: FieldRule[]): boolean {
  const result = validateForm(fields);
  if (!result.valid && result.message) {
    try {
      uni.showToast({
        title: result.message,
        icon: "none",
      });
    } catch (_e) {
      // uni.showToast 在极端环境可能不可用，静默忽略
    }
    return false;
  }
  return true;
}
