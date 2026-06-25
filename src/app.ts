import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { activationRoutes } from './routes/activation.routes';
import { adminRoutes } from './routes/admin.routes';
import { syncRoutes } from './routes/sync.routes';
import swaggerDocument from './swagger.json';
import { globalErrorHandler } from './middleware/error.middleware';

export const app = express();

app.use(cors());
app.use(express.json());

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'medi-desk-backend' });
});

app.use('/api', activationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/admin', adminRoutes);

// Global Error Handler Middleware
app.use(globalErrorHandler);

