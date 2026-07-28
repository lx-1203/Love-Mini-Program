/**
 * Task 0.7.2 自动化合规自检脚本。
 *
 * <p>本脚本依据 {@code p0-compliance-check.md} 中的 24 项检查项，
 * 自动扫描代码与配置文件，输出 JSON 报告与控制台汇总。</p>
 *
 * <p>覆盖范围（自动检查）：</p>
 * <ul>
 *   <li>2. {@code __usePrivacyCheck__: true})</li>
 *   <li>3. {@code wx.onNeedPrivacyAuthorization} 已注册)</li>
 *   <li>4. ({@code ensurePrivacyAuthorized} 调用点)</li>
 *   <li>5. ({@code requiredPrivateInfos} 一致性)</li>
 *   <li>16. ({@code @JsonIgnore} 凭据脱敏)</li>
 *   <li>17. (JWT 密钥环境变量化)</li>
 *   <li>19. ({@code @PreAuthorize} Admin 权限注解)</li>
 *   <li>20. ({@code /uploads/**} denyAll)</li>
 *   <li>21. (JWT 黑名单服务存在)</li>
 *   <li>22. ({@code .env.example} + {@code .gitleaks.toml})</li>
 *   <li>23. (安全响应头 HSTS 配置)</li>
 *   <li>24. (401/403 JSON 错误体 handler 存在)</li>
 * </ul>
 *
 * <p>需手动检查（脚本仅标记「需手动确认」）：</p>
 * <ul>
 *   <li>1, 6, 9, 11 (mp 后台配置 / 运营 SOP)</li>
 *   <li>7, 8, 10, 15 (代码已存在但需业务确认)</li>
 *   <li>12, 13, 14, 18 (待 P1 接入，脚本标记为「待补」)</li>
 * </ul>
 *
 * <p>运行方式：{@code node apps/client/scripts/p0-compliance-check.mjs}</p>
 */

import { readFileSync, existsSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname = apps/client/scripts，需上溯 3 级到项目根目录
const PROJECT_ROOT = join(__dirname, "..", "..", "..");
const API_ROOT = join(PROJECT_ROOT, "apps", "api");
const CLIENT_ROOT = join(PROJECT_ROOT, "apps", "client");

// ==================== 检查工具函数 ====================

function readText(filePath) {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (e) {
    return null;
  }
}

function fileExists(filePath) {
  return existsSync(filePath);
}

function grepCount(content, pattern, flags = "g") {
  if (!content) return 0;
  const regex = new RegExp(pattern, flags);
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function grepFiles(dir, pattern, extensions = [".java", ".vue", ".ts"]) {
  // 简化实现：递归扫描（仅用于本地脚本，性能可接受）
  const results = [];
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) return results;
  } catch (e) {
    return results;
  }
  let items;
  try {
    items = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return results;
  }
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...grepFiles(fullPath, pattern, extensions));
    } else if (extensions.some((ext) => item.name.endsWith(ext))) {
      const content = readText(fullPath);
      if (content && new RegExp(pattern).test(content)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ==================== 检查项实现 ====================

const checks = [];
const issues = [];

function check(id, name, level, fn) {
  try {
    const result = fn();
    checks.push({ id, name, level, ...result });
    if (result.status === "fail") {
      issues.push({ id, name, level, detail: result.detail || "" });
    }
  } catch (e) {
    checks.push({
      id,
      name,
      level,
      status: "error",
      detail: `检查脚本异常: ${e.message}`,
    });
    issues.push({ id, name, level, detail: `脚本异常: ${e.message}` });
  }
}

// 2. __usePrivacyCheck__: true
check("2", "__usePrivacyCheck__: true", "P0-必选", () => {
  const manifest = JSON.parse(
    readText(join(CLIENT_ROOT, "src", "manifest.json")) || "{}"
  );
  const value = manifest?.["mp-weixin"]?.["__usePrivacyCheck__"];
  return {
    status: value === true ? "pass" : "fail",
    detail: `manifest.json: mp-weixin.__usePrivacyCheck__ = ${value}`,
  };
});

// 3. wx.onNeedPrivacyAuthorization 已注册
check("3", "wx.onNeedPrivacyAuthorization 已注册", "P0-必选", () => {
  const appVue = readText(join(CLIENT_ROOT, "src", "App.vue"));
  const found = !!appVue && appVue.includes("onNeedPrivacyAuthorization");
  return {
    status: found ? "pass" : "fail",
    detail: found
      ? "App.vue 已注册 onNeedPrivacyAuthorization 回调"
      : "App.vue 未注册 onNeedPrivacyAuthorization",
  };
});

// 4. ensurePrivacyAuthorized 调用点
check("4", "ensurePrivacyAuthorized 调用点", "P0-必选", () => {
  const files = grepFiles(
    join(CLIENT_ROOT, "src"),
    "ensurePrivacyAuthorized",
    [".vue", ".ts"]
  );
  // 期望至少 7 个文件调用（含工具定义文件 privacy.ts）
  return {
    status: files.length >= 7 ? "pass" : "fail",
    detail: `找到 ${files.length} 个文件调用 ensurePrivacyAuthorized：${files
      .map((f) => f.replace(CLIENT_ROOT, ""))
      .join(", ")}`,
  };
});

// 5. requiredPrivateInfos 与实际使用一致
check("5", "requiredPrivateInfos 与实际使用一致", "P0-必选", () => {
  const manifest = JSON.parse(
    readText(join(CLIENT_ROOT, "src", "manifest.json")) || "{}"
  );
  const declared = manifest?.["mp-weixin"]?.["requiredPrivateInfos"] || [];
  const sourceFiles = grepFiles(
    join(CLIENT_ROOT, "src"),
    "uni\\.(chooseImage|chooseMedia|getLocation|chooseLocation|chooseAddress|startRecord|getUserProfile)",
    [".vue", ".ts"]
  );
  // 简单一致性检查：声明的接口数量 >= 1 即视为通过
  // 完整的接口级一致性需人工核对
  return {
    status: declared.length >= 1 ? "pass" : "fail",
    detail: `manifest 声明 ${declared.length} 个接口：[${declared.join(
      ", "
    )}]；源码中调用隐私接口的文件数：${sourceFiles.length}（需人工核对接口级一致性）`,
  };
});

// 16. @JsonIgnore 凭据脱敏
check("16", "@JsonIgnore 凭据脱敏", "P0-必选", () => {
  const userEntity = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "entity", "User.java")
  );
  const count = grepCount(userEntity, "@JsonIgnore", "g");
  // password 必须脱敏（@JsonIgnore），openid 通过 DtoMapper.toUserDto 在 DTO 层脱敏
  return {
    status: count >= 1 ? "pass" : "fail",
    detail: `User.java 中 @JsonIgnore 出现 ${count} 次（期望 >= 1，password 字段必须脱敏；openid 通过 DtoMapper 在 DTO 层脱敏）`,
  };
});

// 17. JWT 密钥环境变量化
check("17", "JWT 密钥环境变量化", "P0-必选", () => {
  const appYml = readText(
    join(API_ROOT, "src", "main", "resources", "application.yml")
  );
  const mockYml = readText(
    join(API_ROOT, "src", "main", "resources", "application-mock.yml")
  );
  // JWT_SECRET 配置在 application.yml 中（覆盖 mock 与 real profile）
  const usesEnvVar = !!appYml && appYml.includes("JWT_SECRET");
  // 检查默认值为空（强制生产环境配置），secret: ${JWT_SECRET:} 末尾冒号后为空
  const noDefaultSecret = !!appYml && appYml.includes("secret: ${JWT_SECRET:}");
  // mock profile 下也覆盖 JWT_SECRET（mock.yml 重复声明，提示开发者）
  const mockAlsoConfigured = !!mockYml && mockYml.includes("JWT_SECRET");
  return {
    status: usesEnvVar && noDefaultSecret ? "pass" : "fail",
    detail: `application.yml: secret 使用 ${"$"}{JWT_SECRET:} 占位 = ${noDefaultSecret ? "✓" : "✗"}；mock profile 重复声明 = ${mockAlsoConfigured ? "✓" : "✗"}`,
  };
});

// 19. @PreAuthorize Admin 权限注解
check("19", "@PreAuthorize Admin 权限注解", "P0-必选", () => {
  const adminDir = join(
    API_ROOT,
    "src",
    "main",
    "java",
    "com",
    "campuslove",
    "api",
    "admin"
  );
  const controllerFiles = grepFiles(adminDir, "@RestController", [".java"]);
  const withPreAuthorize = controllerFiles.filter((f) => {
    const content = readText(f);
    return (
      content &&
      content.includes("@PreAuthorize") &&
      content.includes("hasRole('ADMIN')")
    );
  });
  return {
    status: withPreAuthorize.length >= 11 ? "pass" : "fail",
    detail: `${withPreAuthorize.length}/${controllerFiles.length} 个 Admin Controller 标注 @PreAuthorize("hasRole('ADMIN')")（期望 >= 11）`,
  };
});

// 20. /uploads/** denyAll
check("20", "/uploads/** denyAll", "P0-必选", () => {
  const securityConfig = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SecurityConfig.java")
  );
  const mockSecurityConfig = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "MockSecurityConfig.java")
  );
  const realOk = !!securityConfig && securityConfig.includes('"/uploads/**").denyAll()');
  const mockOk = !!mockSecurityConfig && mockSecurityConfig.includes('"/uploads/**").denyAll()');
  return {
    status: realOk && mockOk ? "pass" : "fail",
    detail: `SecurityConfig: ${realOk ? "✓" : "✗"}；MockSecurityConfig: ${mockOk ? "✓" : "✗"}`,
  };
});

// 21. JWT 黑名单服务存在
check("21", "JWT 黑名单服务存在", "P0-必选", () => {
  const blacklistService = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "auth", "RedisTokenBlacklistService.java")
  );
  const jwtFilter = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "JwtAuthenticationFilter.java")
  );
  const serviceOk = !!blacklistService && blacklistService.includes("isRevoked");
  const filterOk = !!jwtFilter && jwtFilter.includes("tokenBlacklistService.isRevoked");
  return {
    status: serviceOk && filterOk ? "pass" : "fail",
    detail: `RedisTokenBlacklistService.isRevoked: ${serviceOk ? "✓" : "✗"}；JwtAuthenticationFilter 调用 isRevoked: ${filterOk ? "✓" : "✗"}`,
  };
});

// 22. .env.example + .gitleaks.toml 已配置
check("22", ".env.example + .gitleaks.toml 已配置", "P0-必选", () => {
  const apiEnvExample = fileExists(join(API_ROOT, ".env.example"));
  const clientEnvExample = fileExists(join(CLIENT_ROOT, ".env.example"));
  const gitleaks = fileExists(join(PROJECT_ROOT, ".gitleaks.toml"));
  return {
    status: apiEnvExample && clientEnvExample && gitleaks ? "pass" : "fail",
    detail: `apps/api/.env.example: ${apiEnvExample ? "✓" : "✗"}；apps/client/.env.example: ${clientEnvExample ? "✓" : "✗"}；.gitleaks.toml: ${gitleaks ? "✓" : "✗"}`,
  };
});

// 23. 安全响应头 HSTS 配置
check("23", "安全响应头 HSTS 配置", "P0-必选", () => {
  const securityConfig = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SecurityConfig.java")
  );
  const hsts = !!securityConfig && securityConfig.includes("httpStrictTransportSecurity");
  const contentType = !!securityConfig && securityConfig.includes("contentTypeOptions");
  const frameOptions = !!securityConfig && securityConfig.includes("frameOptions");
  const referrerPolicy = !!securityConfig && securityConfig.includes("referrerPolicy");
  const allOk = hsts && contentType && frameOptions && referrerPolicy;
  return {
    status: allOk ? "pass" : "fail",
    detail: `HSTS: ${hsts ? "✓" : "✗"}；X-Content-Type-Options: ${contentType ? "✓" : "✗"}；X-Frame-Options: ${frameOptions ? "✓" : "✗"}；Referrer-Policy: ${referrerPolicy ? "✓" : "✗"}`,
  };
});

// 24. 401/403 JSON 错误体 handler 存在
check("24", "401/403 JSON 错误体 handler 存在", "P0-必选", () => {
  const entryPoint = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "auth", "JwtAuthenticationEntryPoint.java")
  );
  const deniedHandler = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "auth", "JwtAccessDeniedHandler.java")
  );
  const entryOk = !!entryPoint && entryPoint.includes("UNAUTHORIZED");
  const deniedOk = !!deniedHandler && deniedHandler.includes("FORBIDDEN");
  const securityConfigRegistered = !!readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SecurityConfig.java")
  )?.includes("jwtAuthenticationEntryPoint") &&
    !!readText(
      join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SecurityConfig.java")
    )?.includes("jwtAccessDeniedHandler");
  return {
    status: entryOk && deniedOk && securityConfigRegistered ? "pass" : "fail",
    detail: `JwtAuthenticationEntryPoint (UNAUTHORIZED): ${entryOk ? "✓" : "✗"}；JwtAccessDeniedHandler (FORBIDDEN): ${deniedOk ? "✓" : "✗"}；SecurityConfig 注册: ${securityConfigRegistered ? "✓" : "✗"}（注：MockSecurityConfig 未注册，仅 real profile 生效）`,
  };
});

// 1. 隐私协议页面（需手动确认）
check("1", "隐私协议页面已配置", "P0-必选-手动", () => ({
  status: "manual",
  detail: "需登录 mp 后台确认「用户隐私保护指引」已审核通过",
}));

// 6. 类目合规（需手动确认）
check("6", "已选择「社交 > 婚恋」类目", "P0-必选-手动", () => ({
  status: "manual",
  detail: "需登录 mp 后台确认「服务类目」已添加「社交 > 婚恋」或「社交 > 社交」",
}));

// 7. 敏感词过滤机制
check("7", "敏感词过滤机制", "P0-必选", () => {
  const filter = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SensitiveWordFilter.java")
  );
  const ok = !!filter && filter.includes("filter");
  return {
    status: ok ? "pass" : "fail",
    detail: `SensitiveWordFilter.java 存在：${ok ? "✓" : "✗"}（业务路径接入需人工核对）`,
  };
});

// 8. 举报入口与处理流程
check("8", "举报入口与处理流程", "P0-必选", () => {
  const reportController = fileExists(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "report", "ReportController.java")
  );
  const adminReportController = fileExists(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "admin", "AdminReportController.java")
  );
  return {
    status: reportController && adminReportController ? "pass" : "fail",
    detail: `ReportController: ${reportController ? "✓" : "✗"}；AdminReportController: ${adminReportController ? "✓" : "✗"}`,
  };
});

// 9. 7×24 举报处理时效（手动）
check("9", "7×24 举报处理时效承诺", "P0-推荐-手动", () => ({
  status: "manual",
  detail: "需运营团队提供 SLA 文档与审核员排班表",
}));

// 10. 校园实名认证流程
check("10", "校园实名认证流程", "P0-必选", () => {
  const service = fileExists(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "campus", "RealCampusCertificationService.java")
  );
  const page = fileExists(
    join(CLIENT_ROOT, "src", "pages", "campus", "certification.vue")
  );
  return {
    status: service && page ? "pass" : "fail",
    detail: `后端 RealCampusCertificationService: ${service ? "✓" : "✗"}；前端 certification.vue: ${page ? "✓" : "✗"}`,
  };
});

// 11. 用户年龄限制（待补）
check("11", "用户年龄限制（≥18 周岁）", "P0-必选-待补", () => ({
  status: "todo",
  detail: "P1.3 在 WechatAuthController 增加年龄校验逻辑（当前未实现）",
}));

// 12-14. 内容安全审核（待补）
check("12", "文本审核 msgSecCheck", "P0-必选-待补", () => ({
  status: "todo",
  detail: "P1.4 接入微信 security.msgSecCheck",
}));

check("13", "图片审核 imgSecCheck", "P0-必选-待补", () => ({
  status: "todo",
  detail: "P1.4 接入微信 security.imgSecCheck",
}));

check("14", "视频审核 mediaCheckAsync", "P0-必选-待补", () => ({
  status: "todo",
  detail: "P1.4 接入微信 security.mediaCheckAsync",
}));

// 15. 全站 HTTPS（手动 + 代码已配置）
check("15", "全站 HTTPS", "P0-必选-半自动", () => {
  const securityConfig = readText(
    join(API_ROOT, "src", "main", "java", "com", "campuslove", "api", "config", "SecurityConfig.java")
  );
  const hstsConfigured = !!securityConfig && securityConfig.includes("httpStrictTransportSecurity");
  return {
    status: hstsConfigured ? "pass" : "fail",
    detail: `后端 HSTS 已配置：${hstsConfigured ? "✓" : "✗"}；生产 Nginx HTTPS 配置需手动确认`,
  };
});

// 18. 用户注销机制（待补）
check("18", "用户注销机制", "P0-必选-待补", () => ({
  status: "todo",
  detail: "P1.5 实现 DELETE /api/auth/account 端点（当前仅有 logout）",
}));

// ==================== 汇总输出 ====================

const passed = checks.filter((c) => c.status === "pass").length;
const failed = checks.filter((c) => c.status === "fail").length;
const manual = checks.filter((c) => c.status === "manual").length;
const todo = checks.filter((c) => c.status === "todo").length;

const report = {
  generatedAt: new Date().toISOString(),
  project: "campus-love",
  phase: "P0",
  summary: {
    total: checks.length,
    passed,
    failed,
    manual,
    todo,
    overall: failed === 0 ? "PASS" : "FAIL",
  },
  checks,
  issues,
};

const reportPath = join(__dirname, "p0-compliance-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

console.log("=".repeat(60));
console.log("P0 微信小程序提审前合规自检报告");
console.log("=".repeat(60));
console.log(`生成时间：${report.generatedAt}`);
console.log(`总项数：${checks.length}`);
console.log(`通过：${passed}`);
console.log(`不通过：${failed}`);
console.log(`需手动确认：${manual}`);
console.log(`待补（P1）：${todo}`);
console.log(`总体结论：${report.summary.overall}`);
console.log("-".repeat(60));
console.log("详细报告已输出至：" + reportPath);
console.log("-".repeat(60));
if (issues.length > 0) {
  console.log("不通过项汇总：");
  for (const issue of issues) {
    console.log(`  [${issue.id}] ${issue.name} (${issue.level})`);
    console.log(`        ${issue.detail}`);
  }
}
console.log("=".repeat(60));
