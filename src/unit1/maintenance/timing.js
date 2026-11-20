export function durationText(value) {
  if (value == null) return "Not recorded";
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 3600)}h ${Math.floor(
    (seconds % 3600) / 60
  )}m ${seconds % 60}s`;
}
export function elapsedSeconds(start, serverTime, updatedAt, now = Date.now()) {
  const end =
    serverTime && updatedAt ? Date.parse(serverTime) + now - updatedAt : now;
  return Math.max(0, Math.floor((end - Date.parse(start)) / 1000));
}
