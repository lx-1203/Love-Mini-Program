/**
 * k6 性能测试脚本（P7 - Task 7.2.2）。
 *
 * <p>覆盖核心 API 的响应时间基准与并发负载测试：</p>
 * <ul>
 *   <li>登录（/api/v1/auth/wechat）</li>
 *   <li>推荐列表（/api/v1/recommendations/people）</li>
 *   <li>匹配（/api/v1/matches/swipe）</li>
 *   <li>聊天列表（/api/v1/chat/overview）</li>
 * </ul>
 *
 * <p>SLO baseline（P95 < 2s，错误率 < 1%）：</p>
 * <ul>
 *   <li>P95 响应时间 &lt; 2000ms</li>
 *   <li>P99 响应时间 &lt; 5000ms</li>
 *   <li>错误率 &lt; 1%</li>
 *   <li>RPS ≥ 50</li>
 * </ul>
 *
 * <p>运行方式：</p>
 * <pre>
 * # 安装 k6：https://k6.io/docs/getting-started/installation/
 * # macOS: brew install k6
 * # Windows: choco install k6
 *
 * # 本地运行（需先启动 API 服务）
 * k6 run tests/performance/k6-baseline.js
 *
 * # 输出 InfluxDB（用于 Grafana 可视化）
 * k6 run --out influxdb=http://localhost:8086/k6 tests/performance/k6-baseline.js
 *
 * # 调整虚拟用户数与持续时间
 * k6 run -e VUS=50 -e DURATION=2m tests/performance/k6-baseline.js
 * </pre>
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── 配置 ──

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';
const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '1m';

// 自定义指标
const loginDuration = new Trend('login_duration', true);
const recommendDuration = new Trend('recommend_duration', true);
const matchDuration = new Trend('match_duration', true);
const chatDuration = new Trend('chat_duration', true);
const errorRate = new Rate('business_errors');

// ── k6 选项：基准与阈值 ──

export const options = {
  scenarios: {
    baseline: {
      // 基线测试：固定 VU 与持续时间，建立性能基线
      executor: 'constant-vus',
      exec: 'baselineScenario',
      vus: VUS,
      duration: DURATION,
      tags: { scenario: 'baseline' },
    },
    ramp_up: {
      // 渐进负载：模拟用户增长，识别容量上限
      executor: 'ramping-vus',
      exec: 'rampUpScenario',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'ramp_up' },
      startTime: DURATION, // 在 baseline 之后启动
    },
  },
  thresholds: {
    // SLO 阈值：CI 阻断门槛
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    business_errors: ['rate<0.01'],
    checks: ['rate>0.95'],
    // 各端点独立 SLO
    'login_duration': ['p(95)<3000'],
    'recommend_duration': ['p(95)<1500'],
    'match_duration': ['p(95)<2000'],
    'chat_duration': ['p(95)<2000'],
  },
};

// ── 辅助函数 ──

function getAuthHeaders() {
  // 登录获取 token
  const loginPayload = JSON.stringify({
    code: `test-code-${Date.now()}-${Math.random()}`,
    nickname: 'k6 perf user',
  });

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/wechat`,
    loginPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    },
  );

  loginDuration.add(loginRes.timings.duration);

  const ok = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = r.json();
        return body && (body.token || (body.data && body.data.token));
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    errorRate.add(1);
    return null;
  }

  try {
    const body = loginRes.json();
    const token = body.token || (body.data && body.data.token);
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
  } catch {
    errorRate.add(1);
    return null;
  }
}

// ── 场景实现 ──

export function baselineScenario() {
  const auth = getAuthHeaders();
  if (!auth) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  group('推荐列表', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/recommendations/people`,
      { ...auth, tags: { name: 'recommend' } },
    );
    recommendDuration.add(res.timings.duration);
    check(res, {
      'recommend 200': (r) => r.status === 200,
      'recommend has data': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    });
  });

  group('聊天列表', () => {
    const res = http.get(
      `${BASE_URL}/api/v1/chat/overview`,
      { ...auth, tags: { name: 'chat' } },
    );
    chatDuration.add(res.timings.duration);
    check(res, {
      'chat 200': (r) => r.status === 200,
    });
  });

  group('匹配滑动', () => {
    const targetUserId = Math.floor(Math.random() * 1000) + 1;
    const res = http.post(
      `${BASE_URL}/api/v1/matches/swipe`,
      JSON.stringify({ targetUserId, action: 'LIKE' }),
      { ...auth, tags: { name: 'match' } },
    );
    matchDuration.add(res.timings.duration);
    check(res, {
      'match accepted': (r) => r.status === 200 || r.status === 201,
    });
  });

  sleep(0.5); // 模拟用户思考时间
}

export function rampUpScenario() {
  // 渐进负载场景：复用 baseline 逻辑，但不带 SLO 检查（仅采集指标）
  const auth = getAuthHeaders();
  if (!auth) {
    sleep(1);
    return;
  }

  http.get(`${BASE_URL}/api/v1/recommendations/people`, {
    ...auth,
    tags: { name: 'ramp_recommend' },
  });

  sleep(Math.random() * 2 + 0.5); // 随机思考时间 0.5-2.5s
}

// 测试生命周期：开始时输出配置
export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'tests/performance/results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const baseline = data.scenarios?.baseline || {};
  return `
k6 性能测试报告
===============
基础 URL: ${BASE_URL}
虚拟用户数: ${VUS}
持续时间: ${DURATION}

核心指标：
- http_req_duration P95: ${data.metrics?.http_req_duration?.['p(95)']?.toFixed(2) || 'N/A'}ms
- http_req_duration P99: ${data.metrics?.http_req_duration?.['p(99)']?.toFixed(2) || 'N/A'}ms
- http_req_failed rate: ${((data.metrics?.http_req_failed?.rate || 0) * 100).toFixed(2)}%
- checks pass rate: ${((data.metrics?.checks?.rate || 0) * 100).toFixed(2)}%

阈值通过情况：
${Object.entries(data.metrics || {})
  .filter(([_, v]) => v.thresholds)
  .map(([name, v]) => {
    const results = Object.entries(v.thresholds)
      .map(([threshold, r]) => `  ${name} ${threshold}: ${r.ok ? '✓' : '✗'}`)
      .join('\n');
    return results;
  })
  .join('\n')}
`;
}
