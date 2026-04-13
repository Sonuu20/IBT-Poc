let ctx = null;
let dpr = 1;
let w = 0,
  h = 0;

const priceCache = new Map();
const qtyCache = new Map();

function fmtPrice(p) {
  let s = priceCache.get(p);
  if (!s) {
    s = p.toFixed(2);
    priceCache.set(p, s);
    if (priceCache.size > 500) priceCache.clear();
  }
  return s;
}

function fmtQty(q) {
  let s = qtyCache.get(q);
  if (!s) {
    s = String(q).padStart(5, " ");
    qtyCache.set(q, s);
    if (qtyCache.size > 500) qtyCache.clear();
  }
  return s;
}

self.onmessage = (event) => {
  const { type, canvas, width, height, devicePixelRatio, data } = event.data;

  if (type === "init") {
    ctx = canvas.getContext("2d", { alpha: false });
    dpr = devicePixelRatio;
    w = width;
    h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    return;
  }

  if (type === "resize") {
    w = width;
    h = height;
    ctx.canvas.width = w * dpr;
    ctx.canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    return;
  }

  if (type === "draw") {
    const { top50, avgLatency, sequence } = data;

    draw(top50, avgLatency, sequence);

    // 🔥 TEST HOOK → notify render complete
    self.postMessage({ type: "render-done" });
  }
};

function draw(latestData, backendLatency, currentSeq) {
  const centerX = w / 2;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);

  const bestBid = latestData[0] || 0;
  const bestAsk = latestData[100] || 0;
  const spread =
    bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(4) : "0.0000";

  let maxQty = 1;
  for (let i = 0; i < 50; i++) {
    const bq = latestData[i * 2 + 1];
    const aq = latestData[100 + i * 2 + 1];
    if (bq > maxQty) maxQty = bq;
    if (aq > maxQty) maxQty = aq;
  }

  const maxBarWidth = centerX - 40;

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, w, 80);

  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.textAlign = "center";

  ctx.fillStyle = "#22c55e";
  ctx.fillText(`BEST BID: ${bestBid.toFixed(4)}`, centerX - 250, 45);

  ctx.fillStyle = "#ef4444";
  ctx.fillText(`BEST ASK: ${bestAsk.toFixed(4)}`, centerX + 250, 45);

  ctx.fillStyle = "#eab308";
  ctx.fillText(`SPREAD: ${spread}`, centerX, 45);

  ctx.font = "14px 'Courier New', monospace";
  ctx.fillStyle = "#64748b";

  ctx.textAlign = "right";
  ctx.fillText("QTY | PRICE", centerX - 20, 110);

  ctx.textAlign = "left";
  ctx.fillText("PRICE | QTY", centerX + 20, 110);

  const startY = 140;
  const rowHeight = 22;

  for (let i = 0; i < 50; i++) {
    const y = startY + i * rowHeight;

    const bidPrice = latestData[i * 2];
    const bidQty = latestData[i * 2 + 1];

    if (bidPrice > 0) {
      const barWidth = (bidQty / maxQty) * maxBarWidth;
      ctx.fillStyle = "rgba(34,197,94,0.15)";
      ctx.fillRect(centerX - 20 - barWidth, y - 15, barWidth, rowHeight - 2);

      ctx.fillStyle = "#22c55e";
      ctx.textAlign = "right";
      ctx.fillText(
        `${fmtQty(bidQty)} | ${fmtPrice(bidPrice)}`,
        centerX - 20,
        y,
      );
    }

    const askPrice = latestData[100 + i * 2];
    const askQty = latestData[100 + i * 2 + 1];

    if (askPrice > 0) {
      const barWidth = (askQty / maxQty) * maxBarWidth;
      ctx.fillStyle = "rgba(239,68,68,0.15)";
      ctx.fillRect(centerX + 20, y - 15, barWidth, rowHeight - 2);

      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "left";
      ctx.fillText(
        `${fmtPrice(askPrice)} | ${fmtQty(askQty)}`,
        centerX + 20,
        y,
      );
    }
  }

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, h - 40, w, 40);

  ctx.font = "14px monospace";

  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`Sequence: #${currentSeq}`, 20, h - 15);

  ctx.textAlign = "center";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`Backend Latency: ${backendLatency} ms`, centerX, h - 15);
}
