export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
export const pad = (n: number) => String(n).padStart(2, '0');
export const now = () => new Date().toISOString();
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
export const byId = <T extends { id: string }>(list: T[], id?: string | null): T | undefined => (id ? list.find(x => x.id === id) : undefined);
export const isActive = (x: { archivedAt: string | null }) => !x.archivedAt;
export const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' });
export const newestFirst = (a: { brewedAt: string }, b: { brewedAt: string }) =>
  new Date(b.brewedAt).getTime() - new Date(a.brewedAt).getTime();
export const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [...list, item];
export const plural = (n: number, one: string, many?: string) => `${n} ${n === 1 ? one : many || one + 's'}`;
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
export const matches = (q: string, ...parts: (string | undefined | null)[]) => {
  const t = q.trim().toLowerCase();
  return !t || parts.some(p => (p || '').toLowerCase().includes(t));
};
export const focusFirstError = () =>
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.invalid');
    if (el) el.focus();
  }, 0);

/* Dates */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
export const dayDiff = (d: Date) => {
  const t = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((b - a) / 864e5);
};
export const relDay = (iso: string) => {
  const n = dayDiff(new Date(iso));
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n < 14) return `${n} days ago`;
  if (n < 60) return `${Math.round(n / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const whenShort = (iso: string) => `${relDay(iso)}, ${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
export const parseDay = (s: string) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const fmtDay = (s: string) => {
  const d = parseDay(s);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
};
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
