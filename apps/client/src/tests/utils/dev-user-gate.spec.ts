import { describe, expect, it, vi } from "vitest";

vi.mock("../../config/env", () => ({
  isDev: false,
  isMockMode: () => false,
}));

import { isDevUserEntryAllowed } from "../../utils/dev-user-gate";

describe("dev-user 演示入口生产门禁", () => {
  it("real 生产环境（非 dev、非 mock）不得启用 dev-user 注入", () => {
    expect(isDevUserEntryAllowed()).toBe(false);
  });
});
