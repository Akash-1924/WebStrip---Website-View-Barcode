chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("HEOOLL");
  if (msg.type !== "AVG_COLOR") return;

  const img = new Image();
  img.onload = () => {
    try {
      const W = 32, H = 32;
      const canvas = new OffscreenCanvas(W, H);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      let r = 0, g = 0, b = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2];
      }
      sendResponse({
        ok: true,
        color: {
          r: Math.round(r / n),
          g: Math.round(g / n),
          b: Math.round(b / n)
        }
      });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  };
  img.onerror = () => sendResponse({ ok: false, error: "image load failed" });
  img.src = msg.dataUrl;
  return true; // async
});