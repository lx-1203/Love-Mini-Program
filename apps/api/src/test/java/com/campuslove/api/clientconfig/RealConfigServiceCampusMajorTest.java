package com.campuslove.api.clientconfig;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.campuslove.api.entity.School;
import com.campuslove.api.entity.SchoolMajor;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.SchoolMajorRepository;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

/**
 * 校园专业字典（{@code school_majors}）装配与「按校无数据 ⇒ 回退通用基线」这条新分支的守卫。
 *
 * <p>产品裁定：CampusView.majors 必须有后端真源。当前库里只有 {@code school_code='*'} 的
 * 67 条通用基线，<b>没有任何按校数据</b>（权威来源未导入），所以线上 17 所学校恒定走回退分支。
 * 本类把两件事钉死：</p>
 * <ol>
 *   <li><b>分支真的被走到</b>——按校档命中时下发的必须是按校那几行（不是基线），
 *       按校档缺数时下发的必须是基线档内容，两者用<b>互不相同的桩数据</b>断言，
 *       避免「两边都返回通用目录」的恒真测试；</li>
 *   <li><b>回退不静默</b>——每次回退都要在日志里留下「哪几所、回退到几条基线」，
 *       否则运营无从分辨下发的是按校真值还是兜底目录。</li>
 * </ol>
 */
class RealConfigServiceCampusMajorTest {

    /** 基线档桩数据：刻意与代码级 MajorBaseline.GENERIC 不同，用来证明下发内容来自库而不是常量。 */
    private static final List<String> DB_BASELINE_NAMES = List.of("天文学", "物联网工程", "档案学");

    private final SchoolRepository schoolRepository = mock(SchoolRepository.class);
    private final UserCampusProfileRepository campusProfileRepository = mock(UserCampusProfileRepository.class);
    private final PostRepository postRepository = mock(PostRepository.class);
    private final SchoolMajorRepository schoolMajorRepository = mock(SchoolMajorRepository.class);

    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void captureServiceLogs() {
        logCapture = new ListAppender<>();
        logCapture.start();
        serviceLogger().addAppender(logCapture);
    }

    @AfterEach
    void releaseServiceLogs() {
        serviceLogger().detachAppender(logCapture);
    }

    private static Logger serviceLogger() {
        return (Logger) LoggerFactory.getLogger(RealConfigService.class);
    }

    private RealConfigService service() {
        return new RealConfigService(schoolRepository, campusProfileRepository, postRepository,
                schoolMajorRepository);
    }

    private static School school(String code, String name) {
        School s = new School();
        s.setCode(code);
        s.setName(name);
        return s;
    }

    private static SchoolMajor major(String schoolCode, String name, int sortOrder) {
        return new SchoolMajor(schoolCode, name, sortOrder);
    }

    /** 基线档桩：school_code='*' 的三行（顺序由 sort_order 决定）。 */
    private void baselineHasDbRows() {
        when(schoolMajorRepository.findBySchoolCodeOrderBySortOrderAsc(SchoolMajor.GENERIC_SCHOOL_CODE))
                .thenReturn(List.of(
                        major(SchoolMajor.GENERIC_SCHOOL_CODE, DB_BASELINE_NAMES.get(0), 1),
                        major(SchoolMajor.GENERIC_SCHOOL_CODE, DB_BASELINE_NAMES.get(1), 2),
                        major(SchoolMajor.GENERIC_SCHOOL_CODE, DB_BASELINE_NAMES.get(2), 3)));
    }

    private List<String> loggedMessages() {
        return logCapture.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
    }

    /** 含「回退通用基线」的日志行（回退可观测性的唯一判据）。 */
    private List<String> fallbackLogs() {
        return loggedMessages().stream().filter(m -> m.contains("回退通用基线")).toList();
    }

    @Test
    @DisplayName("按校无专业行 ⇒ 下发基线档内容，并记一行回退日志")
    void schoolWithoutOwnMajorsFallsBackToGenericBaselineAndLogsIt() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学")));
        baselineHasDbRows();
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of());

        CampusView nju = service().loadCampuses().get(0);

        assertEquals(DB_BASELINE_NAMES, nju.majors(), "按校缺数时必须下发基线档内容（取自库，不是代码常量）");
        assertNotEquals(MajorBaseline.GENERIC, nju.majors(), "证明走的是库里的基线，而不是异常兜底的代码常量");
        assertEquals(1, fallbackLogs().size(), "回退必须留下一行日志，不能静默");
        String line = fallbackLogs().get(0);
        assertTrue(line.contains("南京大学") && line.contains("NJU"), "日志要点名是哪所学校: " + line);
        assertTrue(line.contains(String.valueOf(DB_BASELINE_NAMES.size())), "日志要写明回退到几条基线: " + line);
        verify(schoolMajorRepository)
                .findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection());
    }

    @Test
    @DisplayName("按校有专业行 ⇒ 下发按校目录（不是基线），且不记回退日志")
    void schoolWithOwnMajorsUsesThemInsteadOfBaseline() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学")));
        baselineHasDbRows();
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of(
                        major("NJU", "天文学", 1),
                        major("NJU", "软件工程", 2)));

        CampusView nju = service().loadCampuses().get(0);

        assertEquals(List.of("天文学", "软件工程"), nju.majors());
        assertNotEquals(DB_BASELINE_NAMES, nju.majors(), "命中按校档时不得被基线覆盖");
        assertTrue(fallbackLogs().isEmpty(), "命中按校档不应产生回退日志: " + loggedMessages());
    }

    @Test
    @DisplayName("同一次响应里：命中按校的用按校、没命中的用基线，回退日志只点名没命中的")
    void mixedCampusesMixPerSchoolRowsAndBaseline() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学"), school("PKU", "北京大学")));
        baselineHasDbRows();
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of(major("NJU", "声学", 1)));

        List<CampusView> campuses = service().loadCampuses();

        assertEquals(List.of("声学"), campuses.get(0).majors());
        assertEquals(DB_BASELINE_NAMES, campuses.get(1).majors());
        assertEquals(1, fallbackLogs().size());
        String line = fallbackLogs().get(0);
        assertTrue(line.contains("北京大学"), "回退日志应点名北京大学: " + line);
        assertFalse(line.contains("南京大学"), "回退日志不应包含命中按校档的南京大学: " + line);
    }

    @Test
    @DisplayName("基线档也空（迁移未执行）⇒ 回退代码级通用目录并记 WARN，picker 不会是空的")
    void emptyBaselineTableFallsBackToCodeConstantAndWarns() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学")));
        when(schoolMajorRepository.findBySchoolCodeOrderBySortOrderAsc(SchoolMajor.GENERIC_SCHOOL_CODE))
                .thenReturn(List.of());
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of());

        CampusView nju = service().loadCampuses().get(0);

        assertEquals(MajorBaseline.GENERIC, nju.majors());
        assertFalse(nju.majors().isEmpty(), "最后一档兜底也不能下发空目录");
        assertTrue(loggedMessages().stream().anyMatch(m -> m.contains("基线档") && m.contains("无数据")),
                "基线档为空必须单独告警并指向迁移文件名: " + loggedMessages());
        assertTrue(loggedMessages().stream().anyMatch(m -> m.contains("V2026.10.27.0001")),
                "告警要给出可执行的修复线索（迁移文件名）: " + loggedMessages());
    }

    @Test
    @DisplayName("专业字典两次查询都抛异常 ⇒ 校区列表照常返回（代码级基线），异常不外溢")
    void majorRepositoryFailuresDoNotBreakCampusList() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学")));
        when(schoolMajorRepository.findBySchoolCodeOrderBySortOrderAsc(SchoolMajor.GENERIC_SCHOOL_CODE))
                .thenThrow(new RuntimeException("school_majors 表不存在"));
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenThrow(new RuntimeException("school_majors 表不存在"));

        List<CampusView> campuses = service().loadCampuses();

        assertEquals(1, campuses.size());
        assertEquals(MajorBaseline.GENERIC, campuses.get(0).majors());
        assertTrue(loggedMessages().stream().anyMatch(m -> m.contains("基线档查询异常")), "异常兜底也要留痕");
        // schools 主查询没失败 ⇒ 不能退到内置 4 所默认列表（那会把 17 所学校缩成 4 所）
        assertEquals("NJU", campuses.get(0).id());
    }

    @Test
    @DisplayName("按校查询按启用学校编码取数，不请求基线保留字符")
    void perSchoolQueryIsAskedWithActiveSchoolCodesNotTheBaselineSentinel() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("NJU", "南京大学"), school("PKU", "北京大学")));
        baselineHasDbRows();
        when(schoolMajorRepository.findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(anyCollection()))
                .thenReturn(List.of());

        service().loadCampuses();

        var codesCaptor = org.mockito.ArgumentCaptor.forClass(java.util.Collection.class);
        verify(schoolMajorRepository).findBySchoolCodeInOrderBySchoolCodeAscSortOrderAsc(codesCaptor.capture());
        assertEquals(List.of("NJU", "PKU"), List.copyOf(codesCaptor.getValue()));
        assertFalse(codesCaptor.getValue().contains(SchoolMajor.GENERIC_SCHOOL_CODE),
                "基线档不该被当成某所学校的按校查询条件");
    }

    @Test
    @DisplayName("mock 档与降级默认档都带专业目录，键序与代码级基线一致")
    void mockAndDefaultCampusesCarryMajors() {
        for (CampusView c : new MockConfigService().loadCampuses()) {
            assertEquals(MajorBaseline.GENERIC, c.majors(), c.name() + " 的 mock 目录应等于通用基线");
        }
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());
        for (CampusView c : service().loadCampuses()) {
            assertEquals(MajorBaseline.GENERIC, c.majors(), c.name() + " 的降级目录应等于通用基线");
        }
    }
}
