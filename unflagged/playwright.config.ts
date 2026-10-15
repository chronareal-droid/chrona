import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against a production build with a mocked backend (no Supabase, Gemini or Dodo needed).
// First run on a new machine: npx playwright install chromium
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4174',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 375, height: 812 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:e2e && npx vite preview --outDir dist-e2e --port 4174 --strictPort',
    url: 'http://localhost:4174',
    // Always build and serve fresh: reusing a server already on the port would test whatever build it serves.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
