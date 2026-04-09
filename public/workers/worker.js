// public/workers/worker.js
importScripts("../wasm/engine.js");

let wasmEngine = null;
let isSimulationRunning = false;

// Real-world starting prices
let currentPrices = {
  RELIANCE: 2950.0,
  TCS: 3900.0,
  HDFCBANK: 1650.0,
  INFY: 1480.0,
  ICICIBANK: 1050.0,
};

let stats = { processed: 0, rejected: 0 };

createEngineModule({
  locateFile: (path) => (path.endsWith(".wasm") ? "../wasm/" + path : path),
}).then((Module) => {
  wasmEngine = Module;

  // Artificial 1-second delay so you can see the "Booting" UI
  setTimeout(() => {
    postMessage({ type: "READY" });
    startSimulation();
  }, 1000);
});

function startSimulation() {
  isSimulationRunning = true;
  const symbols = Object.keys(currentPrices);
  const LIMIT_PRICE = 4000.0; // Humara Wasm Risk Limit

  // HFT Loop: Runs every 16ms
  setInterval(() => {
    if (!isSimulationRunning) return;

    // Generate 1000 ticks in one go (Massive Throughput Test)
    for (let i = 0; i < 1000; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];

      // Random Walk: Price changes by a tiny amount (-1.0 to +1.0)
      const priceChange = (Math.random() - 0.5) * 2;
      const newPrice = currentPrices[symbol] + priceChange;

      stats.processed++; // Wasm is checking this tick

      // 🔥 NATIVE C++ CALL 🔥
      const isValid = wasmEngine._process_tick(newPrice, LIMIT_PRICE);

      if (isValid) {
        currentPrices[symbol] = newPrice; // Accept the tick
      } else {
        stats.rejected++; // Wasm rejected it (Breached 4000 limit)
        currentPrices[symbol] -= 5; // Force price down so it doesn't get stuck
      }
    }

    // Send consolidated state to UI
    postMessage({
      type: "TICK_BATCH",
      prices: currentPrices,
      stats: stats,
    });
  }, 16); // Throttled to 30ms so human eye can read it smoothly
}

self.onmessage = (e) => {
  if (e.data.type === "PUNCH_ORDER") {
    postMessage({
      type: "ORDER_ACK",
      msg: `✅ INSTANT FILL: Bought ${e.data.symbol} via Web Worker!`,
    });
  }
};
