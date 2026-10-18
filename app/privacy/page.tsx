export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', lineHeight: 1.7, color: '#222' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>隐私政策</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>Privacy Policy · 最近更新：2026-09</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. 我们收集的信息</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>账号信息：邮箱、昵称、加密存储的密码哈希</li>
          <li>使用记录：生成次数、导出次数、订单与支付状态</li>
          <li>内容数据：你上传的资料、生成的课程与导出文件</li>
          <li>技术日志：访问 IP、浏览器标识（用于安全与限流）</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. 信息的使用</h2>
        <p>
          用于提供生成与导出服务、计量配额、处理支付、保障安全与改进产品质量。我们不会将你的个人内容
          用于对外营销，也不会向第三方出售个人信息。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. 第三方服务</h2>
        <p>
          生成过程可能调用第三方模型与支付服务（如大模型 API、语音合成、易支付）。仅在完成你所请求的操作
          所必需的范围内传递最少信息。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. 存储与安全</h2>
        <p>
          密码使用 scrypt 加盐哈希存储；会话与 API 密钥采用安全哈希或 HttpOnly Cookie。我们采取合理的技术
          与管理措施保护数据，但无法保证绝对安全。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. 你的权利</h2>
        <p>
          你可以查询、更正或删除账号信息，要求删除生成内容，或注销账号。注销后我们将按法律要求删除或匿名化
          处理相关数据。
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. 未成年人</h2>
        <p>
          本服务主要面向教育工作者。若涉及未成年人信息，监护人应确保已取得合法授权。
        </p>
      </section>
    </main>
  );
}
