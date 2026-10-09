import { createApp } from './app.js';
import config from './config.js';
import { isSeeded } from './db/connection.js';
import { seed } from './scripts/seed.js';

// Render's filesystem is ephemeral, so a fresh instance can boot without the
// generated SQLite file. Rebuilding the sample dataset here keeps the API from
// serving 500s after a restart. ~1s for the prototype dataset.
if (!isSeeded()) {
  console.log('[server] no seeded database found — running seed.');
  seed();
}

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[server] CollegeDost API listening on http://localhost:${config.port}`);
  console.log(`[server] env=${config.env}  allowed origins: ${config.clientOrigins.join(', ')}`);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received, closing.`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
