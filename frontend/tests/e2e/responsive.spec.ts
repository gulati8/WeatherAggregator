import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'trip', path: '/trip' },
  { name: 'map', path: '/map' },
];

for (const page of PAGES) {
  test(`${page.name} - no horizontal overflow`, async ({ page: p }) => {
    await p.goto(page.path, { waitUntil: 'networkidle' });
    const scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await p.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });

  test(`${page.name} - screenshot`, async ({ page: p }) => {
    await p.goto(page.path, { waitUntil: 'networkidle' });
    await expect(p).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.1,
    });
  });
}

test('touch targets are at least 44px', async ({ page: p }) => {
  await p.goto('/login', { waitUntil: 'networkidle' });
  const inputs = await p.locator('input, button[type="submit"]').all();
  for (const input of inputs) {
    const box = await input.boundingBox();
    if (box) {
      expect(box.height, `Touch target height for ${await input.getAttribute('type') || 'button'}`).toBeGreaterThanOrEqual(44);
    }
  }
});

test('nav links are tappable on mobile', async ({ page: p }) => {
  await p.goto('/', { waitUntil: 'networkidle' });
  const navLinks = await p.locator('nav a').all();
  for (const link of navLinks) {
    const box = await link.boundingBox();
    if (box) {
      expect(box.height, `Nav link height`).toBeGreaterThanOrEqual(40);
    }
  }
});
