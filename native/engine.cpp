#include <emscripten/emscripten.h>

extern "C"
{

  // EMSCRIPTEN_KEEPALIVE ensures the compiler doesn't remove this function
  EMSCRIPTEN_KEEPALIVE
  bool process_tick(double price, double limit)
  {
    // HFT POC Logic: Accept the tick only if the price hasn't breached the limit.
    // In a real scenario, this would check complex in-memory structures or FlatBuffers.
    return price <= limit;
  }

  // Aap future mein yahan aur complex logic add kar sakte hain
  // jaise order book calculation, latency tracking, etc.
}