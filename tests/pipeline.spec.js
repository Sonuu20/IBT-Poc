import { test, expect } from "@playwright/test";

test.describe("Orderbook Pipeline Tests", () => {
  test("pipeline is alive (ws → worker → render)", async ({ page }) => {
    await page.goto("/");

    //  Inject tracking system
    await page.evaluate(() => {
      window.__stats = {
        ws: 0,
        worker: 0,
        render: 0,
      };

      window.addEventListener("ws-data", () => window.__stats.ws++);
      window.addEventListener("worker-done", () => window.__stats.worker++);
      window.addEventListener("render-done", () => window.__stats.render++);
    });

    // wait for real system to run
    await page.waitForTimeout(3000);

    const stats = await page.evaluate(() => window.__stats);

    console.log("Stats:", stats);

    expect(stats.ws).toBeGreaterThan(5);
    expect(stats.worker).toBeGreaterThan(5);
    expect(stats.render).toBeGreaterThan(5);
  });

  // --------------------------------------------------------

  test("sequence is increasing (no freeze)", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      window.__seq = [];

      window.addEventListener("worker-done", () => {
        // assume latest sequence exposed globally
        if (window.__lastSequence) {
          window.__seq.push(window.__lastSequence);
        }
      });
    });

    await page.waitForTimeout(3000);

    const seq = await page.evaluate(() => window.__seq);

    console.log("Sequence:", seq);

    // check monotonic increase
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThanOrEqual(seq[i - 1]);
    }
  });

  // --------------------------------------------------------

  test("end-to-end latency (ws → render)", async ({ page }) => {
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

    await page.waitForTimeout(4000);

    const latencies = await page.evaluate(() => window.__latencies);

    console.log("Latencies:", latencies);

    // 🔥 guard
    expect(latencies.length).toBeGreaterThan(0);

    const max = Math.max(...latencies);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    console.log("Max:", max, "Avg:", avg);

    expect(avg).toBeLessThan(50); // tune this
    expect(max).toBeLessThan(100); // worst-case bound
  });
});
