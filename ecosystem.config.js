/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 for production deployment.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 * 
 * Note: Update paths and settings according to your server setup.
 */

module.exports = {
  apps: [{
    name: 'school-admissions-api',
    script: './backend/dist/server.js',
    cwd: process.cwd(),
    instances: 2, // Use multiple instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Log file paths (update these for your server)
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
