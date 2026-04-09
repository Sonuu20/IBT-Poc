#include <emscripten/emscripten.h>
#include <map>
#include <cstdint>
#include <cstring>

// Standard C++ Maps for automatic Red-Black Tree sorting
// greater<double> ensures Bids are sorted highest-to-lowest
std::map<double, int32_t, std::greater<double>> bids;
std::map<double, int32_t> asks;

// Fixed memory buffers to send data back to JavaScript
double top50_buffer[200]; // 100 for Bids, 100 for Asks
double metrics_buffer[3]; // [Avg Latency, Last Sequence, Reserved]

double total_latency = 0;
uint32_t packet_count = 0;
uint32_t last_seq = 0;

// Exactly matches your Backend's 24-byte payload
#pragma pack(push, 1)
struct MarketUpdate
{
  double price;     // 8 bytes
  int32_t qty;      // 4 bytes
  uint8_t side;     // 1 byte
  uint8_t reserved; // 1 byte
  uint16_t padding; // 2 bytes
  uint32_t seq;     // 4 bytes
  float ts_delta;   // 4 bytes
};
#pragma pack(pop)

extern "C"
{

  // 1. Process Raw Binary Buffer
  EMSCRIPTEN_KEEPALIVE
  void process_updates(uint8_t *buffer, int count)
  {
    // Cast the raw bytes directly to our Struct 
    MarketUpdate *updates = reinterpret_cast<MarketUpdate *>(buffer);

    for (int i = 0; i < count; i++)
    {
      double price = updates[i].price;
      int32_t qty = updates[i].qty;
      uint8_t side = updates[i].side;

      // Metrics Update
      if (updates[i].ts_delta > 0)
      {
        total_latency += updates[i].ts_delta;
        packet_count++;
      }
      last_seq = updates[i].seq;

      // Orderbook Update
      if (side == 1)
      { // BID
        if (qty == 0)
          bids.erase(price);
        else
          bids[price] = qty;
      }
      else
      { // ASK
        if (qty == 0)
          asks.erase(price);
        else
          asks[price] = qty;
      }
    }
  }

  // 2. Fetch Sorted Orderbook Array
  EMSCRIPTEN_KEEPALIVE
  double *get_top_50()
  {
    memset(top50_buffer, 0, sizeof(top50_buffer)); // Reset memory

    int i = 0;
    for (auto const &[price, qty] : bids)
    {
      if (i >= 50)
        break;
      top50_buffer[i * 2] = price;
      top50_buffer[i * 2 + 1] = (double)qty;
      i++;
    }

    i = 0;
    for (auto const &[price, qty] : asks)
    {
      if (i >= 50)
        break;
      top50_buffer[100 + i * 2] = price;
      top50_buffer[100 + i * 2 + 1] = (double)qty;
      i++;
    }

    return top50_buffer; // Return Memory Pointer
  }

  // 3. Fetch Metrics Array
  EMSCRIPTEN_KEEPALIVE
  double *get_metrics()
  {
    metrics_buffer[0] = (packet_count > 0) ? (total_latency / packet_count) : 0;
    metrics_buffer[1] = (double)last_seq;
    return metrics_buffer;
  }
}