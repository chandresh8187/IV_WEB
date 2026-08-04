const STORAGE_KEY = "iv_offline_production_queue_v1";

export const readOfflineProductionQueue = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const queueOfflineProduction = (payload) => {
  const queue = readOfflineProductionQueue();
  queue.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("iv:offline-production-changed"));
  return queue.length;
};

export const replaceOfflineProductionQueue = (queue) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("iv:offline-production-changed"));
};

export const createProductionRequestId = () => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web_${random}`.replace(/[^A-Za-z0-9:_-]/g, "_").slice(0, 64);
};
