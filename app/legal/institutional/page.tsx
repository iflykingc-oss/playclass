export default function InstitutionalCompliancePage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px', lineHeight: 1.75, color: '#222' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>机构合规说明（FERPA / 未成年人）</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 28 }}>
        Institutional Compliance · 可供学校/学区采购评估使用 · 最近更新：2026-09
      </p>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. 数据角色</h2>
        <p>
          对美国教育机构部署场景，playclass 作为 <strong>school official</strong> 处理教育记录（Education Records）。
          教师与机构管理员为数据控制方；平台按指令处理学员学习行为数据（作答、进度、会话），不用于广告画像或出售。
        </p>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. FERPA 要点对齐</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>仅向机构授权角色（教师/管理员）披露学员数据；公开分享链接默认不含可识别学员信息。</li>
          <li>支持机构要求的访问与删除：管理员可导出/注销成员数据（见用户管理「注销账号」）。</li>
          <li>审计：质量事件、用量、订单均可追溯到时间戳（platform 事件表）。</li>
          <li>合同：可签署 DPA / 数据处理协议，明确分包商（模型 API、对象存储）与跨境说明。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. 未成年人保护</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>K12 场景默认「扣答案 / 帮助阶梯」教学策略，降低直接泄题风险。</li>
          <li>互动页运行于浏览器沙箱；生成脚本经校验，错误可观测（质量事件落盘）。</li>
          <li>机构可要求关闭公网分享，仅保留登录可见课节。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. 集成与报表（机构采购常见要求）</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Webhook JSON 报表</strong>：学员汇总 / 用量汇总 / 质量汇总，可推送到贵方 endpoint（HMAC-SHA256 签名）。</li>
          <li>席位与机构共享课库；套餐次数、AI 视频、导出额度可配置。</li>
          <li>后续支持：SSO（Google/Microsoft）、LTI 1.3 成绩回传（Roadmap）。</li>
        </ul>
      </section>

      <section style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. 中国境内机构</h2>
        <p>
          按《个人信息保护法》《未成年人网络保护条例》要求：最小必要收集、目的限定、可注销可导出。
          可选私有化部署（Postgres + MinIO/S3 + 模型自备密钥），数据不出境。
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. 采购联系</h2>
        <p>
          可提供：DPA 模板、安全问卷、部署拓扑说明、试用席位。请通过产品内反馈或商务邮箱联系。
          详见 <a href="/privacy">隐私政策</a>、<a href="/terms">服务条款</a>。
        </p>
      </section>
    </main>
  );
}
