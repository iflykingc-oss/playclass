export async function safeJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      console.error('Non-JSON response from', url, text.slice(0, 120));
      return {} as T;
    }
  } catch (e) {
    console.error('Fetch failed', url, e);
    return {} as T;
  }
}

export function fmtDate(v: string | number | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
}

export function fmtDay(v: string | number | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
}
