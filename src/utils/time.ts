export function seoulParts(iso: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}
export function formatDate(iso: string, time = false) {
  const p = seoulParts(iso);
  return `${p.year}.${p.month}.${p.day}.${time ? ` ${p.hour}:${p.minute}` : ""}`;
}
export function dateKey(iso: string) {
  const p = seoulParts(iso);
  return `${p.year}${p.month}${p.day}`;
}
