import { onCleanup, onMount } from "solid-js";
import OrderbookWorker from "./workers/orderbook.worker.js?worker";
import RendererWorker from "./workers/render.worker.js?worker";

function App() {
  let canvasRef;
  let orderbookWorker;
  let rendererWorker;
  let ws;

  onMount(() => {
    // 1. Renderer Worker
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
      [offscreen],
    );

    // 🔥 Listen render completion (TEST HOOK)
    rendererWorker.onmessage = (e) => {
      if (e.data?.type === "render-done") {
        window.dispatchEvent(new Event("render-done"));
      }
    };

    // 2. Orderbook Worker
    orderbookWorker = new OrderbookWorker();

    orderbookWorker.onmessage = (e) => {
      const data = e.data;

      //  expose sequence globally for test
      window.__lastSequence = data.sequence;
      //  TEST HOOK → WS → worker processed
      window.dispatchEvent(new Event("worker-done"));

      rendererWorker.postMessage({ type: "draw", data: e.data });
    };

    // 3. WebSocket
    ws = new WebSocket("ws://localhost:8080");
    ws.binaryType = "arraybuffer";

    ws.onmessage = (event) => {
      if (!orderbookWorker || !event.data) return;

      // 🔥 TEST HOOK → WS received
      window.dispatchEvent(new Event("ws-data"));

      orderbookWorker.postMessage({ buffer: event.data }, [event.data]);
    };

    // 4. Resize
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
      <canvas ref={canvasRef} class="block size-full" />
    </div>
  );
}

export default App;
