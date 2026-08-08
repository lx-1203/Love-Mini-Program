package com.campuslove.api.mock;

/**
 * mock 演示数据公共常量（R4-00402/00430 收敛）。
 *
 * <p>mock 用户校区等演示数据原先在多个 mock 服务中硬编码字面量
 * （MockVillageService / MockCampusService / MockCampusCertificationService /
 * MockRuntimeState），换校区需逐处修改且容易漏改导致 mock 行为与配置脱节。
 * 统一收敛到本类后，演示校区调整只需改一处。</p>
 */
public final class MockDemoConstants {

    /** mock 用户校区名（与 MockRuntimeState 的 campusProfile 联动） */
    public static final String MOCK_CAMPUS_NAME = "南校区";

    private MockDemoConstants() {
        // 禁止实例化
    }
}
