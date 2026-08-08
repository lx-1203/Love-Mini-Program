/**
 * useRequestRace composable 单元测试（R4-00481）。
 *
 * 覆盖：序号递增、isStale 过期语义（模拟快速连续请求时旧响应被丢弃）。
 */
import { describe, expect, it } from "vitest";
import { useRequestRace } from "./useRequestRace";

describe("useRequestRace", () => {
  it("nextSeq 从 1 开始递增", () => {
    const { nextSeq } = useRequestRace();
    expect(nextSeq()).toBe(1);
    expect(nextSeq()).toBe(2);
    expect(nextSeq()).toBe(3);
  });

  it("新请求未发出时当前序号不过期", () => {
    const { nextSeq, isStale } = useRequestRace();
    const seq = nextSeq();
    expect(isStale(seq)).toBe(false);
  });

  it("新请求发出后旧序号被判定为过期", () => {
    const { nextSeq, isStale } = useRequestRace();
    const first = nextSeq();
    const second = nextSeq();
    expect(isStale(first)).toBe(true);
    expect(isStale(second)).toBe(false);
  });

  it("模拟快速连续请求：仅最新响应不被丢弃（成功/异常/finally 守卫语义）", async () => {
    const { nextSeq, isStale } = useRequestRace();
    let loading = false;
    let list: number[] = [];

    // 模拟两个并发请求：请求 A（慢）后于请求 B（快）返回
    const seqA = nextSeq(); // fetch A
    const seqB = nextSeq(); // fetch B（用户又触发了一次）

    const slowResponse = async (): Promise<number[]> => {
      await new Promise((r) => setTimeout(r, 30));
      return [1, 2, 3];
    };
    const fastResponse = async (): Promise<number[]> => {
      await new Promise((r) => setTimeout(r, 5));
      return [9];
    };

    // 请求 B 完成
    const resultB = await fastResponse();
    if (!isStale(seqB)) {
      list = resultB;
      loading = false;
    }
    expect(list).toEqual([9]);
    expect(loading).toBe(false);

    // 请求 A（旧）后返回：应被丢弃，不覆盖新数据
    const resultA = await slowResponse();
    if (!isStale(seqA)) {
      list = resultA;
    }
    expect(list).toEqual([9]);
  });

  it("独立实例互不干扰（多竞态流场景）", () => {
    const listRace = useRequestRace();
    const txRace = useRequestRace();
    const listSeq = listRace.nextSeq();
    txRace.nextSeq(); // 流水流推进不影响列表流
    expect(listRace.isStale(listSeq)).toBe(false);
  });
});
