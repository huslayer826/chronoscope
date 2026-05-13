const WS_URL = "ws://127.0.0.1:8765/extension";
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;
const SKIP_URL_PREFIXES = ["chrome://", "edge://", "about:", "file://"];

let ws = null;
let backoffMs = INITIAL_BACKOFF_MS;
let reconnectTimer = null;
let connected = false;
let lastSentKey = null;

function detectBrowser() {
  const ua = (navigator.userAgent || "").toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("brave")) return "brave";
  if (navigator.brave && typeof navigator.brave.isBrave === "function") return "brave";
  return "chrome";
}

const BROWSER = detectBrowser();

async function getSettings() {
  const defaults = { enabled: true, includeIncognito: false };
  try {
    const stored = await chrome.storage.local.get(defaults);
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

async function setConnectionStatus(status) {
  connected = status;
  try {
    await chrome.storage.local.set({ connected: status, lastStatusUpdate: Date.now() });
  } catch {}
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = backoffMs;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    connect();
  }, delay);
}

function connect() {
  try {
    ws = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.addEventListener("open", async () => {
    backoffMs = INITIAL_BACKOFF_MS;
    await setConnectionStatus(true);
    lastSentKey = null;
    await reportActiveTab();
  });

  ws.addEventListener("close", async () => {
    await setConnectionStatus(false);
    ws = null;
    scheduleReconnect();
  });

  ws.addEventListener("error", () => {
    try { ws && ws.close(); } catch {}
  });
}

function isSkippedUrl(url) {
  if (!url) return true;
  return SKIP_URL_PREFIXES.some((p) => url.startsWith(p));
}

async function sendMessage(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    try { ws.close(); } catch {}
  }
}

async function reportActiveTab() {
  const settings = await getSettings();
  if (!settings.enabled) return;

  let win;
  try {
    win = await chrome.windows.getLastFocused({ populate: true });
  } catch {
    win = null;
  }

  const timestamp = Date.now();

  if (!win || win.id === chrome.windows.WINDOW_ID_NONE || win.focused === false) {
    const key = "unfocused";
    if (key === lastSentKey) return;
    lastSentKey = key;
    await sendMessage({
      type: "browser_unfocused",
      browser: BROWSER,
      url: null,
      title: null,
      tab_id: null,
      window_id: null,
      timestamp,
    });
    return;
  }

  if (win.incognito && !settings.includeIncognito) {
    const key = "incognito_skipped";
    if (key === lastSentKey) return;
    lastSentKey = key;
    await sendMessage({
      type: "browser_unfocused",
      browser: BROWSER,
      url: null,
      title: null,
      tab_id: null,
      window_id: win.id,
      timestamp,
    });
    return;
  }

  const tabs = win.tabs || [];
  const activeTab = tabs.find((t) => t.active);
  if (!activeTab) return;

  let url = activeTab.url || activeTab.pendingUrl || null;
  let title = activeTab.title || null;

  if (isSkippedUrl(url)) {
    url = null;
    title = null;
  }

  const key = `${win.id}:${activeTab.id}:${url || ""}:${title || ""}`;
  if (key === lastSentKey) return;
  lastSentKey = key;

  await sendMessage({
    type: "tab_active",
    browser: BROWSER,
    url,
    title,
    tab_id: activeTab.id,
    window_id: win.id,
    timestamp,
  });
}

chrome.tabs.onActivated.addListener(() => {
  reportActiveTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete" || changeInfo.title) {
    reportActiveTab();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const settings = await getSettings();
    if (!settings.enabled) return;
    const key = "unfocused";
    if (key === lastSentKey) return;
    lastSentKey = key;
    await sendMessage({
      type: "browser_unfocused",
      browser: BROWSER,
      url: null,
      title: null,
      tab_id: null,
      window_id: null,
      timestamp: Date.now(),
    });
    return;
  }
  reportActiveTab();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled || changes.includeIncognito) {
    lastSentKey = null;
    reportActiveTab();
  }
});

chrome.runtime.onStartup.addListener(() => connect());
chrome.runtime.onInstalled.addListener(() => connect());

connect();
