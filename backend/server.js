import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';

// Middleware imports
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Models for cron
import Invoice from './models/Invoice.js';
import Product from './models/Product.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev convenience
    },
    credentials: true,
  })
);

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── SSE: Real-Time Notification Clients ──────────────────────────────────────
const sseClients = new Set();

// SSE connection endpoint
app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial heartbeat
  res.write('data: {"type":"connected","message":"Notification stream connected"}\n\n');

  sseClients.add(res);

  // Keep alive every 25 seconds
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// Helper to broadcast to all SSE clients
const broadcastNotification = (notification) => {
  const data = JSON.stringify(notification);
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  });
};

// Make broadcast available globally for controllers
app.locals.broadcastNotification = broadcastNotification;

// ─── CRON: Auto-flag overdue invoices every hour ───────────────────────────────
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const result = await Invoice.updateMany(
      {
        status: 'Sent',
        dueDate: { $ne: null, $lt: now },
      },
      { $set: { status: 'Overdue' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[CRON] Marked ${result.modifiedCount} invoices as Overdue`);
      broadcastNotification({
        type: 'overdue',
        severity: 'high',
        title: 'Overdue Invoices Detected',
        message: `${result.modifiedCount} invoice(s) are now overdue`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[CRON] Overdue check failed:', err.message);
  }
});

// ─── CRON: Expiry alerts daily at 8:00 AM ─────────────────────────────────────
cron.schedule('0 8 * * *', async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await Product.find({
      isActive: true,
      expiryDate: { $ne: null, $gte: now, $lte: in7Days },
    }).select('name stock expiryDate');

    const expired = await Product.find({
      isActive: true,
      expiryDate: { $ne: null, $lt: now },
    }).select('name stock');

    if (expired.length > 0) {
      broadcastNotification({
        type: 'expired',
        severity: 'critical',
        title: `${expired.length} Product(s) EXPIRED`,
        message: expired.map((p) => p.name).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    if (expiringSoon.length > 0) {
      broadcastNotification({
        type: 'expiry',
        severity: 'high',
        title: `${expiringSoon.length} Product(s) expiring within 7 days`,
        message: expiringSoon.map((p) => p.name).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CRON] Expiry check: ${expired.length} expired, ${expiringSoon.length} expiring soon`);
  } catch (err) {
    console.error('[CRON] Expiry check failed:', err.message);
  }
});

// ─── CRON: Low stock alerts daily at 9:00 AM ──────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  try {
    const lowStock = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] },
    }).select('name stock minStock');

    if (lowStock.length > 0) {
      broadcastNotification({
        type: 'lowStock',
        severity: 'medium',
        title: `${lowStock.length} Product(s) low on stock`,
        message: lowStock.slice(0, 5).map((p) => `${p.name} (${p.stock})`).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[CRON] Low stock check: ${lowStock.length} products`);
  } catch (err) {
    console.error('[CRON] Low stock check failed:', err.message);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Sri Chenna Kesava Traders Invoice API',
    sseClients: sseClients.size,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);

// --- TEMPORARY SEED ENDPOINT ---
app.get('/api/seed', async (req, res, next) => {
  try {
    const { seedDatabase } = await import('./scratch/seed_invoices.js');
    await seedDatabase(req, res);
  } catch (err) {
    next(err);
  }
});
// -------------------------------

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Invoice API Server running on port ${PORT}`);
  console.log(`📡 SSE Notifications: /api/notifications/stream`);
  console.log(`⏰ Cron jobs: Overdue (hourly), Expiry (8AM), LowStock (9AM)`);
});
