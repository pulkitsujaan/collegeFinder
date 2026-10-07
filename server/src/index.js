import { createApp } from './app.js';
import config from './config.js';

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
