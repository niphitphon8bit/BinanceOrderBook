"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/orderbook";
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEFAULT_SYMBOL = process.env.NEXT_PUBLIC_SYMBOL ?? "BTCUSDT";

interface OrderbookMessage {
  type: "orderbook";
  symbol: string;
  ts: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface PingMessage {
  type: "ping";
  ts?: number;
}

type BookSide = "bid" | "ask";

interface DisplayRow {
  price: string;
  priceValue: number;
  quantity: string;
  cumulative: string;
  depth: number;
}

function addTotals(levels: [string, string][], count = 5, side: BookSide): DisplayRow[] {
  const parsed: Array<{ price: number; quantity: number; displayPrice: string }> = [];

  for (const [rawPrice, rawQuantity] of levels) {
    const price = parseFloat(rawPrice);
    const quantity = parseFloat(rawQuantity);
    if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }
    parsed.push({ price, quantity, displayPrice: rawPrice });
  }

  if (side === "ask") {
    parsed.sort((a, b) => a.price - b.price);
  } else {
    parsed.sort((a, b) => b.price - a.price);
  }

  const rows = parsed.slice(0, count);
  const totalQuantity = rows.reduce((acc, { quantity }) => acc + quantity, 0);
  let running = 0;

  const display = rows.map(({ price, quantity, displayPrice }) => {
    running += quantity;

    let depthRatio = 0;
    if (totalQuantity > 0) {
      if (side === "ask") {
        const remaining = totalQuantity - (running - quantity);
        const normalized = remaining / totalQuantity;
        depthRatio = Math.sqrt(Math.min(1, Math.max(0, normalized)));
      } else {
        depthRatio = running / totalQuantity;
      }
    }

    return {
      price: displayPrice,
      priceValue: price,
      quantity: quantity.toFixed(7),
      cumulative: running.toFixed(7),
      depth: Math.min(1, Math.max(0, depthRatio)),
    };
  });

  while (display.length < count) {
    display.push({
      price: "--",
      priceValue: Number.NaN,
      quantity: "--",
      cumulative: "--",
      depth: 0,
    });
  }

  return display;
}


export default function Home() {
  const [socketState, setSocketState] = useState<"connecting" | "open" | "closed">("connecting");
  const [orderbook, setOrderbook] = useState<OrderbookMessage | null>(null);
  const [lastPing, setLastPing] = useState<number | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let disposed = false;

    const connectWebSocket = () => {
      if (disposed) return;
      const socket = new WebSocket(DEFAULT_WS_URL);
      ws = socket;

      socket.addEventListener("open", () => {
        setSocketState("open");
      });

      socket.addEventListener("close", () => {
        setSocketState("closed");
      });

      socket.addEventListener("message", (event) => {
        const { data } = event;

        if (typeof data === "string") {
          if (data.trim().toLowerCase() === "ping") {
            socket.send("pong");
            setLastPing(Date.now());
            return;
          }

          try {
            const payload = JSON.parse(data) as OrderbookMessage | PingMessage;

            if (payload.type === "ping") {
              socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
              setLastPing(payload.ts ?? Date.now());
              return;
            }

            if (payload.type === "orderbook") {
              setOrderbook(payload);
              return;
            }
          } catch (error) {
            console.warn("Unhandled socket payload", data);
          }
        }
      });
    };

    const initializeOrderBook = async () => {
      try {
        const response = await fetch(`${DEFAULT_API_URL}/binance/init/${DEFAULT_SYMBOL}?limit=1000`);
        if (!response.ok) {
          throw new Error(`Failed to initialize orderbook: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to initialize orderbook snapshot", error);
      } finally {
        connectWebSocket();
      }
    };

    initializeOrderBook();

    return () => {
      disposed = true;
      ws?.close();
    };
  }, []);

  const formattedBids = useMemo(() => addTotals(orderbook?.bids ?? [], 5, "bid"), [orderbook?.bids]);
  const formattedAsks = useMemo(() => addTotals(orderbook?.asks ?? [], 5, "ask"), [orderbook?.asks]);

  const bestBidRow = formattedBids.find(row => Number.isFinite(row.priceValue)) ?? null;
  const bestAskRow = formattedAsks.find(row => Number.isFinite(row.priceValue)) ?? null;

  const spread = useMemo(() => {
    const bid = bestBidRow?.priceValue;
    const ask = bestAskRow?.priceValue;
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid === undefined || ask === undefined) {
      return null;
    }
    return (ask - bid).toFixed(2);
  }, [bestBidRow, bestAskRow]);

  const lastUpdated = orderbook?.ts ? new Date(orderbook.ts).toLocaleTimeString() : "--";

  return (
    <main style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ margin: 0 }}>BTCUSDT Order Book</h1>
          <p style={{ margin: "0.5rem 0", color: "#8f9bb3" }}>
            Connection: <strong>{socketState}</strong> · Last ping: {lastPing ? new Date(lastPing).toLocaleTimeString() : "--"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0 }}>
            Best Bid: {bestBidRow ? `${bestBidRow.price} (${bestBidRow.quantity})` : "--"}
          </p>
          <p style={{ margin: 0 }}>
            Best Ask: {bestAskRow ? `${bestAskRow.price} (${bestAskRow.quantity})` : "--"}
          </p>
          <p style={{ margin: 0 }}>Spread: {spread ?? "--"}</p>
        </div>
      </header>


      <section style={{ marginTop: "2rem" }}>
        <p style={{ margin: "0 0 1rem", color: "#8f9bb3" }}>Last update: {lastUpdated}</p>
        <div className="orderbook-stack">
          <OrderTable title="Top 5 Asks" rows={formattedAsks} accent="#e74c3c" alignment="left" />
          <OrderTable title="Top 5 Bids" rows={formattedBids} accent="#2ecc71" alignment="right" />
        </div>
      </section>
    </main>
  );
}

function OrderTable({
  title,
  rows,
  accent,
  alignment,
}: {
  title: string;
  rows: DisplayRow[];
  accent: string;
  alignment: "left" | "right";
}) {
  return (
    <div className="orderbook-card">
      <h2 className="orderbook-title">{title}</h2>
      <table className="orderbook-table">
        <thead>
          <tr className="orderbook-header" data-align="left">
            <th>Price (USDT)</th>
            <th>Amount (BTC)</th>
            <th>Total (BTC)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="orderbook-empty">
                Waiting for data…
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const depthPercent = Math.min(100, Math.max(0, row.depth * 100));
              const gradientDirection = "to left";
              const depthStyle = {
                backgroundImage: `linear-gradient(${gradientDirection}, ${accent}33 ${depthPercent}%, transparent ${depthPercent}%)`,
              } as const;

              return (
                <tr key={`${row.price}-${index}`} className="orderbook-row" data-align="left">
                  <td className="orderbook-cell orderbook-price" style={{ color: accent }}>
                    {row.price}
                  </td>
                  <td className="orderbook-cell">{row.quantity}</td>
                  <td className="orderbook-cell orderbook-total">
                    <span className="orderbook-depth" style={depthStyle}>
                      {row.cumulative}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
