/**
 * Store 共享：Mock 模式判断
 *
 * 历史：原 19 个 store 各自重复定义了 `function useMock()`，
 * 实现都等价于 `appEnv.apiMode === "mock"`，造成代码重复与
 * 真相源分散（P3 代码风格问题）。
 *
 * 现统一从 `config/env.ts` 的 `isMockMode` 复用单一真相源
 * （修复 R4-00205：已从历史 services/env.ts 迁移至统一入口），
 * 各 store 通过 `import { useMock } from "../helpers/use-mock"` 引用。
 *
 * 注意：保留 `useMock` 命名是为了兼容既有 store action 调用点
 * （如 `if (useMock()) { ... }`），减少无谓的批量改名风险。
 */

import { isMockMode } from "../../config/env";

/**
 * 判断当前是否为 Mock 模式。
 *
 * @returns true 表示当前为 mock 模式（不走真实后端 API）
 */
export const useMock: () => boolean = isMockMode;

export default useMock;
