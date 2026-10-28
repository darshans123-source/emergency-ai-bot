import express from 'express';
import { apiRouter, setEventBroadcaster } from '../server/routes';
import { authenticate } from '../server/auth';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Broadcaster in serverless environment: log background events
setEventBroadcaster((type: string, data: any) => {
  console.log(`[Vercel Serverless Event: ${type}]`, data?.id || '');
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Serverless WebSocket fallback endpoint
app.all('/ws', (_req, res) => {
  res.status(200).json({
    status: 'serverless_mode',
    message: 'WebSocket gateway runs in serverless fallback mode; automatic client background polling is active.'
  });
});

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'AegisAI Emergency Response Grid API',
    runtime: 'Vercel Serverless Function',
    timestamp: new Date().toISOString()
  });
});

// Authenticate middleware
app.use(authenticate);

// Mount API routes (handles both /api/path and rewritten /path)
app.use('/api', apiRouter);
app.use(apiRouter);

export default app;
