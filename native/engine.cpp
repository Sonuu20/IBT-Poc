#include <emscripten/emscripten.h>
#include <map>
#include <cstdint>
#include <cstring>

std::map<double, int32_t, std::greater<double>> bids;
std::map<double, int32_t> asks;

double top50_buffer[200];
double metrics_buffer[3];

uint32_t last_seq = 0;

// ✅ KEEP EXACT 24 BYTE STRUCT (MATCH SERVER)
#pragma pack(push, 1)
struct MarketUpdate
{
  double price;     // 8
  int32_t qty;      // 4
  uint8_t side;     // 1
  uint8_t reserved; // 1
  uint16_t padding; // 2
  uint32_t seq;     // 4
  float ts_delta;   // 4  ✅ keep float
};
#pragma pack(pop)

extern "C"
{

  EMSCRIPTEN_KEEPALIVE
  void process_updates(uint8_t *buffer, int count)
  {
    MarketUpdate *updates = reinterpret_cast<MarketUpdate *>(buffer);

    for (int i = 0; i < count; i++)
    {
      const MarketUpdate &u = updates[i];

      last_seq = u.seq;

      if (u.side == 1)
      {
        if (u.qty == 0)
          bids.erase(u.price);
        else
          bids[u.price] = u.qty;
      }
      else
      {
        if (u.qty == 0)
          asks.erase(u.price);
        else
          asks[u.price] = u.qty;
      }
    }
  }

  EMSCRIPTEN_KEEPALIVE
  double *get_top_50()
  {
    memset(top50_buffer, 0, sizeof(top50_buffer));

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

    return top50_buffer;
  }

  EMSCRIPTEN_KEEPALIVE
  double *get_metrics()
  {
    memset(metrics_buffer, 0, sizeof(metrics_buffer));

    metrics_buffer[0] = (double)last_seq;

    double maxQty = 1.0;

    for (auto const &[p, q] : bids)
      if (q > maxQty)
        maxQty = q;

    for (auto const &[p, q] : asks)
      if (q > maxQty)
        maxQty = q;

    metrics_buffer[1] = maxQty;

    return metrics_buffer;
  }
}