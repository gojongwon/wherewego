import { defineConfig, devices } from '@playwright/test';

/**
 * 모바일 뷰포트 e2e (설계서 §9.1). `npm run build` 후 preview 서버를 띄워 검사한다.
 * 브라우저가 없으면: npx playwright install chromium
 * 시스템 크롬을 쓰려면: PW_CHROMIUM=/path/to/chrome npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    // iPhone 뷰포트·터치·DPR 에뮬레이션은 쓰되 엔진은 Chromium (WebKit 설치 불필요)
    ...devices['iPhone 14'],
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
      // 컨테이너(root)에서만 필요. 로컬 Mac에서는 설정하지 않는다.
      ...(process.env.PW_NO_SANDBOX ? { args: ['--no-sandbox'] } : {}),
    },
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
