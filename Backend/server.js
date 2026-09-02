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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for frontend requests
app.use(
  cors({
    origin: '*',
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
app.use('/sos',      sosRouter);      // existing frontend calls use /sos/*
app.use('/api/sos',  sosRouter);      // new spec prefix: /api/sos/*
app.use('/reports',  reportsRouter);
app.use('/heatmap',  heatmapRouter);
app.use('/routes',   routesRouter);

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
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 SafeHer Express & Node.js Server running on http://127.0.0.1:${PORT}`);
  });
});

export default app;
