import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['api-backend/**', 'e2e/**', '**/node_modules/**'],
  },
});
