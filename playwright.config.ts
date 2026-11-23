import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:4179',
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.CHROME_PATH },
  },
  webServer: { command: 'npx expo serve --port 4179', url: 'http://localhost:4179', reuseExistingServer: false },
});
