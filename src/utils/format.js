// 223876 -> "224 mil", 3477497 -> "3.5 M" (para espacios reducidos)
export function formatCompact(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} mil`;
  return String(n);
}

// "2026-11-04" -> "mié 4 nov". Se usa mediodía UTC para que la zona horaria no cambie el día.
export function formatDay(isoDate, index) {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  const date = new Date(`${isoDate}T12:00:00Z`);
  const opts = { timeZone: 'UTC' };
  const weekday = date.toLocaleDateString('es-MX', { ...opts, weekday: 'short' }).replace('.', '');
  const month = date.toLocaleDateString('es-MX', { ...opts, month: 'short' }).replace('.', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getUTCDate()} ${month}`;
}

// "2026-11-04T17:00" (hora local del destino) -> "17:00"
export function formatLocalTime(isoLocal) {
  return typeof isoLocal === 'string' && isoLocal.includes('T') ? isoLocal.split('T')[1].slice(0, 5) : '—';
}
