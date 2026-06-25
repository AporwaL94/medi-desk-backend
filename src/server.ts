import 'reflect-metadata';
import { app } from './app';
import { env } from './config/env';
import { initDatabase } from './models/database';
import { initCronJobs } from './services/cron.service';

initDatabase()
  .then(() => {
    initCronJobs();
    const server = app.listen(env.port, () => {
      console.log(`Kirana Desk backend running on http://localhost:${env.port}`);
    });

    // Graceful shutdown — releases port before tsx watch restarts the process.
    // Without this, the old server holds port 3000 and the new instance gets EADDRINUSE.
    const shutdown = (signal: string) => {
      console.log(`\n[${signal}] Closing server gracefully...`);
      server.close(() => {
        console.log('Server closed. Port released.');
        process.exit(0);
      });

      // Force-exit after 3 seconds if connections are still open
      setTimeout(() => {
        console.error('Forced exit after timeout.');
        process.exit(1);
      }, 3000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle EADDRINUSE explicitly with a clear message
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${env.port} is already in use.`);
        console.error(`   Run: netstat -ano | findstr :${env.port}  — then taskkill /PID <id> /F`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error('Failed to start Kirana Desk backend', error);
    process.exit(1);
  });

