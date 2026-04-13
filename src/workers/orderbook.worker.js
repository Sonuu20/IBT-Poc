import createEngineModule from "../wasm/engine.js";
import wasmUrl from "../wasm/engine.wasm?url";

let wasmEngine = null;

let inputBufferPtr = null;
let INPUT_BUFFER_SIZE = 24 * 1000;

createEngineModule({ locateFile: () => wasmUrl }).then((Module) => {
  wasmEngine = Module;

  inputBufferPtr = wasmEngine._malloc(INPUT_BUFFER_SIZE);

  console.log("WASM Engine ready:", inputBufferPtr);
});

const sharedTop50 = new Float64Array(200);
const sharedMetrics = new Float64Array(3);

self.onmessage = (event) => {
  if (!wasmEngine || inputBufferPtr === null) return;

  const { buffer } = event.data;
  const byteLength = buffer.byteLength;
  const count = byteLength / 24;

  if (byteLength > INPUT_BUFFER_SIZE) {
    wasmEngine._free(inputBufferPtr);
    INPUT_BUFFER_SIZE = byteLength * 2;
    inputBufferPtr = wasmEngine._malloc(INPUT_BUFFER_SIZE);
  }

  wasmEngine.HEAPU8.set(new Uint8Array(buffer), inputBufferPtr);
  wasmEngine._process_updates(inputBufferPtr, count);

  const top50Ptr = wasmEngine._get_top_50();
  const metricsPtr = wasmEngine._get_metrics();

  const heapF64 = wasmEngine.HEAPF64;

  sharedTop50.set(heapF64.subarray(top50Ptr / 8, top50Ptr / 8 + 200));
  sharedMetrics.set(heapF64.subarray(metricsPtr / 8, metricsPtr / 8 + 3));

  self.postMessage({
    top50: sharedTop50,
    sequence: sharedMetrics[0],
    maxQty: sharedMetrics[1],
  });
};
