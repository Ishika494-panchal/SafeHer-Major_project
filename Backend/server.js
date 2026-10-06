import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDB } from './config/database.js';
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contacts.js';
import sosRouter from './routes/sos.js';
import reportsRouter from './routes/reports.js';
import heatmapRouter from './routes/heatmap.js';
import routesRouter from './routes/routes.js';
import adminReportsRouter from './routes/adminReports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for frontend requests
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*']
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure static upload folder exists
const staticDir = path.resolve(__dirname, 'static');
const uploadDir = path.resolve(staticDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static assets & uploaded incident evidence
app.use('/static', express.static(staticDir));

// Register API Routes
app.use('/auth',     authRouter);
app.use('/contacts', contactsRouter);
app.use('/sos',      sosRouter);
app.use('/api/sos',  sosRouter);
app.use('/reports',  reportsRouter);
app.use('/api/reports', reportsRouter);
app.use('/heatmap',  heatmapRouter);
app.use('/routes',     routesRouter);
app.use('/api/routes', routesRouter);
app.use('/api/admin/reports', adminReportsRouter);

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({
    app: 'SafeHer Core Backend (Express / Node.js)',
    status: 'online',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    detail: err.message || 'Internal Server Error'
  });
});

// Initialize database and start listening
// Bind to 0.0.0.0 so Render (and other cloud hosts) can route traffic to the process
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SafeHer Express & Node.js Server running on port ${PORT}`);
  });
});

export default app;
