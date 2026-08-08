package com.campuslove.api.report;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.ErrorReport;
import com.campuslove.api.ratelimit.RateLimit;
import com.campuslove.api.repository.ErrorReportRepository;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 前端错误上报控制器。
 *
 * <p>接口：</p>
 * <ul>
 *   <li>POST /api/v1/error-reports：接收前端（mp-weixin 降级通道 / H5 Sentry 兜底）
 *       上报的异常信息，落库 error_reports 表，供事后排查。</li>
 * </ul>
 *
 * <p>权限说明：SecurityConfig 已将该路径 permitAll——错误上报与登录态无关，
 * 未登录用户（冷启动阶段）的异常同样需要采集；若要求鉴权会导致
 * 「上报失败 → 再报错 → 再上报」的 401 级联循环。</p>
 *
 * <p>安全设计：</p>
 * <ul>
 *   <li>按 IP 限流（突发 20 / 每秒 2 个），防止恶意刷表；</li>
 *   <li>客户端上报前已做敏感字段脱敏与长度截断，服务端再按 @Size 二次校验；</li>
 *   <li>context 以 JsonNode 接收，仅存 JSON 文本，不参与任何查询。</li>
 * </ul>
 *
 * <p>Profile 说明：仅 real profile 启用（同 ReportController，mock profile
 * 使用 MockSecurityConfig 全放行，无落库诉求）。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/error-reports")
public class ErrorReportController {

    private final ErrorReportRepository errorReportRepository;

    public ErrorReportController(ErrorReportRepository errorReportRepository) {
        this.errorReportRepository = errorReportRepository;
    }

    /**
     * 接收前端错误上报并落库。
     *
     * @param req 上报载荷（字段均有长度上限，超限由客户端截断、服务端兜底校验）
     * @return 上报记录 ID 与接收时间
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RateLimit(capacity = 20, refillTokens = 2, key = "#request.remoteAddr")
    public ApiResponse<ErrorReportView> createReport(@Valid @RequestBody ErrorReportCreateRequest req) {
        ErrorReport report = new ErrorReport();
        report.setMessage(req.message());
        report.setStack(req.stack());
        report.setName(req.name());
        report.setContext(req.context() != null ? req.context().toString() : null);
        report.setPlatform(req.platform());
        report.setCreatedAt(LocalDateTime.now(TimeZones.BUSINESS));

        ErrorReport saved = errorReportRepository.save(report);

        return ApiResponse.ok(new ErrorReportView(
                saved.getId(),
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null
        ));
    }
}

/**
 * 错误上报请求体。
 *
 * <p>所有字段可空（错误形态多样，不应因校验失败而丢弃上报）；
 * 长度上限与客户端 sentry.ts 的截断阈值保持一致。</p>
 *
 * @param message  错误消息（≤2000 字符）
 * @param stack    错误堆栈（≤8000 字符）
 * @param name     错误名称（≤128 字符）
 * @param context  上报上下文（任意 JSON 对象，客户端已脱敏）
 * @param platform 上报平台（mp-weixin / h5，≤32 字符）
 */
record ErrorReportCreateRequest(
        @Size(max = 2000) String message,
        @Size(max = 8000) String stack,
        @Size(max = 128) String name,
        JsonNode context,
        @Size(max = 32) String platform
) {
}

/**
 * 错误上报记录视图（接收确认）。
 *
 * @param id        上报记录 ID
 * @param createdAt 服务端接收时间（ISO 格式）
 */
record ErrorReportView(
        Long id,
        String createdAt
) {
}
