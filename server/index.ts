import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db';
import { loginHandler, authenticateToken } from './auth';
import apiRoutes from './routes';
import { createServer } from 'http';
import { setupWebSocket } from './websocket';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/auth/login', loginHandler);

// Protected Route Example
app.get('/api/admin/me', authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});

// Admin API Routes
app.use('/api', authenticateToken, apiRoutes);

const server = createServer(app);
setupWebSocket(server);

server.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  await initDB();
});
