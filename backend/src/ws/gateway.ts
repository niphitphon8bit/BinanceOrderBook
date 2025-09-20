import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import { formatOrderBook } from "../utils/formatOrderBook";

type BroadcastableOrderBook = {
  symbol: string;
  bids: Map<string, string>;
  asks: Map<string, string>;
};

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
const HEARTBEAT_INTERVAL_MS = 5_000;

// Called whenever our local orderbook updates
export function broadcastOrderBook(orderBook: BroadcastableOrderBook) {
  if (!wss) return;
  const payload = JSON.stringify(formatOrderBook(orderBook));
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

// Initialize the WebSocket server
export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server });
  console.log("WebSocket server started");

  wss.on("connection", (socket) => {
    console.log("Client connected to WebSocket");

    socket.on("message", (raw) => {
      try {
        const payload = raw.toString();
        const message = JSON.parse(payload);

        if (message?.type === "pong") {
          return;
        }

        if (message?.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
          return;
        }
      } catch (err) {
        const trimmed = raw.toString().trim().toLowerCase();
        if (trimmed === "ping") {
          socket.send("pong");
          return;
        }
        console.warn("Received non-JSON message from client", raw.toString());
      }
    });
  });

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!wss) return;
    const payload = JSON.stringify({ type: "ping", ts: Date.now() });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }, HEARTBEAT_INTERVAL_MS);
}
