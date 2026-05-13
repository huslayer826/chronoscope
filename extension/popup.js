const DEFAULTS = { enabled: true, includeIncognito: false, connected: false };

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const enabledToggle = document.getElementById("enabledToggle");
const incognitoToggle = document.getElementById("incognitoToggle");

async function loadState() {
  const state = await chrome.storage.local.get(DEFAULTS);
  enabledToggle.checked = !!state.enabled;
  incognitoToggle.checked = !!state.includeIncognito;
  renderStatus(state.connected, state.enabled);
}

function renderStatus(isConnected, isEnabled) {
  statusDot.classList.remove("on", "off");
  if (!isEnabled) {
    statusDot.classList.add("off");
    statusText.textContent = "disabled";
    return;
  }
  if (isConnected) {
    statusDot.classList.add("on");
    statusText.textContent = "connected";
  } else {
    statusDot.classList.add("off");
    statusText.textContent = "disconnected";
  }
}

enabledToggle.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: enabledToggle.checked });
});

incognitoToggle.addEventListener("change", async () => {
  await chrome.storage.local.set({ includeIncognito: incognitoToggle.checked });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  loadState();
});

loadState();
setInterval(loadState, 2000);
