const stats = {
  hookMount: 0,
  hookUnmount: 0,
  contractEffectMount: 0,
  contractEffectUnmount: 0,
  screenRender: 0,
  socketAcquire: 0,
  socketRelease: 0,
  socketConnect: 0,
  socketDisconnect: 0,
  resubscribeAll: 0,
  subscribeEmit: 0,
  unsubscribeEmit: 0,
  events: {},
};

let lastSummaryAt = 0;
const SUMMARY_INTERVAL_MS = 5000;

function snapshot() {
  return {
    ...stats,
    events: { ...stats.events },
  };
}

export function bumpOptionsWsStat(key, amount = 1) {
  if (!__DEV__) return;
  if (key === "events") return;
  stats[key] = (stats[key] || 0) + amount;
}

export function bumpOptionsWsEvent(eventName, amount = 1) {
  if (!__DEV__) return;
  stats.events[eventName] = (stats.events[eventName] || 0) + amount;
}

export function logOptionsWs(tag, detail) {
  if (!__DEV__) return;
  const now = Date.now();
  console.log(`[OptionsWS] ${tag}`, detail ?? "");
  if (now - lastSummaryAt >= SUMMARY_INTERVAL_MS) {
    lastSummaryAt = now;
    console.log("[OptionsWS] --- 5s summary ---", snapshot());
  }
}

export function getOptionsWsStats() {
  return snapshot();
}
