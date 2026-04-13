import { test, expect } from "@playwright/test";

test("latency percentiles (P50, P95, P99)", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    window.__latencies = [];
    window.__lastTick = 0;

    window.addEventListener("ws-data", () => {
      window.__lastTick = performance.now();
    });

    window.addEventListener("render-done", () => {
      if (window.__lastTick > 0) {
        const latency = performance.now() - window.__lastTick;
        window.__latencies.push(latency);
      }
    });
  });

  // 🔥 collect enough samples
  await page.waitForTimeout(5000);

  const latencies = await page.evaluate(() => window.__latencies);

  console.log("Raw Latencies:", latencies);

  // ✅ guard
  expect(latencies.length).toBeGreaterThan(10);

  // 🔥 SORT (IMPORTANT)
  latencies.sort((a, b) => a - b);

  // 🎯 percentile function
  const percentile = (arr, p) => {
    const index = Math.floor((p / 100) * arr.length);
    return arr[Math.min(index, arr.length - 1)];
  };

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log("P50:", p50);
  console.log("P95:", p95);
  console.log("P99:", p99);

  // ✅ assertions (tune based on your system)
  expect(p50).toBeLessThan(10); // normal latency
  expect(p95).toBeLessThan(20); // stress
  expect(p99).toBeLessThan(50); // worst-case spike
});
