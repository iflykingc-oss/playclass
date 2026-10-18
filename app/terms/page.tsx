export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', lineHeight: 1.7, color: '#222' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>服务条款</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>Terms of Service · 最近更新：2026-09</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. 服务说明</h2>
        <p>
          playclass（以下简称「本服务」）提供 AI 互动课程生成、导出与分享能力。生成内容由人工智能模型产出，
          仅供参考与教学辅助，不构成专业建议。用户应对生成内容进行审核后使用。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. 账号与费用</h2>
        <p>
          注册账号须提供真实有效的信息。免费版有生成次数限制；付费套餐与加购包的具体额度以购买页面展示为准。
          付费成功后权益即时生效；订阅类套餐到期后自动回退至免费权益，加购包额度在用尽前长期有效。
        </p>
        <p>
          除法律另有规定或双方另有约定外，已支付的订阅费用在服务已开通后不予退款。加购包未消耗的额度可在申请后
          按未使用比例协商处理。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. 用户内容与知识产权</h2>
        <p>
          用户上传的资料与输入内容归用户所有。用户授予本服务为提供生成、存储与导出目的所必需的使用权。
          在不侵犯第三方合法权益的前提下，用户对其生成并导出的课程内容享有使用权。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>4. 禁止行为</h2>
        <p>
          不得利用本服务生成或传播违法违规内容、侵犯他人权益的内容，不得进行逆向工程、滥用接口、
          转售账号或绕过计量与配额机制。
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>5. 免责声明</h2>
        <p>
          本服务按「现状」提供。因网络故障、第三方模型服务中断、用户配置错误等导致的生成失败或数据损失，
          在法律允许范围内本服务不承担责任。
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>6. 联系我们</h2>
        <p>对本条款有疑问，请通过产品内反馈渠道或官方邮箱联系我们。</p>
      </section>
    </main>
  );
}
