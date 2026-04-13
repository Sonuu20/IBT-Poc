import createEngineModule from "../wasm/engine.js";
import wasmUrl from "../wasm/engine.wasm?url";

let wasmEngine = null;

// Pre-allocated pointers — malloc sirf ONCE at init
let inputBufferPtr = null;
let INPUT_BUFFER_SIZE = 24 * 1000; // max 1000 updates per packet

createEngineModule({ locateFile: () => wasmUrl }).then((Module) => {
  wasmEngine = Module;

  // 🔥 One-time allocation
  inputBufferPtr = wasmEngine._malloc(INPUT_BUFFER_SIZE);

  console.log("WASM Engine ready, buffer pre-allocated at:", inputBufferPtr);
});

const sharedTop50 = new Float64Array(200);
const sharedMetrics = new Float64Array(3);

self.onmessage = (event) => {
  if (!wasmEngine || inputBufferPtr === null) return;

  const { buffer, startTime } = event.data;
  const byteLength = buffer.byteLength;
  const count = byteLength / 24;

  // Resize pre-allocated buffer if needed (rare case)
  if (byteLength > INPUT_BUFFER_SIZE) {
    wasmEngine._free(inputBufferPtr);
    INPUT_BUFFER_SIZE = byteLength * 2;
    inputBufferPtr = wasmEngine._malloc(INPUT_BUFFER_SIZE);
  }

  // Direct HEAPU8 write — no intermediate Uint8Array
  wasmEngine.HEAPU8.set(new Uint8Array(buffer), inputBufferPtr);
  wasmEngine._process_updates(inputBufferPtr, count);

  // Pointers fetch
  const top50Ptr = wasmEngine._get_top_50();
  const metricsPtr = wasmEngine._get_metrics();

  const heapF64 = wasmEngine.HEAPF64;

  // Direct copy into pre-allocated output — no .slice()
  sharedTop50.set(heapF64.subarray(top50Ptr / 8, top50Ptr / 8 + 200));
  sharedMetrics.set(heapF64.subarray(metricsPtr / 8, metricsPtr / 8 + 3));

  self.postMessage({
    top50: sharedTop50,
    avgLatency: sharedMetrics[0].toFixed(3),
    sequence: sharedMetrics[1],
    startTime,
  });
  // ⚠️ buffer transfer nahi — input buffer ownership WASM ke paas
};
