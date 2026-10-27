package com.campuslove.api.clientconfig;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.School;
import com.campuslove.api.repository.FieldCountProjection;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.SchoolMajorRepository;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 校园圈学校卡两个读数的装配守卫。
 *
 * <p>R11-L04-D15 撤掉的是「前端按校 id 写死的字面量表」，撤除条件是「后端补列后按接口数据渲染」。
 * 本测试钉住补列后的三条不变量，防止同类缺陷换一层重新长出来：</p>
 * <ol>
 *   <li>读数按<b>校名</b>对齐下发（客户端学校卡以 name 匹配，不是 code）；</li>
 *   <li>统计不可用时出 {@code null} 而不是 0——0 是一个可被读成「这所学校没有人在用」的假陈述；</li>
 *   <li>校区名为空/空白的分组行被丢弃，否则未填校区的用户会被折叠进某一所学校。</li>
 * </ol>
 *
 * <p>majors 字段（校园专业字典）的装配与三级回退由
 * {@code RealConfigServiceCampusMajorTest} 守，本类只保证加了第 4 个构造依赖后
 * 两个读数口径没有回归。</p>
 */
class RealConfigServiceCampusStatsTest {

    private static School school(String code, String name) {
        School s = new School();
        s.setCode(code);
        s.setName(name);
        return s;
    }

    private static FieldCountProjection row(String field, long cnt) {
        return new FieldCountProjection() {
            @Override
            public String getField() {
                return field;
            }

            @Override
            public Long getCnt() {
                return cnt;
            }
        };
    }

    private final SchoolRepository schoolRepository = mock(SchoolRepository.class);
    private final UserCampusProfileRepository campusProfileRepository = mock(UserCampusProfileRepository.class);
    private final PostRepository postRepository = mock(PostRepository.class);
    /** 专业字典依赖：本类不验证 majors，mock 默认返回空列表 ⇒ 服务内部走代码级基线兜底。 */
    private final SchoolMajorRepository schoolMajorRepository = mock(SchoolMajorRepository.class);

    private RealConfigService service() {
        return new RealConfigService(schoolRepository, campusProfileRepository, postRepository,
                schoolMajorRepository);
    }

    private void oneSchoolWith(List<FieldCountProjection> memberRows, List<Object[]> postRows) {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("pku", "北京大学")));
        when(campusProfileRepository.countGroupByCampusName()).thenReturn(memberRows);
        when(postRepository.countVisibleGroupByAuthorCampus(any(), any())).thenReturn(postRows);
    }

    @Test
    @DisplayName("两个读数按校名装配进 CampusView")
    void countsAreAttachedBySchoolName() {
        oneSchoolWith(
                List.of(row("北京大学", 3200L), row("清华大学", 2600L)),
                List.<Object[]>of(new Object[]{"北京大学", 28000L}));

        CampusView pku = service().loadCampuses().get(0);

        assertEquals("pku", pku.id());
        assertEquals(3200, pku.memberCount());
        assertEquals(28000, pku.postCount());
    }

    @Test
    @DisplayName("统计查询抛异常 → 读数出 null，不出 0")
    void degradedStatsYieldNullNotZero() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("pku", "北京大学")));
        when(campusProfileRepository.countGroupByCampusName())
                .thenThrow(new RuntimeException("db down"));
        when(postRepository.countVisibleGroupByAuthorCampus(any(), any()))
                .thenThrow(new RuntimeException("db down"));

        CampusView pku = service().loadCampuses().get(0);

        assertNull(pku.memberCount());
        assertNull(pku.postCount());
    }

    @Test
    @DisplayName("统计可用但该校没有行 → 出 0（这是事实，不是缺数）")
    void schoolAbsentFromHealthyStatsYieldsZero() {
        oneSchoolWith(
                List.of(row("清华大学", 2600L)),
                List.<Object[]>of(new Object[]{"清华大学", 21000L}));

        CampusView pku = service().loadCampuses().get(0);

        assertEquals(0, pku.memberCount());
        assertEquals(0, pku.postCount());
    }

    @Test
    @DisplayName("同一次响应里：有读数的出读数、没有的出 0，两种都不塌缩成 null")
    void healthyStatsMixRealValuesAndZeros() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active"))
                .thenReturn(List.of(school("pku", "北京大学"), school("tongji", "同济大学")));
        when(campusProfileRepository.countGroupByCampusName())
                .thenReturn(List.of(row("北京大学", 53L), row("同济大学", 6L)));
        // 同济大学 0 条可见动态（2026-10-26 实测：posts 分组结果里确实没有它）
        when(postRepository.countVisibleGroupByAuthorCampus(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{"北京大学", 26L}));

        List<CampusView> campuses = service().loadCampuses();

        assertEquals(53, campuses.get(0).memberCount());
        assertEquals(26, campuses.get(0).postCount());
        assertEquals(6, campuses.get(1).memberCount());
        assertEquals(0, campuses.get(1).postCount());
    }

    @Test
    @DisplayName("校区名为空/空白的分组行被丢弃")
    void blankCampusRowsAreDropped() {
        oneSchoolWith(
                List.of(row(null, 9999L), row("  ", 8888L), row("北京大学", 3200L)),
                List.<Object[]>of(new Object[]{null, 7777L}, new Object[]{"北京大学", 28000L}));

        CampusView pku = service().loadCampuses().get(0);

        assertEquals(3200, pku.memberCount());
        assertEquals(28000, pku.postCount());
    }

    @Test
    @DisplayName("schools 表为空时回退内置默认列表，且默认列表不带伪造读数")
    void fallbackListHasNoFabricatedCounts() {
        when(schoolRepository.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        List<CampusView> campuses = service().loadCampuses();

        assertEquals(4, campuses.size());
        for (CampusView c : campuses) {
            assertNull(c.memberCount(), c.name() + " 的降级读数必须是 null 而非 0");
            assertNull(c.postCount(), c.name() + " 的降级读数必须是 null 而非 0");
            // 降级档可以没有读数，但不能没有专业目录：空 majors 会让前端 picker 直接空掉
            assertEquals(MajorBaseline.GENERIC, c.majors(), c.name() + " 的降级目录应为通用基线");
        }
    }

    @Test
    @DisplayName("动态数按「已发布 + 已过审」口径取数")
    void postCountUsesActiveAndApproved() {
        oneSchoolWith(List.of(row("北京大学", 3200L)), List.<Object[]>of(new Object[]{"北京大学", 28000L}));

        service().loadCampuses();

        org.mockito.Mockito.verify(postRepository)
                .countVisibleGroupByAuthorCampus(Post.PostStatus.active, Post.AuditStatus.approved);
    }
}
