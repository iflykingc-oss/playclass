'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { ArrowLeft, Check, X } from 'lucide-react';

export default function OrdersPage() {
  const { locale, setLocale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/my-orders').then(r => r.json()).then(d => setOrders(d.orders || []));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc' }}>
      <nav style={{
        background: '#1e1b4b', padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/dashboard" style={{ color: '#c4b5fd', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
            <ArrowLeft size={16} /> {isZh ? '返回工作台' : 'Dashboard'}
          </a>
          <span style={{ fontWeight: 700, color: '#fff' }}>playclass</span>
        </div>
        <button onClick={() => setLocale(isZh ? 'en-US' : 'zh-CN')}
          style={{ padding: '6px 12px', border: '1px solid #4c1d95', borderRadius: 6, background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontSize: 13 }}>
          {isZh ? 'EN' : '中文'}
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{isZh ? '我的订单' : 'My Orders'}</h1>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eef0f4', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ background: '#f8f9fc' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888' }}>{isZh ? '商品' : 'Item'}</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888' }}>{isZh ? '金额' : 'Amount'}</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888' }}>{isZh ? '状态' : 'Status'}</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#888' }}>{isZh ? '时间' : 'Date'}</th>
            </tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.out_trade_no} style={{ borderTop: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 16px' }}>{o.subject}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {(o.currency === 'USD' ? '$' : '¥')}{o.money}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {o.status === 'paid' || o.status === 1 ? (
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                        <Check size={12} style={{ display: 'inline' }} /> {isZh ? '已支付' : 'Paid'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#991b1b' }}>
                        <X size={12} style={{ display: 'inline' }} /> {isZh ? '未支付' : 'Unpaid'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 60, textAlign: 'center', color: '#999' }}>
                  {isZh ? '暂无订单记录' : 'No orders yet'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
