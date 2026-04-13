import { test, expect } from "@playwright/test";

test.describe("Advanced UI Benchmark Tests", () => {
  test("burst handling (real pipeline)", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      window.__burst = { ws: 0, render: 0 };

      window.addEventListener("ws-data", () => window.__burst.ws++);
      window.addEventListener("render-done", () => window.__burst.render++);
    });

    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => window.__burst);

    console.log("Burst:", data);

    expect(data.ws).toBeGreaterThan(5);
    expect(data.render).toBeGreaterThan(5);
  });

  test("FPS stability", async ({ page }) => {
    await page.goto("/");

    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();

        function loop() {
          frames++;
          if (performance.now() - start < 2000) {
            requestAnimationFrame(loop);
          } else {
            resolve(frames / 2);
          }
        }

        requestAnimationFrame(loop);
      });
    });

    console.log("FPS:", fps);

    expect(fps).not.toBeNaN();
    expect(fps).toBeGreaterThan(50);
  });

  test("no backpressure", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      window.__bp = { ws: 0, worker: 0 };

      window.addEventListener("ws-data", () => window.__bp.ws++);
      window.addEventListener("worker-done", () => window.__bp.worker++);
    });

    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => window.__bp);

    console.log("Backpressure:", data);

    expect(data.worker).toBeGreaterThan(0);

    const diff = data.ws - data.worker;

    expect(diff).toBeLessThan(5);
  });

  test("render consistency", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => {
      window.__rc = { worker: 0, render: 0 };

      window.addEventListener("worker-done", () => window.__rc.worker++);
      window.addEventListener("render-done", () => window.__rc.render++);
    });

    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => window.__rc);

    console.log("Render consistency:", data);

    expect(data.worker).toBeGreaterThan(0);

    const ratio = data.render / data.worker;

    expect(ratio).toBeGreaterThan(0.8);
  });
});
