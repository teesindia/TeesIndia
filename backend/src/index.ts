import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import wishlistRoutes from './routes/wishlist.routes';
import blogRoutes from './routes/blog.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import collectionRoutes from './routes/collection.routes';
import settingsRoutes from './routes/settings.routes';
import { checkKillSwitch } from './middlewares/killSwitch.middleware';
import { sendServerError } from './lib/server-error';

const app = express();

// ─── Middleware ────────────────────────────────────────────
// Parse configured client origins and auto-allow both www and non-www variants
const getAllowedOrigins = (): Set<string> => {
  const rawOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowed = new Set<string>();

  for (const origin of rawOrigins) {
    allowed.add(origin);
    try {
      const url = new URL(origin);
      if (url.hostname.startsWith('www.')) {
        // Auto-allow non-www version (e.g. https://www.teesindia.com -> https://teesindia.com)
        const nonWwwHost = url.hostname.replace(/^www\./, '');
        allowed.add(`${url.protocol}//${nonWwwHost}${url.port ? `:${url.port}` : ''}`);
      } else if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
        // Auto-allow www version (e.g. https://teesindia.com -> https://www.teesindia.com)
        allowed.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
      }
    } catch {
      // Ignore invalid URL formats
    }
  }

  return allowed;
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.has(origin) || allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
}));

app.use(bodyParser.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    // Store raw body for Razorpay webhook signature verification
    (req as typeof req & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────
// Kill-switch: checked on every /api request before hitting any route handler
app.use('/api', checkKillSwitch);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendServerError(res, 'Unhandled request error', err, 'Internal server error');
});

export default app;
