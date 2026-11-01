package com.campuslove.api.privacy;

/**
 * 注销清除清单里<b>一条语句的作用面归因</b>（第六轮 W1c 事项三）。
 *
 * <p>来历：E2（第六轮数据轨）用零写入路线（逐条 {@code PREPARE} + {@code information_schema}）量到
 * 清单的 76 条语句语法与对象全合格，但其中 <b>32 条今天必然影响 0 行</b>——「跑得到、改不到」。
 * 这件事此前只活在注释里，因此语义不明：一条恒 0 的语句到底是
 * 「表还活着、这个快照里恰好没数据」还是「这张表根本没人写、语句永久空转」，
 * 读者无法分辨，后来者也就无从判断该撤项还是该留项。</p>
 *
 * <p>本枚举把那 32 条（以及另外 44 条）拆成<b>两个正交轴</b>，每个轴各自有一种载体能验：
 * <ul>
 *   <li><b>写点轴</b>（代码里到底有没有人往这张表写）——纯静态可判：
 *       {@code ErasureSurfaceAndOrderingGateTest} 扫 {@code apps/api/src/main} 自己派生，
 *       与这里的声明必须一致 ⇒ CI 里就能红；</li>
 *   <li><b>行数轴</b>（本快照这张表有没有行）——只有真库可判 ⇒ 同一道门里那条 DB-gated 判点
 *       （{@code -Derasure.db.enabled=true} 时读仓库根 {@code .env} 连只读库）负责，
 *       CI 无库时按 {@code assumption} 跳过而不是假绿。</li>
 * </ul>
 *
 * <p>与本轮要求的三类的对应关系：</p>
 * <ul>
 *   <li>{@link #LIVE_WRITTEN} = 「活表有数据」；</li>
 *   <li>{@link #EMPTY_WRITTEN} = 「本快照无数据但写点在」；</li>
 *   <li>{@link #DEAD_TABLE} = 「代码级死表」；</li>
 *   <li>{@link #LIVE_UNWRITTEN} 是第 4 格（有行、代码无写点：种子/遗留数据）。
 *       本轮实测本清单里 0 项落这格，但它必须是合法值——否则「写点轴」与「行数轴」的正交性
 *       会变成一句口号，而 2×2 缺角正是下一轮把遗留行判成死表的路径。</li>
 * </ul>
 *
 * <p>不变量（由 {@code ErasureSurfaceAndOrderingGateTest} 钉住）：
 * {@code 代码写点数 == 0 ⇔ 声明为 DEAD_TABLE 或 LIVE_UNWRITTEN}；
 * {@code 写点数 >= 1 ⇔ 声明为 LIVE_WRITTEN 或 EMPTY_WRITTEN}；
 * {@code 本快照行数 > 0 ⇔ 声明为 LIVE_WRITTEN 或 LIVE_UNWRITTEN}。
 * 因此把任意一项的归因改成错的类别，至少会炸掉一条判点（写点轴的错在 CI 就能炸）。</p>
 */
public enum ErasureStatementSurface {

    /** 本快照有行 + 代码有写点：这条语句今天就能命中，真删/真匿名。 */
    LIVE_WRITTEN("活表有数据（写点在）"),

    /** 本快照 0 行 + 代码有写点：本轮恒 0，但不是死代码，写点一旦落数据它就生效。 */
    EMPTY_WRITTEN("本快照无数据，写点在"),

    /** 本快照 0 行 + 代码无写点：死表。清单项留还是撤，必须逐张裁定（见各清单项 rationale）。 */
    DEAD_TABLE("代码级死表"),

    /** 本快照有行 + 代码无写点：种子/历史遗留数据（本轮实测 0 项，保留该格以保 2×2 正交）。 */
    LIVE_UNWRITTEN("有遗留行但代码无写点");

    /** 给人读的中文口径（交付报告与本枚举一一对应）。 */
    private final String chineseLabel;

    ErasureStatementSurface(String chineseLabel) {
        this.chineseLabel = chineseLabel;
    }

    public String chineseLabel() {
        return chineseLabel;
    }

    /** 声明「本快照有行」的两个类别（行数轴为真）。 */
    public boolean rowsPresent() {
        return this == LIVE_WRITTEN || this == LIVE_UNWRITTEN;
    }

    /** 声明「代码有写点」的两个类别（写点轴为真）。 */
    public boolean hasWriters() {
        return this == LIVE_WRITTEN || this == EMPTY_WRITTEN;
    }
}
