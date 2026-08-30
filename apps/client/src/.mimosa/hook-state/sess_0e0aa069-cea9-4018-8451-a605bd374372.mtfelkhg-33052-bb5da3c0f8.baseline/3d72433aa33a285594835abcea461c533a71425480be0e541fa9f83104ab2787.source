/**
 * 开发调试工具（R4-00154：从 clientApi 业务面移出的 dev 调试端点）。
 *
 * 说明：
 * - simulateError 为 dev 调试用端点（POST /_debug/errors/{status}），
 *   仅供本地联调与测试使用，业务代码禁止调用；
 * - 生产环境调用仅 console.warn 不发起请求（isDev 守卫短路）。
 */
import { request } from "./http";
import { useMock } from "../stores/helpers/use-mock";
import { isDev } from "../config/env";
import { mockFixtures } from "./mocks/fixtures";

/**
 * 触发后端调试错误（仅开发环境可用）。
 *
 * @deprecated infra R2-00121: 该接口为 dev 调试用端点（POST /_debug/errors/{status}），
 * 已由 isDev 守卫短路保护（生产环境调用仅 console.warn 不发起请求）。
 * 目前仅 tests/error-state.spec.ts 引用；业务代码禁止调用。
 */
export async function simulateError(status: 400 | 404 | 500) {
  // 修复（P1 BUG）：环境守卫——simulateError 是 dev 调试用接口，
  // 生产环境调用会向后端 /_debug/errors 发无效请求，这里直接短路返回
  //（R4-00660：生产守卫分支内不再输出日志，避免生产包噪音）
  if (!isDev) {
    return;
  }
  if (useMock()) {
    return mockFixtures.simulateError(status);
  }
  return request<never>({
    url: `/_debug/errors/${status}`,
    method: "POST",
  });
}
