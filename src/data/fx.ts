// BRL to USD for the English price. The site is static, so the rate is read at build time from public APIs
// that need no key, and the deploy workflow also rebuilds every day, which keeps the number current.
// Order: Frankfurter (European Central Bank reference rates), then AwesomeAPI (Brazilian market quote),
// then a fixed rate so an outage of both never breaks a deploy.
const FALLBACK_USD_PER_BRL = 0.17;

export type Rate = { usdPerBrl: number; source: string; asOf: string };

async function getJson(url: string): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function load(): Promise<Rate> {
  try {
    const j = await getJson('https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD');
    const v = Number(j?.rates?.USD);
    if (v > 0.05 && v < 0.6) return { usdPerBrl: v, source: 'Frankfurter (ECB)', asOf: String(j.date) };
  } catch { /* try the next source */ }
  try {
    const j = await getJson('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    const bid = Number(j?.USDBRL?.bid);
    if (bid > 1.5 && bid < 20) return { usdPerBrl: 1 / bid, source: 'AwesomeAPI', asOf: String(j.USDBRL.create_date).slice(0, 10) };
  } catch { /* use the fixed rate */ }
  console.warn('[fx] both rate APIs failed; using the fixed fallback rate');
  return { usdPerBrl: FALLBACK_USD_PER_BRL, source: 'fallback', asOf: '' };
}

let cached: Promise<Rate> | undefined;
/** One lookup per build, shared by every page. */
export const usdPerBrl = () => (cached ??= load());

/** A BRL amount in USD, rounded to the nearest `step` so the price does not look falsely precise. */
export async function brlToUsd(brl: number, step = 100): Promise<number> {
  const { usdPerBrl: rate } = await usdPerBrl();
  return Math.round((brl * rate) / step) * step;
}
