import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import soldiersRoutes from './modules/soldiers/soldiers.routes';
import departmentsRoutes from './modules/departments/departments.routes';
import rolesRoutes from './modules/roles/roles.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import authRoutes from './modules/auth/auth.routes';
import socRoutes from './modules/soc/soc.routes';
import apiKeysRoutes from './modules/api-keys/api-keys.routes';
import studentsRoutes from './modules/students/students.routes';
import studentExitsRoutes from './modules/student-exits/student-exits.routes';
import cohortsRoutes from './modules/cohorts/cohorts.routes';
import tracksRoutes from './modules/tracks/tracks.routes';
import classesRoutes from './modules/classes/classes.routes';
import docsRoutes from './modules/docs/docs.routes';
import permissionsRoutes from './modules/permissions/permissions.routes';
import searchRoutes from './modules/search/search.routes';
import { errorHandler } from './lib/utils/errors';
import { auditMiddleware } from './lib/audit/audit';
import { ipBlockingMiddleware } from './lib/security/ipBlocking';
import { apiRateLimiter } from './lib/security/security';
import { csrfProtection } from './lib/security/csrf';
import { requestIdMiddleware } from './lib/middleware/request-id';
import { requestLoggerMiddleware } from './lib/middleware/request-logger';
import { healthCheck, livenessCheck, readinessCheck } from './lib/utils/health';
import { getMetrics, startMetricsLogging } from './lib/utils/metrics';
import { logger } from './lib/utils/logger';
import { prisma } from './lib/database/prisma';
import { validateEnv } from './lib/utils/env';
import { requireAPIPermission } from './lib/permissions/api-permission-middleware';
import { authenticate, optionalAuthenticate } from './lib/auth/auth';

dotenv.config();

// Validate environment variables on startup
try {
  validateEnv();
} catch (error: any) {
  logger.error({ error: error.message }, 'Failed to validate environment variables');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security: Enforce HTTPS in production
if (isProduction) {
  app.use((req, res, next) => {
    // Check if request is already secure (HTTPS) or forwarded as secure
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (!isSecure) {
      // Redirect HTTP to HTTPS
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
    next();
  });
}

// Security: Helmet.js - Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow CORS for API
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow API access from frontend
}));

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Request ID middleware - must be early to track all requests
app.use(requestIdMiddleware);

// Request logging middleware - logs all HTTP requests with metrics
app.use(requestLoggerMiddleware);

// Security: CSRF Protection for state-changing operations
// Note: This provides basic protection. Full CSRF protection requires frontend changes.
app.use('/api', csrfProtection);

// IP blocking middleware - must be before routes
app.use(ipBlockingMiddleware);

// Rate limiting - protect against abuse
app.use('/api', apiRateLimiter);

// Audit logging middleware - logs all requests
app.use(auditMiddleware);

// List of public API endpoints that don't require authentication
const PUBLIC_API_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/docs', // Docs are public but will show filtered content if authenticated
];

// Helper to check if endpoint is public
function isPublicEndpoint(req: Request): boolean {
  const fullPath = req.originalUrl?.split('?')[0] || req.url.split('?')[0];
  return PUBLIC_API_ENDPOINTS.some(endpoint => fullPath === endpoint || fullPath.startsWith(endpoint + '/'));
}

// Global authentication for API routes (except public endpoints)
// This ensures authentication happens before permission checking
app.use('/api', (req, res, next) => {
  // Public endpoints don't need authentication
  if (isPublicEndpoint(req)) {
    // Use optional auth for docs (to show filtered docs if authenticated)
    if (req.originalUrl?.startsWith('/api/docs') || req.url.startsWith('/api/docs')) {
      return optionalAuthenticate(req, res, next);
    }
    // Other public endpoints (login, register) don't need any auth
    return next();
  }
  // All other API routes require authentication
  return authenticate(req, res, next);
});

// API Permission middleware - checks permissions for all API routes (except public auth endpoints)
// This runs after authentication, so user info is available
app.use('/api', (req, res, next) => {
  // Skip permission check for public auth endpoints and docs (docs handles its own filtering)
  if (isPublicEndpoint(req)) {
    return next();
  }
  // Apply permission check to all other API routes
  requireAPIPermission(req, res, next);
});

// Health check endpoints
app.get('/health', healthCheck);
app.get('/ready', readinessCheck); // Kubernetes readiness probe
app.get('/live', livenessCheck);   // Kubernetes liveness probe

// Metrics endpoint (protected in production)
app.get('/metrics', (req, res) => {
  // In production, you might want to protect this endpoint
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !(req as any).user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(getMetrics());
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/soldiers', soldiersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/student-exits', studentExitsRoutes);
app.use('/api/cohorts', cohortsRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/soc', socRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/search', searchRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Military Resource Management API is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start metrics logging
startMetricsLogging();

// Auto-seed database if empty (only in development and if AUTO_SEED is enabled)
if (process.env.NODE_ENV !== 'production' && process.env.AUTO_SEED === 'true') {
  (async () => {
    try {
      const { seedDatabase } = await import('./lib/database/seed');
      const userCount = await prisma.soldier.count();
      if (userCount === 0) {
        logger.info('Database is empty. Running auto-seed...');
        const result = await seedDatabase();
        if (result.success) {
          logger.info(
            {
              adminEmail: result.admin.email,
              adminId: result.admin.id,
            },
            'Auto-seed completed successfully'
          );
          console.log('\n✅ Database auto-seeded!');
          console.log(`📧 Admin Email: ${result.admin.email}`);
          if ('password' in result.admin) {
            console.log(`🔑 Admin Password: ${result.admin.password}`);
          }
          console.log('⚠️  IMPORTANT: Change the admin password after first login!\n');
        }
      }
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Auto-seed failed (non-critical)');
    }
  })();
}

// Graceful shutdown handler
let server: any;
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');
  
  // Stop accepting new requests
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connections
  try {
    await prisma.$disconnect();
    logger.info('Database connections closed');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error closing database connections');
  }

  // Give ongoing requests time to complete (max 10 seconds)
  setTimeout(() => {
    logger.info('Graceful shutdown complete');
    process.exit(0);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
  // Don't exit on unhandled rejection, but log it
});

// Start server
server = app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  }, `Server is running on port ${PORT}`);
});
