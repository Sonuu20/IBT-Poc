import { onCleanup, onMount } from "solid-js";;
import OrderbookWorker from "./workers/orderbook.worker.js?worker";
import RendererWorker from "./workers/render.worker.js?worker";

function App() {
  let canvasRef;
  let orderbookWorker;
  let rendererWorker;
  let ws;

  onMount(() => {
    // 1. Renderer Worker — OffscreenCanvas ko transfer karo
    rendererWorker = new RendererWorker();
    const offscreen = canvasRef.transferControlToOffscreen();

    rendererWorker.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
      [offscreen], // Transfer ownership
    );

    // 2. Orderbook Worker — processed data renderer ko bhejo
    orderbookWorker = new OrderbookWorker();
    orderbookWorker.onmessage = (e) => {
      // Main thread sirf forward karta hai — zero processing
      rendererWorker.postMessage({ type: "draw", data: e.data });
    };

    // 3. WebSocket
    ws = new WebSocket("ws://localhost:8080");
    ws.binaryType = "arraybuffer";
    ws.onmessage = (event) => {
      if (!orderbookWorker || !event.data) return;
      const startTime = performance.timeOrigin + performance.now();
      orderbookWorker.postMessage({ buffer: event.data, startTime }, [
        event.data,
      ]);
    };

    // 4. Resize handler
    const onResize = () => {
      rendererWorker.postMessage({
        type: "resize",
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", onResize);

    onCleanup(() => {
      orderbookWorker?.terminate();
      rendererWorker?.terminate();
      ws?.close();
      window.removeEventListener("resize", onResize);
    });
  });

  return (
    <div class="fixed inset-0 overflow-hidden bg-slate-900">
      {/* alpha:false already renderer worker me set hai */}
      <canvas ref={canvasRef} class="block size-full" />
    </div>
  );
}

export default App;
