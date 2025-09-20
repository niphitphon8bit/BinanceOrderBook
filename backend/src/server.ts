import app from './app';
import dotenv from 'dotenv';
import { initWebSocketServer } from './ws/gateway';
import http from 'http';

dotenv.config();

const server = http.createServer(app);
initWebSocketServer(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
