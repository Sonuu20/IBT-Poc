import { createSignal, onMount, onCleanup, For } from "solid-js";

function App() {
  const [prices, setPrices] = createSignal({});
  const [stats, setStats] = createSignal({ processed: 0, rejected: 0 });
  const [status, setStatus] = createSignal("⏳ Booting WASM Engine...");
  const [orderAck, setOrderAck] = createSignal("");

  let worker;

  onMount(() => {
    worker = new Worker("/workers/worker.js");

    worker.onmessage = (e) => {
      const { type, prices: newPrices, stats: newStats, msg } = e.data;

      if (type === "READY") {
        setStatus("🟢 WASM Engine Active & HFT Simulation Running");
      } else if (type === "TICK_BATCH") {
        setPrices({ ...newPrices });
        setStats({ ...newStats });
      } else if (type === "ORDER_ACK") {
        setOrderAck(msg);
        setTimeout(() => setOrderAck(""), 2500);
      }
    };

    onCleanup(() => worker.terminate());
  });

  const punchOrder = (symbol) => {
    if (worker) worker.postMessage({ type: "PUNCH_ORDER", symbol });
  };

  return (
    <div
      style={{
        padding: "20px",
        "font-family": "Segoe UI, sans-serif",
        background: "#f4f7f6",
        "min-height": "100vh",
      }}
    >
      <h2>⚡ Web-Based HFT Terminal</h2>

      {/* Top Status Bar */}
      <div
        style={{
          background: "#2c3e50",
          color: "white",
          padding: "15px",
          "border-radius": "8px",
          "margin-bottom": "20px",
          display: "flex",
          "justify-content": "space-between",
        }}
      >
        <h4
          style={{
            margin: 0,
            color: status().includes("Active") ? "#2ecc71" : "#f1c40f",
          }}
        >
          {status()}
        </h4>
        <div style={{ "text-align": "right" }}>
          <div style={{ "font-size": "12px", color: "#bdc3c7" }}>
            WASM THROUGHPUT (TICKS CHECKED)
          </div>
          <div style={{ "font-weight": "bold", "font-size": "20px" }}>
            {stats().processed.toLocaleString()}
          </div>
          <div style={{ "font-size": "12px", color: "#e74c3c" }}>
            Risk Rejections: {stats().rejected.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Trading Grid */}
      <div
        style={{
          display: "grid",
          "grid-template-columns": "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <For each={Object.entries(prices())}>
          {([symbol, price]) => (
            <div
              style={{
                background: "white",
                padding: "20px",
                "border-radius": "10px",
                "box-shadow": "0 4px 6px rgba(0,0,0,0.05)",
                "text-align": "center",
                position: "relative",
              }}
            >
              <h3 style={{ margin: "0 0 10px 0", color: "#34495e" }}>
                {symbol}
              </h3>

              {/* Price Display */}
              <h1
                style={{
                  color: "#2980b9",
                  margin: "10px 0 20px 0",
                  "font-family": "monospace",
                }}
              >
                ₹{price.toFixed(2)}
              </h1>

              <button
                onClick={() => punchOrder(symbol)}
                style={{
                  background: "#e74c3c",
                  color: "white",
                  padding: "13px",
                  border: "none",
                  "border-radius": "6px",
                  cursor: "pointer",
                  "font-weight": "bold",
                  width: "100%",
                  "font-size": "16px",
                  transition: "0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#c0392b")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#e74c3c")
                }
              >
                PUNCH BUY
              </button>
            </div>
          )}
        </For>
      </div>

      {/* Massive Order Acknowledgment Popup */}
      {orderAck() && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#27ae60",
            color: "white",
            padding: "20px 40px",
            "border-radius": "50px",
            "box-shadow": "0 10px 20px rgba(0,0,0,0.2)",
            "font-size": "18px",
            "font-weight": "bold",
            "z-index": 1000,
            animation: "popIn 0.3s ease-out",
          }}
        >
          {orderAck()}
        </div>
      )}

      {/* Simple CSS animation for the popup */}
      <style>{`
        @keyframes popIn {
          0% { transform: translate(-50%, 20px); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
