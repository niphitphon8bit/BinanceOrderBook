# Binance Order Book

Full‑stack order book viewer that keeps a local Binance depth snapshot in sync on the backend and streams formatted updates to a Next.js frontend.

---

## Backend (Express + WebSocket)

- Install dependencies
  ```bash
  cd backend
  npm install
  ```
- Development server (watches TS files)
  ```bash
  npm run dev
  ```
- Environment
  - `PORT` (default `3001`)
- REST endpoints
  - `GET /binance/init/:symbol?limit=1000` – fetches a depth snapshot and starts streaming updates.
  - `GET /binance/state` – returns the current in-memory order book (for debugging).
- WebSocket
  - Served at `/orderbook` on the same port.
  - Emits `orderbook` payloads containing top bid/ask levels and periodic `ping` heartbeats.

## Frontend (Next.js 14 App Router)

- Install dependencies
  ```bash
  cd frontend
  npm install
  ```
- Environment variables (optional)
  - `NEXT_PUBLIC_WS_URL` – WebSocket endpoint (default `ws://localhost:3001/orderbook`)
  - `NEXT_PUBLIC_API_URL` – REST base URL (default `http://localhost:3001`)
  - `NEXT_PUBLIC_SYMBOL` – trading pair to initialize (default `BTCUSDT`)
- Start the dev server
  ```bash
  npm run dev
  ```
- Open `http://localhost:3000` to launch the UI. On load it calls `/binance/init/:symbol`, subscribes to the WS stream, and renders the live top‑of‑book tables with depth shading.

---

## Notes

- The backend aggregates raw Binance levels, filters tiny quantities, and keeps the book resynced if gaps occur.
- The frontend displays cumulative totals, spreads, and heartbeat state; gradients are oriented from the spread outward for both bids and asks.
- For production, build both apps with `npm run build` in their respective directories and serve via your preferred process manager.
