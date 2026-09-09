import { expect, test, type Page } from '@playwright/test';

/** 화면 한가운데서 (dx, dy)만큼 끌었다 놓는다 — 아래로 끌면 위로 날아간다 */
async function pull(page: Page, dx: number, dy: number) {
  const sx = 200;
  const sy = 560;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(sx + (dx * i) / 10, sy + (dy * i) / 10);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 3D 씬(WebGL)이 뜨고 지형이 올라간 뒤 시작
  await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', '1', { timeout: 10_000 });
});

test('첫 화면: 지도 249개 시군구와 안내 힌트', async ({ page }) => {
  await expect(page.getByTestId('scene')).toHaveAttribute('data-region-count', '249');
  await expect(page.locator('.stage')).toHaveAttribute('data-phase', 'IDLE');
  await expect(page.locator('.stage')).toHaveAttribute('data-map', 'kr');
  await expect(page.getByTestId('hint')).toContainText('아래로 당겼다 놓으면');
  await expect(page.getByTestId('wind')).toContainText(/km/);
});

test('일본 지도: 도도부현 46', async ({ page }) => {
  await page.goto('/?map=jp');
  await expect(page.getByTestId('scene')).toHaveAttribute('data-ready', '1', { timeout: 10_000 });
  await expect(page.getByTestId('scene')).toHaveAttribute('data-region-count', '46');
  await expect(page.locator('.stage')).toHaveAttribute('data-map', 'jp');
});

test('당겨서 쏘면 결과 시트가 뜨고, 다시 쏘기로 돌아온다', async ({ page }) => {
  await pull(page, -10, 95); // 중간 세기, 살짝 오른쪽 위
  const sheet = page.locator('.sheet');
  await expect(sheet).toHaveClass(/show/, { timeout: 5_000 });
  await expect(page.locator('.stage')).toHaveAttribute('data-phase', 'RESULT');
  // 육지든 헛발이든 헤더는 있어야 한다
  await expect(sheet.locator('.place')).not.toBeEmpty();
  await expect(sheet).toContainText(/바람에/);
  await page.getByTestId('again').click();
  await expect(sheet).not.toHaveClass(/show/);
  await expect(page.getByTestId('hint')).toContainText('아래로 당겼다 놓으면');
});

test('데드존 미만 당김은 취소된다', async ({ page }) => {
  await pull(page, 3, 6);
  await expect(page.getByTestId('hint')).toContainText('취소했어요');
  await expect(page.locator('.sheet')).not.toHaveClass(/show/);
});

test('공유 URL로 열면 그 자리에 꽂힌 결과가 바로 뜬다 (강릉)', async ({ page }) => {
  await page.goto('/?lat=37.7519&lng=128.8761');
  const sheet = page.locator('.sheet');
  await expect(sheet).toHaveClass(/show/, { timeout: 5_000 });
  await expect(page.getByTestId('place')).toHaveText('강릉시');
  await expect(page.getByTestId('prov')).toHaveText('강원특별자치도');
  // 하이라이트된 시군구 코드가 스테이지에 노출된다 (.sgg.hit 대체)
  await expect(page.locator('.stage')).toHaveAttribute('data-hit', /^\d{5}$/);
});
