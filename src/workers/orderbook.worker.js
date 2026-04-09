import createEngineModule from "../wasm/engine.js";
import wasmUrl from "../wasm/engine.wasm?url";

let wasmEngine = null;

createEngineModule({
  locateFile: () => wasmUrl,
}).then((Module) => {
  wasmEngine = Module;
  console.log("🔥 WASM C++ Engine Booted in ES Worker!");
});

self.onmessage = (event) => {
  if (!wasmEngine) return;

  const { buffer, startTime } = event.data;
  const byteLength = buffer.byteLength;
  const count = byteLength / 24;

  // 🔥 BULLETPROOF MEMORY ACCESS: Agar HEAPU8 nahi mila, toh native WebAssembly memory use karo
  const heapU8 =
    wasmEngine.HEAPU8 || new Uint8Array(wasmEngine.wasmMemory.buffer);
  const heapF64 =
    wasmEngine.HEAPF64 || new Float64Array(wasmEngine.wasmMemory.buffer);

  const wasmBufferPtr = wasmEngine._malloc(byteLength);

  // Yahan ab direct heapU8 use karenge
  heapU8.set(new Uint8Array(buffer), wasmBufferPtr);

  wasmEngine._process_updates(wasmBufferPtr, count);

  const top50Ptr = wasmEngine._get_top_50();
  const metricsPtr = wasmEngine._get_metrics();

  // Yahan ab direct heapF64 use karenge
  const top50Array = heapF64.subarray(top50Ptr / 8, top50Ptr / 8 + 200);
  const metricsArray = heapF64.subarray(metricsPtr / 8, metricsPtr / 8 + 3);

  const avgLatency = metricsArray[0].toFixed(3);
  const sequence = metricsArray[1];

  const payload = new Float64Array(top50Array).slice();

  wasmEngine._free(wasmBufferPtr);

  self.postMessage(
    {
      buffer: payload.buffer,
      avgLatency: avgLatency,
      sequence: sequence,
      startTime: startTime,
    },
    [payload.buffer],
  );
};
