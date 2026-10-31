package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.Activity;
import com.campuslove.api.entity.ActivityEnrollment;
import com.campuslove.api.entity.PromoCode;
import com.campuslove.api.entity.User;
import com.campuslove.api.profile.PersonalDataCategory;
import com.campuslove.api.profile.PersonalDataExport;
import com.campuslove.api.repository.ActivityEnrollmentRepository;
import com.campuslove.api.repository.ActivityRepository;
import com.campuslove.api.repository.PromoCodeRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.utils.CsvCellUtil;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * CSV 导出公式注入防护测试（P2，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code AdminActivityController#escapeCsv} 与
 * {@code AdminPromoCodeController#escapeCsv} 只做 RFC 4180 引号转义，并把
 * {@code user.getNickname()} 原样写进单元格。昵称只有长度校验、无字符集限制，
 * 于是 {@code =cmd|'/c calc'!A0} 会被管理员打开的 {@code activity_enrollments_<id>.csv}
 * 当成 DDE 公式执行——<b>引号包裹救不了它</b>：Excel 先剥掉外层引号，再看到 {@code =}
 * 就按公式/DDE 处理。</p>
 *
 * <p><b>修复后契约</b>：三条写出路径（活动报名导出、兑换码导出、个人信息自助导出）
 * 共用 {@link com.campuslove.api.utils.CsvCellUtil}，所以每条路径都断言两件事：
 * <ol>
 *   <li>以每个危险首字符（{@code = + - @ Tab CR}）开头的值都被中和——按电子表格视角
 *       解析出的单元格，剥掉 RFC 4180 外层引号后<b>不</b>以危险字符开头；</li>
 *   <li>普通值（中文昵称、服务端生成的兑换码）逐字不变——防护不许顺手改写数据。</li>
 * </ol>
 * 自助导出的内容口径另由 {@code profile/PersonalDataServiceTest} 覆盖，这里只钉转义口径。</p>
 */
@DisplayName("CSV 导出 - 三条写出路径的公式注入防护同口径")
class AdminCsvExportSafetyTest {

    /** 电子表格会当公式/分隔符处理的首字符 */
    private static final List<String> DANGEROUS_FIRST_CHARS = List.of("=", "+", "-", "@", "\t", "\r");

    /** 经典 DDE payload */
    private static final String DDE = "cmd|'/c calc'!A0";

    private static final long ACTIVITY_ID = 77L;
    private static final long ENROLLEE_ID = 7L;
    private static final long ADMIN_ID = 5001L;

    private final ActivityRepository activityRepository = mock(ActivityRepository.class);
    private final ActivityEnrollmentRepository enrollmentRepository = mock(ActivityEnrollmentRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminDataScope adminDataScope = mock(AdminDataScope.class);
    private final AdminActivityController activityController = new AdminActivityController(
            activityRepository, enrollmentRepository, userRepository, adminDataScope);

    private final PromoCodeRepository promoCodeRepository = mock(PromoCodeRepository.class);
    private final AdminPromoCodeController promoController = new AdminPromoCodeController(promoCodeRepository);

    @BeforeEach
    void loginAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(String.valueOf(ADMIN_ID), "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    /* ===================== 一、活动报名导出（昵称列） ===================== */

    @Test
    @DisplayName("活动报名导出：昵称以每个危险字符开头都被中和")
    void activityExport_dangerousNicknameIsNeutralised() {
        for (String prefix : DANGEROUS_FIRST_CHARS) {
            String payload = prefix + DDE;
            stubEnrollmentWithNickname(payload);

            List<String> cells = cellsOf(dataRow(exportActivityCsv()));

            assertEquals(4, cells.size(), "列数不应被破坏，实际行: " + cells);
            assertEquals(String.valueOf(ENROLLEE_ID), cells.get(0));
            assertEquals("'" + payload, unquote(cells.get(1)),
                    "首字符 [" + prefix + "] 的昵称应被前置单引号中和，实际单元格: " + cells.get(1));
        }
    }

    @Test
    @DisplayName("活动报名导出：普通中文昵称逐字不变（防护不改写数据）")
    void activityExport_normalNicknameUnchanged() {
        stubEnrollmentWithNickname("张三");

        List<String> cells = cellsOf(dataRow(exportActivityCsv()));

        assertEquals("张三", cells.get(1), "普通昵称必须原样出现");
        assertFalse(exportActivityCsv().contains("'张三"), "普通值不该被加上中和前缀");
    }

    @Test
    @DisplayName("活动报名导出：含逗号的昵称按 RFC 4180 包裹，列数不被撑破")
    void activityExport_commaNicknameStaysOneCell() {
        stubEnrollmentWithNickname("小明,小红");

        List<String> cells = cellsOf(dataRow(exportActivityCsv()));

        assertEquals(4, cells.size(), "含逗号昵称必须仍是一列");
        assertEquals("小明,小红", cells.get(1));
    }

    /* ===================== 二、兑换码导出（码列） ===================== */

    @Test
    @DisplayName("兑换码导出：每个危险首字符都被中和")
    void promoExport_dangerousCodeIsNeutralised() {
        for (String prefix : DANGEROUS_FIRST_CHARS) {
            String payload = prefix + DDE;
            stubPromoCode(payload);

            List<String> cells = cellsOf(dataRow(exportPromoCsv()));

            assertEquals("'" + payload, unquote(cells.get(0)),
                    "首字符 [" + prefix + "] 的兑换码应被前置单引号中和，实际单元格: " + cells.get(0));
        }
    }

    @Test
    @DisplayName("兑换码导出：服务端生成的正常码逐字不变")
    void promoExport_normalCodeUnchanged() {
        stubPromoCode("LVIPABCD2345");

        List<String> cells = cellsOf(dataRow(exportPromoCsv()));

        assertEquals("LVIPABCD2345", cells.get(0), "正常兑换码应原样出现在首列");
    }

    /* ===================== 三、个人信息自助导出（同口径回归） ===================== */

    @Test
    @DisplayName("自助导出：与两个管理端导出共用同一份转义，危险首字符同样被中和")
    void personalDataExport_usesSameGuard() {
        for (String prefix : DANGEROUS_FIRST_CHARS) {
            String payload = prefix + DDE;
            String csv = personalCsv(payload);
            List<String> cells = cellsOf(dataRow(csv));

            assertEquals("'" + payload, unquote(cells.get(0)),
                    "自助导出应同样前置单引号，首字符 [" + prefix + "]，实际 CSV:\n" + csv);
        }
    }

    @Test
    @DisplayName("自助导出：普通值逐字不变")
    void personalDataExport_normalValueUnchanged() {
        List<String> cells = cellsOf(dataRow(personalCsv("张三")));

        assertEquals("张三", cells.get(0), "普通昵称应原样成行");
    }

    /* ===================== 装配辅助 ===================== */

    /** 造一条「某用户报名了活动」的数据，昵称由测试给定（模拟用户可控字段）。 */
    private void stubEnrollmentWithNickname(String nickname) {
        Activity activity = new Activity();
        activity.setId(ACTIVITY_ID);
        activity.setCampusName("北大校区");
        when(activityRepository.findById(ACTIVITY_ID)).thenReturn(Optional.of(activity));

        ActivityEnrollment enrollment = new ActivityEnrollment();
        enrollment.setActivityId(ACTIVITY_ID);
        enrollment.setUserId(ENROLLEE_ID);
        enrollment.setEnrolledAt(LocalDateTime.of(2026, 10, 30, 12, 0, 0));
        when(enrollmentRepository.findByActivityId(ACTIVITY_ID)).thenReturn(List.of(enrollment));

        User user = new User();
        user.setId(ENROLLEE_ID);
        user.setNickname(nickname);
        when(userRepository.findByIdIn(anyList())).thenReturn(List.of(user));
    }

    /** 造一条兑换码，码值由测试给定（导出行首列）。 */
    private void stubPromoCode(String code) {
        PromoCode promo = new PromoCode();
        promo.setId(1L);
        promo.setCode(code);
        promo.setDiscountType("AMOUNT");
        promo.setDiscountValue(50);
        promo.setStatus("ACTIVE");
        promo.setValidFrom(LocalDateTime.of(2026, 1, 1, 0, 0, 0));
        promo.setValidTo(LocalDateTime.of(2026, 12, 31, 23, 59, 59));
        when(promoCodeRepository.findAll(ArgumentMatchers.<Sort>any())).thenReturn(List.of(promo));
    }

    private static String personalCsv(String nickname) {
        return new PersonalDataExport(1L, "2026-10-30T12:00:00", List.of(
                PersonalDataCategory.of("profile", "资料",
                        List.of("nickname"), List.of(List.of(nickname))))).toCsv();
    }

    private String exportActivityCsv() {
        return bodyOf(activityController.exportEnrollments(ACTIVITY_ID));
    }

    private String exportPromoCsv() {
        return bodyOf(promoController.exportCsv());
    }

    private static String bodyOf(ResponseEntity<byte[]> response) {
        assertNotNull(response.getBody(), "CSV 响应体不应为空");
        return new String(response.getBody(), StandardCharsets.UTF_8);
    }

    /**
     * 取导出的第一条数据行（跳过 BOM 表头行与以 # 开头的说明行）。
     *
     * <p>先剥掉 UTF-8 BOM：三个导出都在文件最前面写它，不剥的话首行是
     * {@code BOM+"# 个人信息导出"} / {@code BOM+用户ID,...}，{@code startsWith} 判定会落空，
     * 于是表头/说明行会被误当成数据行。</p>
     */
    private static String dataRow(String csv) {
        String body = csv.replace(String.valueOf(CsvCellUtil.BOM), "");
        for (String line : body.split("\r\n")) {
            if (line.isEmpty() || line.startsWith("#")
                    || line.startsWith("用户ID") || line.startsWith("兑换码")
                    || line.equals("nickname")) {
                continue;
            }
            return line;
        }
        throw new AssertionError("导出中找不到数据行，CSV:\n" + csv);
    }

    /**
     * 按电子表格视角解析一行：识别 RFC 4180 的外层引号（含引号内的逗号与双写引号）。
     *
     * <p>不依赖第三方 CSV 解析器，只实现「剥外层引号 + 双写还原」这两条，
     * 与测试断言的口径完全对齐。</p>
     */
    private static List<String> cellsOf(String line) {
        List<String> cells = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                cells.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        cells.add(current.toString());
        return cells;
    }

    /**
     * 渲染单元格的「电子表格实际看到的字符」。
     *
     * <p>{@link #cellsOf(String)} 已按 RFC 4180 剥掉外层引号，这里只剩防御性兜底：
     * 若某个实现没有走转义（即原始值自己带了一层引号），再剥一次，保证断言针对的是
     * 「Excel 真正会拿去执行的字符串」。</p>
     */
    private static String unquote(String cell) {
        if (cell.length() >= 2 && cell.charAt(0) == '"' && cell.charAt(cell.length() - 1) == '"') {
            return cell.substring(1, cell.length() - 1).replace("\"\"", "\"");
        }
        return cell;
    }
}
