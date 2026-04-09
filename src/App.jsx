import { onCleanup, onMount } from "solid-js";
import OrderbookWorker from "./workers/orderbook.worker.js?worker";

function App() {
  let worker;
  let ws;
  let canvasRef;
  let renderLoop;

  let latestData = new Float64Array(200);

  let backendLatency = "0.000";
  let currentSeq = 0;

  let pendingStartTime = 0;
  let totalFullLatency = 0;
  let fullLatencyCount = 0;
  let avgFullLatency = "0.000";
  let hasNewData = false;

  onMount(() => {
    worker = new OrderbookWorker();

    worker.onmessage = (e) => {
      latestData = new Float64Array(e.data.buffer);
      backendLatency = e.data.avgLatency;
      currentSeq = e.data.sequence;
      pendingStartTime = e.data.startTime;
      hasNewData = true;
    };

    ws = new WebSocket("ws://localhost:8080");
    ws.binaryType = "arraybuffer";
    ws.onmessage = (event) => {
      if (worker && event.data) {
        // 🔥 THE STARTING POINT: Capture exact time packet hit the UI thread
        const startTime = performance.timeOrigin + performance.now();
        worker.postMessage({ buffer: event.data, startTime }, [event.data]);
      }
    };

    const canvas = canvasRef;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Canvas setup function
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function draw() {
      renderLoop = requestAnimationFrame(draw);
      if (!hasNewData) return;
      hasNewData = false;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w / 2;

      // 1. Clear Screen
      ctx.fillStyle = "#0f172a"; // bg-slate-900
      ctx.fillRect(0, 0, w, h);

      // --- CALCULATE METRICS ---
      const bestBid = latestData[0] || 0;
      const bestAsk = latestData[100] || 0;
      const spread =
        bestAsk > 0 && bestBid > 0 ? (bestAsk - bestBid).toFixed(4) : "0.0000";

      // Find Max Quantity to scale the depth bars
      let maxQty = 1;
      for (let i = 0; i < 50; i++) {
        const bidQty = latestData[i * 2 + 1] || 0;
        const askQty = latestData[100 + (i * 2 + 1)] || 0;
        if (bidQty > maxQty) maxQty = bidQty;
        if (askQty > maxQty) maxQty = askQty;
      }

      const maxBarWidth = centerX - 40; // Max width a bar can take

      // --- DRAW HEADER METRICS ---
      ctx.fillStyle = "#1e293b"; // bg-slate-800
      ctx.fillRect(0, 0, w, 80);
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#22c55e"; // Green
      ctx.fillText(`BEST BID: ${bestBid.toFixed(4)}`, centerX - 250, 45);
      ctx.fillStyle = "#ef4444"; // Red
      ctx.fillText(`BEST ASK: ${bestAsk.toFixed(4)}`, centerX + 250, 45);
      ctx.fillStyle = "#eab308"; // Yellow
      ctx.fillText(`SPREAD: ${spread}`, centerX, 45);

      // --- DRAW COLUMN HEADERS ---
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "#64748b"; // slate-500
      ctx.textAlign = "right";
      ctx.fillText("QTY | PRICE", centerX - 20, 110);
      ctx.textAlign = "left";
      ctx.fillText("PRICE | QTY", centerX + 20, 110);

      // --- DRAW ORDERBOOK LEVELS ---
      const startY = 140;
      const rowHeight = 22;

      for (let i = 0; i < 50; i++) {
        const y = startY + i * rowHeight;

        // --- DRAW BIDS (LEFT SIDE) ---
        const bidPrice = latestData[i * 2];
        const bidQty = latestData[i * 2 + 1];
        if (bidPrice > 0) {
          const barWidth = (bidQty / maxQty) * maxBarWidth;

          // Depth Bar (Background)
          ctx.fillStyle = "rgba(34, 197, 94, 0.15)"; // Light Green Transparent
          ctx.fillRect(
            centerX - 20 - barWidth,
            y - 15,
            barWidth,
            rowHeight - 2,
          );

          // Text
          ctx.fillStyle = "#22c55e"; // Solid Green
          ctx.textAlign = "right";
          ctx.fillText(
            `${bidQty.toString().padStart(5, " ")} | ${bidPrice.toFixed(2)}`,
            centerX - 20,
            y,
          );
        }

        // --- DRAW ASKS (RIGHT SIDE) ---
        const askPrice = latestData[100 + i * 2];
        const askQty = latestData[100 + (i * 2 + 1)];

        if (askPrice > 0) {
          const barWidth = (askQty / maxQty) * maxBarWidth;

          // Depth Bar (Background)
          ctx.fillStyle = "rgba(239, 68, 68, 0.15)"; // Light Red Transparent
          ctx.fillRect(centerX + 20, y - 15, barWidth, rowHeight - 2);

          // Text
          ctx.fillStyle = "#ef4444"; // Solid Red
          ctx.textAlign = "left";
          ctx.fillText(
            `${askPrice.toFixed(2)} | ${askQty.toString().padEnd(5, " ")}`,
            centerX + 20,
            y,
          );
        }
      }
      if (pendingStartTime > 0) {
        const drawFinishedTime = performance.timeOrigin + performance.now();
        const currentFullLatency = drawFinishedTime - pendingStartTime;

        totalFullLatency += currentFullLatency;
        fullLatencyCount++;
        avgFullLatency = (totalFullLatency / fullLatencyCount).toFixed(3);

        pendingStartTime = 0;
      }
      // --- DRAW FOOTER (LATENCY METRICS) ---
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, h - 40, w, 40);
      ctx.font = "14px monospace";

      // 1. Sequence (
      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Sequence: #${currentSeq}`, 20, h - 15);

      // 2. Backend Latency (Center)
      ctx.textAlign = "center";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Backend Latency: ${backendLatency} ms`, centerX, h - 15);

      // 3. UI Render Latency (Right)
      ctx.textAlign = "right";
      const fullLatNum = parseFloat(avgFullLatency);
      ctx.fillStyle = "#22c55e";
      ctx.fillText(
        `Avg FULL UI Latency (Socket -> Canvas): ${avgFullLatency} ms`,
        w - 20,
        h - 15,
      );
    }

    draw();
  });

  onCleanup(() => {
    if (worker) worker.terminate();
    if (ws) ws.close();
    cancelAnimationFrame(renderLoop);
    window.removeEventListener("resize", resizeCanvas);
  });

  return (
    <div class="fixed inset-0 overflow-hidden bg-slate-900">
      <canvas ref={canvasRef} class="block"></canvas>
    </div>
  );
}

export default App;
