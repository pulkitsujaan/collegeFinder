import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Tests share one SQLite file and seed it once, so they run in order.
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_FILE: 'data/test.sqlite',
      JWT_SECRET: 'test-secret-not-used-in-production',
    },
  },
});
