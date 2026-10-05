const canvas = document.getElementById("barcode");
const ctx = canvas.getContext("2d");
const toggleBtn = document.getElementById("toggle");
const resetBtn = document.getElementById("reset");
const exportBtn = document.getElementById("export");
const countEl = document.getElementById("count");

async function refresh() {
  const { session = [], capturing = false } =
    await chrome.storage.local.get(["session", "capturing"]);

  toggleBtn.textContent = capturing ? "Stop" : "Start";
  countEl.textContent = `${session.length} samples`;
  drawBarcode(session);
}

function drawBarcode(session) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!session.length) return;

  const w = canvas.width / session.length;
  session.forEach((c, i) => {
    ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
    // use ceil to avoid gaps from fractional pixels
    ctx.fillRect(Math.floor(i * w), 0, Math.ceil(w), canvas.height);
  });
}

toggleBtn.onclick = async () => {
  const { capturing } = await chrome.storage.local.get("capturing");
  await chrome.runtime.sendMessage({ type: capturing ? "STOP" : "START" });
  refresh();
};

resetBtn.onclick = async () => {
  await chrome.storage.local.set({ session: [] });
  refresh();
};

exportBtn.onclick = () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `movie-barcode-${Date.now()}.png`;
  a.click();
};

// Live update while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.session || changes.capturing)) refresh();
});

refresh();