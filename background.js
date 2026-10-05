const INTERVAL_MS = 3000;
let capturing = false;
let timerId = null;
let session = []; // [{ t, r, g, b }]

//Offscreen document
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["DOM_SCRAPING"],
    justification: "Analyze screenshot pixels to compute average color"
  });
}

async function getAverageColor(dataUrl) {
  await ensureOffscreen(); // safety net — no-op if already exists
  const res = await chrome.runtime.sendMessage({
    type: "AVG_COLOR",
    dataUrl
  });
  if (!res?.ok) throw new Error(res?.error || "color calc failed");
  return res.color;
}

//Capture 
async function captureOnce() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith("chrome://")) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "jpeg",
      quality: 60
    });

    const color = await getAverageColor(dataUrl);
    session.push({ t: Date.now(), ...color });

    // Persist so popup can read it
    await chrome.storage.local.set({ session });
  } catch (e) {
    console.warn("capture failed:", e);
  }
}

function start() {
  if (capturing) return;
  capturing = true;
  session = [];
  chrome.storage.local.set({ session, capturing: true });
  captureOnce();
  timerId = setInterval(captureOnce, INTERVAL_MS);
}

function stop() {
  if (!capturing) return;
  capturing = false;
  clearInterval(timerId);
  timerId = null;
  chrome.storage.local.set({ capturing: false });
}

// message
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START") { start(); sendResponse({ ok: true }); }
  else if (msg.type === "STOP") { stop(); sendResponse({ ok: true }); }
  else if (msg.type === "STATUS") {
    sendResponse({ capturing, count: session.length });
  }
  else if (msg.type === "GET_SESSION") {
    sendResponse({ session });
  }
  return true;
});

// Restore state if service worker restarts mid-session
chrome.storage.local.get(["capturing", "session"]).then(({ capturing: c, session: s }) => {
  if (s) session = s;
  if (c && !timerId) {
    capturing = true;
    timerId = setInterval(captureOnce, INTERVAL_MS);
  }
});