from pathlib import Path

p = Path('app/dashboard/page.tsx')
t = p.read_text(encoding='utf-8')

# Plan tier rank for CTA wording
if 'PLAN_RANK' not in t:
    t = t.replace(
        "const currencySymbol = isZh ? '\\u00A5' : '$';",
        """const currencySymbol = isZh ? '\\u00A5' : '$';

/** Higher number = higher tier. Used so Plus → Pro is a downgrade, not "upgrade". */
const PLAN_RANK: Record<string, number> = {
  free: 0,
  pro_monthly: 1,
  pro_plus_monthly: 2,
  enterprise_yearly: 3,
  enterprise: 3,
};

function planRank(id: string | undefined | null): number {
  if (!id) return 0;
  return PLAN_RANK[id] ?? 0;
}""",
        1,
    )
    print('PLAN_RANK added')

old = """                const isFree = Number(p.price.CNY) === 0 && Number(p.price.USD) === 0;
                const isCurrent = stats.quota?.plan === p.id || (isFree && stats.quota?.plan === 'free');"""
new = """                const isFree = Number(p.price.CNY) === 0 && Number(p.price.USD) === 0;
                const currentPlan = stats.quota?.plan || 'free';
                const isCurrent = currentPlan === p.id || (isFree && currentPlan === 'free');
                const currentRank = planRank(currentPlan);
                const targetRank = planRank(p.id);
                const isUpgrade = !isCurrent && !isFree && targetRank > currentRank;
                const isDowngrade = !isCurrent && targetRank < currentRank;"""
if old in t:
    t = t.replace(old, new, 1)
    print('rank logic added')
else:
    print('rank anchor missing')

old_btn = """                    {!isCurrent && !isFree && (
                      <button onClick={() => openPay(p.id)}
                        style={{
                          marginTop: 16, width: '100%', padding: '10px',
                          borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: highlight ? '#fff' : '#7c3aed',
                          color: highlight ? '#7c3aed' : '#fff',
                          fontSize: 14, fontWeight: 600,
                        }}>
                        {L.upgrade}
                      </button>
                    )}
                    {isCurrent && <div style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>{L.current}</div>}"""
new_btn = """                    {isCurrent && (
                      <div style={{ marginTop: 16, fontSize: 13, opacity: 0.75, fontWeight: 600 }}>
                        {isZh ? '当前方案' : 'Current plan'}
                      </div>
                    )}
                    {isUpgrade && (
                      <button onClick={() => openPay(p.id)}
                        style={{
                          marginTop: 16, width: '100%', padding: '10px',
                          borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: highlight ? '#fff' : '#7c3aed',
                          color: highlight ? '#7c3aed' : '#fff',
                          fontSize: 14, fontWeight: 600,
                        }}>
                        {isZh ? '升级到此套餐' : 'Upgrade'}
                      </button>
                    )}
                    {isDowngrade && (
                      <button
                        onClick={() => openPay(p.id)}
                        style={{
                          marginTop: 16, width: '100%', padding: '10px',
                          borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer',
                          background: '#fff', color: '#374151',
                          fontSize: 14, fontWeight: 500,
                        }}
                      >
                        {isZh ? '降级/切换（按周期计费）' : 'Switch plan'}
                      </button>
                    )}
                    {isFree && !isCurrent && (
                      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
                        {isZh ? '可随时降回免费版' : 'You can switch back to Free'}
                      </div>
                    )}"""
if old_btn in t:
    t = t.replace(old_btn, new_btn, 1)
    print('cta rewritten')
else:
    print('cta block missing')

# Fix garbled 推荐 badge if present
t = t.replace('鎺ㄨ崘', '推荐')
t = t.replace('>鉁?', '>✓')

p.write_text(t, encoding='utf-8')
print('done')
