import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import soldiersRoutes from './modules/soldiers/soldiers.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import rolesRoutes from './modules/roles/roles.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import authRoutes from './modules/auth/auth.routes';
import socRoutes from './modules/soc/soc.routes';
import apiKeysRoutes from './modules/api-keys/api-keys.routes';
import { errorHandler } from './lib/errors';
import { auditMiddleware } from './lib/audit';
import { ipBlockingMiddleware } from './lib/ipBlocking';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// IP blocking middleware - must be before routes
app.use(ipBlockingMiddleware);

// Audit logging middleware - logs all requests
app.use(auditMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/soldiers', soldiersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/soc', socRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Military Resource Management API is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
