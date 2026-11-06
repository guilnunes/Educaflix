export function usd(n: number) {
  if (n === 0) return 'US$ 0,00';
  if (n < 0.01) return `US$ ${n.toFixed(4).replace('.', ',')}`;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' }).replace('US$', 'US$ ').replace('  ', ' ');
}

export function duration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`;
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export function dateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function percent(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
